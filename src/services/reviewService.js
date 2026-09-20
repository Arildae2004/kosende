const db = require('../config/database');

class ReviewService {
    async getReviewsByListing(listingId) {
        const result = await db.query(
            `SELECT r.id, r.reviewer_name, r.rating, r.comment, r.created_at
             FROM reviews r
             WHERE r.listing_id = $1
             ORDER BY r.created_at DESC
             LIMIT 50`,
            [listingId]
        );
        return result.rows;
    }

    async createReview(listingId, userId, { reviewer_name, rating, comment }) {
        const score = parseInt(rating, 10);
        if (!score || score < 1 || score > 5) {
            return { success: false, message: 'Rating harus antara 1 sampai 5.' };
        }
        if (!reviewer_name || !reviewer_name.trim()) {
            return { success: false, message: 'Nama pengulas wajib diisi.' };
        }

        const listing = await db.query(`SELECT id FROM listings WHERE id = $1`, [listingId]);
        if (listing.rows.length === 0) {
            return { success: false, message: 'Listing tidak ditemukan.' };
        }

        const result = await db.query(
            `INSERT INTO reviews (listing_id, user_id, reviewer_name, rating, comment)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, reviewer_name, rating, comment, created_at`,
            [listingId, userId || null, reviewer_name.trim().slice(0, 100), score, (comment || '').trim().slice(0, 1000) || null]
        );

        return { success: true, data: result.rows[0] };
    }
}

module.exports = new ReviewService();
