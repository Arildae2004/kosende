const db = require('../config/database');
const subscriptionService = require('../services/subscriptionService');

class SubscriptionController {
    /**
     * Get current user's subscription
     * GET /api/subscriptions/my-subscription
     */
    async getMySubscription(req, res) {
        try {
            const userId = req.user.id;
            const subscription = await subscriptionService.getSubscriptionByUserId(userId);

            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'No subscription found',
                });
            }

            return res.json({
                success: true,
                data: subscription,
            });
        } catch (error) {
            console.error('Get subscription error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Submit payment for subscription
     * POST /api/subscriptions/payment
     */
    async submitPayment(req, res) {
        try {
            const userId = req.user.id;
            const { amount, payment_method, proof_url, notes } = req.body;

            if (!amount || !payment_method) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount and payment method are required',
                });
            }

            // Get current subscription
            const subscription = await subscriptionService.getSubscriptionByUserId(userId);
            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: 'No subscription found',
                });
            }

            // Create payment record
            const result = await db.query(
                `INSERT INTO payments (user_id, subscription_id, amount, payment_method, proof_url, status, notes)
                 VALUES ($1, $2, $3, $4, $5, 'pending', $6)
                 RETURNING *`,
                [userId, subscription.id, amount, payment_method, proof_url || null, notes || null]
            );

            // Log activity
            await db.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES ($1, 'payment_submitted', 'payment', $2, $3)`,
                [userId, result.rows[0].id, JSON.stringify({ amount, payment_method })]
            );

            return res.status(201).json({
                success: true,
                message: 'Payment submitted. Waiting for admin verification.',
                data: result.rows[0],
            });
        } catch (error) {
            console.error('Submit payment error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Get payment history
     * GET /api/subscriptions/payments
     */
    async getPaymentHistory(req, res) {
        try {
            const userId = req.user.id;

            const result = await db.query(
                `SELECT * FROM payments
                 WHERE user_id = $1
                 ORDER BY created_at DESC`,
                [userId]
            );

            return res.json({
                success: true,
                data: result.rows,
            });
        } catch (error) {
            console.error('Get payment history error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Get all pending payments (admin)
     * GET /api/subscriptions/admin/pending-payments
     */
    async getPendingPayments(req, res) {
        try {
            const result = await db.query(
                `SELECT p.*,
                        u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
                        s.status AS subscription_status
                 FROM payments p
                 JOIN users u ON p.user_id = u.id
                 JOIN subscriptions s ON p.subscription_id = s.id
                 WHERE p.status = 'pending'
                 ORDER BY p.created_at ASC`
            );

            return res.json({
                success: true,
                data: result.rows,
            });
        } catch (error) {
            console.error('Get pending payments error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Verify payment (admin)
     * PATCH /api/subscriptions/admin/payments/:id/verify
     */
    async verifyPayment(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.id;
            const { status, notes, duration_months } = req.body;

            if (!['verified', 'rejected'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Status must be "verified" or "rejected"',
                });
            }

            const client = await db.pool.connect();

            try {
                await client.query('BEGIN');

                // Update payment status
                const paymentResult = await client.query(
                    `UPDATE payments
                     SET status = $1,
                         verified_by = $2,
                         verified_at = NOW(),
                         notes = COALESCE($3, notes),
                         updated_at = NOW()
                     WHERE id = $4 AND status = 'pending'
                     RETURNING *`,
                    [status, adminId, notes, id]
                );

                if (paymentResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({
                        success: false,
                        message: 'Payment not found or already processed',
                    });
                }

                const payment = paymentResult.rows[0];

                // If verified, activate subscription
                if (status === 'verified') {
                    const duration = duration_months || 1;
                    const startDate = new Date();
                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + duration);

                    await client.query(
                        `UPDATE subscriptions
                         SET status = 'active',
                             subscription_start_date = $1,
                             subscription_end_date = $2,
                             updated_at = NOW()
                         WHERE id = $3`,
                        [startDate, endDate, payment.subscription_id]
                    );

                    // Reactivate listings (including those deactivated by expiration)
                    await client.query(
                        `UPDATE listings
                         SET is_active = true, status = 'approved', updated_at = NOW()
                         WHERE owner_id = $1 AND status IN ('approved', 'inactive')`,
                        [payment.user_id]
                    );
                }

                // Log activity
                await client.query(
                    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                     VALUES ($1, 'payment_' || $2, 'payment', $3, $4)`,
                    [adminId, status, id, JSON.stringify({ paymentId: id, status })]
                );

                await client.query('COMMIT');

                return res.json({
                    success: true,
                    message: `Payment ${status} successfully`,
                    data: payment,
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Verify payment error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Get subscription overview (admin)
     * GET /api/subscriptions/admin/overview
     */
    async getSubscriptionOverview(req, res) {
        try {
            const overview = await subscriptionService.getSubscriptionOverview();

            return res.json({
                success: true,
                data: overview,
            });
        } catch (error) {
            console.error('Get subscription overview error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Run subscription expiration check (admin/cron)
     * POST /api/subscriptions/admin/check-expirations
     */
    async checkExpirations(req, res) {
        try {
            const expiredSubscriptions = await subscriptionService.expireSubscriptions();

            return res.json({
                success: true,
                message: `${expiredSubscriptions.length} subscription(s) expired`,
                data: expiredSubscriptions,
            });
        } catch (error) {
            console.error('Check expirations error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }
}

module.exports = new SubscriptionController();
