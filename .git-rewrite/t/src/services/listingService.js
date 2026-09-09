const db = require('../config/database');

class ListingService {
    /**
     * Create a new listing
     */
    async createListing(ownerId, listingData) {
        const {
            location_id,
            title,
            description,
            address,
            price_monthly,
            deposit,
            room_size,
            facilities,
            images,
        } = listingData;

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(
                `INSERT INTO listings (
                    owner_id, location_id, title, description, address,
                    price_monthly, deposit, room_size, facilities, images, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
                RETURNING *`,
                [
                    ownerId,
                    location_id || null,
                    title,
                    description || null,
                    address,
                    price_monthly,
                    deposit || 0,
                    room_size || null,
                    JSON.stringify(facilities || []),
                    JSON.stringify(images || []),
                ]
            );

            // Log activity
            await client.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES ($1, 'listing_created', 'listing', $2, $3)`,
                [ownerId, result.rows[0].id, JSON.stringify({ title })]
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
     * Get listings by owner ID
     */
    async getListingsByOwner(ownerId) {
        const result = await db.query(
            `SELECT l.*, loc.village, loc.district, loc.city, loc.province
             FROM listings l
             LEFT JOIN locations loc ON l.location_id = loc.id
             WHERE l.owner_id = $1
             ORDER BY l.created_at DESC`,
            [ownerId]
        );
        return result.rows;
    }

    /**
     * Get listing by ID
     */
    async getListingById(listingId) {
        const result = await db.query(
            `SELECT l.*, loc.village, loc.district, loc.city, loc.province,
                    u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
             FROM listings l
             LEFT JOIN locations loc ON l.location_id = loc.id
             JOIN users u ON l.owner_id = u.id
             WHERE l.id = $1`,
            [listingId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get all pending listings (for admin)
     */
    async getPendingListings() {
        const result = await db.query(
            `SELECT l.*, loc.village, loc.district, loc.city, loc.province,
                    u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
             FROM listings l
             LEFT JOIN locations loc ON l.location_id = loc.id
             JOIN users u ON l.owner_id = u.id
             WHERE l.status = 'pending'
             ORDER BY l.created_at ASC`
        );
        return result.rows;
    }

    /**
     * Get all listings (for admin)
     */
    async getAllListings(filters = {}) {
        let query = `
            SELECT l.*, loc.village, loc.district, loc.city, loc.province,
                   u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
            FROM listings l
            LEFT JOIN locations loc ON l.location_id = loc.id
            JOIN users u ON l.owner_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.status) {
            query += ` AND l.status = $${paramIndex++}`;
            params.push(filters.status);
        }

        if (filters.is_active !== undefined) {
            query += ` AND l.is_active = $${paramIndex++}`;
            params.push(filters.is_active);
        }

        if (filters.district) {
            query += ` AND loc.district = $${paramIndex++}`;
            params.push(filters.district);
        }

        query += ` ORDER BY l.created_at DESC`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Approve listing (admin action)
     */
    async approveListing(listingId, adminId) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Check if listing exists and is pending
            const listing = await client.query(
                `SELECT * FROM listings WHERE id = $1 AND status = 'pending'`,
                [listingId]
            );

            if (listing.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Listing not found or not in pending status' };
            }

            const listingData = listing.rows[0];

            // Check if owner has active subscription
            const subscription = await client.query(
                `SELECT * FROM subscriptions
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [listingData.owner_id]
            );

            const sub = subscription.rows[0];
            const now = new Date();
            let canActivate = false;

            if (sub) {
                const trialEnd = sub.trial_end_date ? new Date(sub.trial_end_date) : null;
                const subEnd = sub.subscription_end_date ? new Date(sub.subscription_end_date) : null;

                if ((sub.status === 'trial' && trialEnd && now <= trialEnd) ||
                    (sub.status === 'active' && subEnd && now <= subEnd)) {
                    canActivate = true;
                }
            }

            // Update listing
            const result = await client.query(
                `UPDATE listings
                 SET status = 'approved',
                     is_active = $1,
                     approved_by = $2,
                     approved_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $3
                 RETURNING *`,
                [canActivate, adminId, listingId]
            );

            // Log activity
            await client.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES ($1, 'listing_approved', 'listing', $2, $3)`,
                [adminId, listingId, JSON.stringify({ canActivate, ownerId: listingData.owner_id })]
            );

