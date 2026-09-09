const db = require('../config/database');

class UserService {
    /**
     * Get all users with their subscription info
     */
    async getAllUsers() {
        const result = await db.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.created_at,
                s.id AS subscription_id,
                s.status AS subscription_status,
                s.trial_end_date,
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
             LEFT JOIN subscriptions s ON u.id = s.user_id
             ORDER BY u.created_at DESC`
        );
        return result.rows;
    }

    /**
     * Get user by ID with details
     */
    async getUserById(id) {
        const result = await db.query(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.created_at,
                s.id AS subscription_id,
                s.status AS subscription_status,
                s.trial_end_date,
                s.subscription_end_date,
                (SELECT COUNT(*) FROM listings WHERE owner_id = u.id) AS total_listings
             FROM users u
             LEFT JOIN subscriptions s ON u.id = s.user_id
             WHERE u.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Admin delete user and all associated data
     */
    async adminDeleteUser(userId, adminId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Check if user exists
            const user = await client.query(
                `SELECT * FROM users WHERE id = $1`,
                [userId]
            );
            if (user.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'User tidak ditemukan' };
            }

            const userData = user.rows[0];

            // Prevent deleting admin accounts
            if (userData.role === 'admin') {
                await client.query('ROLLBACK');
                return { success: false, message: 'Tidak dapat menghapus akun admin' };
            }

            // Delete user's listings
            await client.query(`DELETE FROM listings WHERE owner_id = $1`, [userId]);

            // Delete user's payments
            await client.query(`DELETE FROM payments WHERE user_id = $1`, [userId]);

            // Delete user's subscriptions
            await client.query(`DELETE FROM subscriptions WHERE user_id = $1`, [userId]);

            // Delete user's activity logs
            await client.query(`DELETE FROM activity_logs WHERE user_id = $1`, [userId]);

            // Delete the user
            await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

            // Log admin activity
            await client.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES ($1, 'user_deleted_by_admin', 'user', $2, $3)`,
                [adminId, userId, JSON.stringify({
                    name: userData.name,
                    email: userData.email,
                    role: userData.role,
                })]
            );

            await client.query('COMMIT');
            return {
                success: true,
                message: `Owner "${userData.name}" berhasil dihapus beserta semua datanya`,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new UserService();
