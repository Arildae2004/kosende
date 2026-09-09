const db = require('../config/database');

class SubscriptionService {
    /**
     * Get subscription by user ID
     */
    async getSubscriptionByUserId(userId) {
        const result = await db.query(
            `SELECT s.*,
                    CASE
                        WHEN s.status = 'trial' AND s.trial_end_date > NOW()
                            THEN EXTRACT(DAY FROM (s.trial_end_date - NOW()))::INTEGER
                        WHEN s.status = 'active' AND s.subscription_end_date > NOW()
                            THEN EXTRACT(DAY FROM (s.subscription_end_date - NOW()))::INTEGER
                        ELSE 0
                    END AS days_remaining
             FROM subscriptions s
             WHERE s.user_id = $1
             ORDER BY s.created_at DESC
             LIMIT 1`,
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Check if subscription is active (trial or paid)
     */
    async isSubscriptionActive(userId) {
        const subscription = await this.getSubscriptionByUserId(userId);
        if (!subscription) return false;

        const now = new Date();
        const trialEnd = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
        const subscriptionEnd = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;

        if (subscription.status === 'trial' && trialEnd && now <= trialEnd) {
            return true;
        }
        if (subscription.status === 'active' && subscriptionEnd && now <= subscriptionEnd) {
            return true;
        }
        return false;
    }

    /**
     * Expire subscriptions that have passed their end date
     * Returns list of expired subscription IDs
     */
    async expireSubscriptions() {
        const client = await db.pool.connect();
        const expiredSubscriptions = [];

        try {
            await client.query('BEGIN');

            // Find subscriptions to expire
            const toExpire = await client.query(
                `SELECT id, user_id, status
                 FROM subscriptions
                 WHERE status IN ('trial', 'active')
                   AND (
                       (status = 'trial' AND trial_end_date < NOW())
                       OR (status = 'active' AND subscription_end_date < NOW())
                   )`
            );

            for (const sub of toExpire.rows) {
                // Update subscription status
                await client.query(
                    `UPDATE subscriptions
                     SET status = 'expired', updated_at = NOW()
                     WHERE id = $1`,
                    [sub.id]
                );

                // Deactivate all listings
                await client.query(
                    `UPDATE listings
                     SET is_active = false, status = 'inactive', updated_at = NOW()
                     WHERE owner_id = $1`,
                    [sub.user_id]
                );

                // Log activity
                await client.query(
                    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                     VALUES ($1, 'subscription_expired', 'subscription', $2, $3)`,
                    [sub.user_id, sub.id, JSON.stringify({ previous_status: sub.status })]
                );

                expiredSubscriptions.push(sub);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        return expiredSubscriptions;
    }

    /**
     * Activate subscription after payment verification
     */
    async activateSubscription(userId, subscriptionId, durationMonths = 1) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + durationMonths);

            const result = await client.query(
                `UPDATE subscriptions
                 SET status = 'active',
                     subscription_start_date = $1,
                     subscription_end_date = $2,
                     updated_at = NOW()
                 WHERE id = $3 AND user_id = $4
                 RETURNING *`,
                [startDate, endDate, subscriptionId, userId]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            // Reactivate listings that were approved (including those deactivated by expiration)
            await client.query(
                `UPDATE listings
                 SET is_active = true, status = 'approved', updated_at = NOW()
                 WHERE owner_id = $1 AND status IN ('approved', 'inactive')`,
                [userId]
            );

            // Log activity
            await client.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES ($1, 'subscription_activated', 'subscription', $2, $3)`,
                [userId, subscriptionId, JSON.stringify({ durationMonths, endDate })]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get subscription overview for admin dashboard
     */
    async getSubscriptionOverview() {
        const result = await db.query(
            `SELECT
                u.id AS user_id,
                u.name,
                u.email,
                u.phone,
                s.id AS subscription_id,
                s.status AS subscription_status,
                s.trial_start_date,
                s.trial_end_date,
                s.subscription_start_date,
                s.subscription_end_date,
                CASE
                    WHEN s.status = 'trial' AND s.trial_end_date > NOW()
                        THEN EXTRACT(DAY FROM (s.trial_end_date - NOW()))::INTEGER
                    WHEN s.status = 'active' AND s.subscription_end_date > NOW()
                        THEN EXTRACT(DAY FROM (s.subscription_end_date - NOW()))::INTEGER
                    ELSE 0
                END AS days_remaining,
                (SELECT COUNT(*) FROM listings WHERE owner_id = u.id) AS total_listings,
                (SELECT COUNT(*) FROM listings WHERE owner_id = u.id AND is_active = true) AS active_listings
             FROM users u
             JOIN subscriptions s ON u.id = s.user_id
             WHERE u.role = 'owner'
             ORDER BY s.updated_at DESC`
        );
        return result.rows;
    }
}

module.exports = new SubscriptionService();