            await client.query('COMMIT');
            return {
                success: true,
                data: result.rows[0],
                message: canActivate
                    ? 'Listing approved and activated'
                    : 'Listing approved but not active (subscription expired)',
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Reject listing (admin action)
     */
    async rejectListing(listingId, adminId, reason) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(
                `UPDATE listings
                 SET status = 'rejected',
                     is_active = false,
                     approved_by = $1,
                     approved_at = NOW(),
                     rejection_reason = $2,
                     updated_at = NOW()
                 WHERE id = $3 AND status = 'pending'
                 RETURNING *`,
                [adminId, reason || null, listingId]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Listing not found or not in pending status' };
            }

            // Log activity
            await client.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES ($1, 'listing_rejected', 'listing', $2, $3)`,
                [adminId, listingId, JSON.stringify({ reason })]
            );

            await client.query('COMMIT');
            return { success: true, data: result.rows[0], message: 'Listing rejected' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update listing
     */
    async updateListing(listingId, ownerId, updateData) {
        const allowedFields = [
            'location_id', 'title', 'description', 'address',
            'price_monthly', 'deposit', 'room_size', 'facilities', 'images',
        ];

        const updates = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = $${paramIndex++}`);
                params.push(Array.isArray(value) ? JSON.stringify(value) : value);
            }
        }

        if (updates.length === 0) {
            return { success: false, message: 'No valid fields to update' };
        }

        updates.push(`updated_at = NOW()`);
        params.push(listingId, ownerId);

        const result = await db.query(
            `UPDATE listings SET ${updates.join(', ')}
             WHERE id = $${paramIndex++} AND owner_id = $${paramIndex}
             RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return { success: false, message: 'Listing not found or unauthorized' };
        }

        return { success: true, data: result.rows[0] };
    }

    /**
     * Delete listing by owner
     */
    async deleteListing(listingId, ownerId) {
        const result = await db.query(
            `DELETE FROM listings WHERE id = $1 AND owner_id = $2 RETURNING id`,
            [listingId, ownerId]
        );

        if (result.rows.length === 0) {
            return { success: false, message: 'Listing not found or unauthorized' };
        }

        return { success: true, message: 'Listing deleted' };
    }

    /**
     * Delete listing by admin (any listing)
     */
    async adminDeleteListing(listingId, adminId) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Get listing info before deletion
            const listing = await client.query(
                `SELECT l.*, u.name AS owner_name FROM listings l
                 JOIN users u ON l.owner_id = u.id
                 WHERE l.id = $1`,
                [listingId]
            );

            if (listing.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Listing tidak ditemukan' };
            }

            // Delete the listing
            await client.query(
                `DELETE FROM listings WHERE id = $1`,
                [listingId]
            );

            // Log activity
            await client.query(
                `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
                 VALUES ($1, 'listing_deleted_by_admin', 'listing', $2, $3)`,
                [adminId, listingId, JSON.stringify({
                    title: listing.rows[0].title,
                    owner_name: listing.rows[0].owner_name,
                })]
            );

            await client.query('COMMIT');
            return { success: true, message: 'Listing berhasil dihapus oleh admin' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get active listings (public)
     */
    async getActiveListings(filters = {}) {
        let query = `
            SELECT l.id, l.title, l.description, l.address, l.price_monthly,
                   l.room_size, l.facilities, l.images, l.created_at,
                   u.name AS owner_name, u.phone AS owner_phone,
                   loc.village, loc.district, loc.city, loc.province
            FROM listings l
            JOIN users u ON l.owner_id = u.id
            LEFT JOIN locations loc ON l.location_id = loc.id
            WHERE l.is_active = true AND l.status = 'approved'
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.district) {
            query += ` AND loc.district = $${paramIndex++}`;
            params.push(filters.district);
        }

        if (filters.min_price) {
            query += ` AND l.price_monthly >= $${paramIndex++}`;
            params.push(filters.min_price);
        }

        if (filters.max_price) {
            query += ` AND l.price_monthly <= $${paramIndex++}`;
            params.push(filters.max_price);
        }

        query += ` ORDER BY l.created_at DESC`;

        const result = await db.query(query, params);
        return result.rows;
    }
}

module.exports = new ListingService();
