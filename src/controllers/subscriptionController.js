const db = require('../config/database');
const subscriptionService = require('../services/subscriptionService');
const paymentGateway = require('../services/paymentGateway');

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
     * Buat transaksi gateway otomatis (Midtrans Snap bila dikonfigurasi)
     * POST /api/subscriptions/gateway-charge
     */
    async createGatewayCharge(req, res) {
        try {
            const userId = req.user.id;
            const subscription = await subscriptionService.getSubscriptionByUserId(userId);
            if (!subscription) {
                return res.status(404).json({ success: false, message: 'No subscription found' });
            }
            const duration = Math.max(1, parseInt(req.body.duration_months || '1', 10) || 1);
            const amount = paymentGateway.SUBSCRIPTION_PRICE * duration;
            const orderId = `KOSENDE-${userId.slice(0, 8)}-${Date.now()}`;

            const charge = await paymentGateway.createSubscriptionCharge({
                orderId,
                amount,
                customer: { name: req.user.name, email: req.user.email, phone: req.user.phone },
            });

            if (!charge.enabled) {
                return res.json({
                    success: true,
                    gateway: 'manual',
                    message: 'Gateway belum aktif. Silakan transfer manual BNI lalu konfirmasi via WhatsApp.',
                    data: { orderId, amount, gatewayEnabled: false },
                });
            }

            await db.query(
                `INSERT INTO payments (user_id, subscription_id, amount, payment_method, status, notes, gateway, gateway_order_id, gateway_payload)
                 VALUES ($1, $2, $3, 'qris_gateway', 'pending', $4, 'midtrans', $5, $6)`,
                [userId, subscription.id, amount, `Langganan ${duration} bulan via gateway`, orderId, JSON.stringify({ duration_months: duration })]
            );

            return res.json({ success: true, gateway: 'midtrans', data: charge });
        } catch (error) {
            console.error('Gateway charge error:', error);
            return res.status(500).json({ success: false, message: error.message || 'Gagal membuat transaksi gateway' });
        }
    }

    /**
     * Webhook Midtrans (notification) — aktivasi otomatis tanpa verifikasi admin
     * POST /api/subscriptions/gateway-webhook
     */
    async gatewayWebhook(req, res) {
        try {
            const { order_id, transaction_status, fraud_status, transaction_id } = req.body || {};
            if (!order_id) return res.status(400).json({ success: false, message: 'order_id wajib' });

            const payRes = await db.query(`SELECT * FROM payments WHERE gateway_order_id = $1 LIMIT 1`, [order_id]);
            if (payRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
            const payment = payRes.rows[0];

            const paid = ['capture', 'settlement'].includes(transaction_status) && fraud_status !== 'deny';
            if (!paid) {
                if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
                    await db.query(`UPDATE payments SET status='rejected', gateway_transaction_id=$2, gateway_payload=gateway_payload || $3 WHERE id=$1`,
                        [payment.id, transaction_id || null, JSON.stringify(req.body)]);
                }
                return res.json({ success: true, message: `Status ${transaction_status} dicatat` });
            }

            const client = await db.pool.connect();
            try {
                await client.query('BEGIN');
                const payload = payment.gateway_payload || {};
                const duration = parseInt(payload.duration_months || '1', 10) || 1;
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + duration);
                await client.query(
                    `UPDATE payments SET status='verified', verified_at=NOW(), gateway_transaction_id=$2, gateway_payload=$3, updated_at=NOW() WHERE id=$1`,
                    [payment.id, transaction_id || null, JSON.stringify(req.body)]
                );
                await client.query(
                    `UPDATE subscriptions SET status='active', subscription_start_date=NOW(), subscription_end_date=$2, updated_at=NOW() WHERE id=$1`,
                    [payment.subscription_id, endDate]
                );
                await client.query(
                    `UPDATE listings SET is_active=true, status='approved', updated_at=NOW() WHERE owner_id=$1 AND status IN ('approved','inactive')`,
                    [payment.user_id]
                );
                await client.query(
                    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1,'payment_verified_auto','payment',$2,$3)`,
                    [payment.user_id, payment.id, JSON.stringify({ gateway: 'midtrans', order_id })]
                );
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
            return res.json({ success: true, message: 'Langganan aktif otomatis via gateway' });
        } catch (error) {
            console.error('Gateway webhook error:', error);
            return res.status(500).json({ success: false, message: 'Webhook error' });
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
