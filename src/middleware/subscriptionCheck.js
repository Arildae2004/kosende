const db = require('../config/database');

/**
 * Middleware: Check subscription status
 * Memeriksa apakah user masih dalam masa trial aktif atau subscription aktif.
 * Jika masa trial/subscription sudah habis, otomatis:
 *  - Ubah subscription_status menjadi 'expired'
 *  - Ubah semua listing milik user menjadi inactive
 */
const checkSubscription = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated',
            });
        }

        // Get subscription data
        const subscriptionResult = await db.query(
            `SELECT id, status, trial_end_date, subscription_end_date
             FROM subscriptions
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (subscriptionResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No subscription found for this user',
            });
        }

        const subscription = subscriptionResult.rows[0];
        const now = new Date();
        const trialEnd = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
        const subscriptionEnd = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;

        // Check if subscription needs to be expired
        let needsExpiration = false;

        if (subscription.status === 'trial' && trialEnd && now > trialEnd) {
            needsExpiration = true;
        } else if (subscription.status === 'active' && subscriptionEnd && now > subscriptionEnd) {
            needsExpiration = true;
        }

        // If expired, update subscription and deactivate listings
        if (needsExpiration) {
            const client = await db.pool.connect();
            try {
                await client.query('BEGIN');

                // Update subscription status to expired
                await client.query(
                    `UPDATE subscriptions
                     SET status = 'expired', updated_at = NOW()
                     WHERE id = $1`,
                    [subscription.id]
                );

                // Deactivate all listings belonging to this user
                await client.query(
                    `UPDATE listings
                     SET is_active = false, status = 'inactive', updated_at = NOW()
                     WHERE owner_id = $1`,
                    [userId]
                );

                // Log the expiration
                await client.query(
                    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                     VALUES ($1, 'subscription_expired', 'subscription', $2, $3)`,
                    [userId, subscription.id, JSON.stringify({ previous_status: subscription.status })]
                );

                await client.query('COMMIT');

                return res.status(403).json({
                    success: false,
                    message: 'Your subscription has expired. Please renew to continue.',
                    code: 'SUBSCRIPTION_EXPIRED',
                    data: {
                        subscriptionId: subscription.id,
                        status: 'expired',
                        expiredAt: now.toISOString(),
                    },
                });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        }

        // Calculate days remaining
        let daysRemaining = 0;
        let relevantEndDate = null;

        if (subscription.status === 'trial' && trialEnd) {
            daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
            relevantEndDate = trialEnd;
        } else if (subscription.status === 'active' && subscriptionEnd) {
            daysRemaining = Math.max(0, Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24)));
            relevantEndDate = subscriptionEnd;
        }

        // Attach subscription info to request
        req.subscription = {
            id: subscription.id,
            status: subscription.status,
            daysRemaining,
            endDate: relevantEndDate,
        };

        next();
    } catch (error) {
        console.error('Error checking subscription:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while checking subscription',
        });
    }
};

/**
 * Middleware: Check if user has active subscription (trial or paid)
 * Versi ringan tanpa auto-expire, hanya untuk pengecekan status
 */
const requireActiveSubscription = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not authenticated',
            });
        }

        const result = await db.query(
            `SELECT id, status, trial_end_date, subscription_end_date
             FROM subscriptions
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'No subscription found',
            });
        }

        const subscription = result.rows[0];
        const now = new Date();
        const trialEnd = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
        const subscriptionEnd = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;

        const isActive =
            (subscription.status === 'trial' && trialEnd && now <= trialEnd) ||
            (subscription.status === 'active' && subscriptionEnd && now <= subscriptionEnd);

        if (!isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your subscription has expired. Please renew.',
                code: 'SUBSCRIPTION_EXPIRED',
            });
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Error checking active subscription:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

module.exports = {
    checkSubscription,
    requireActiveSubscription,
};
