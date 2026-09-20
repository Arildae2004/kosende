const reviewService = require('../services/reviewService');

class ReviewController {
    /**
     * Get reviews for a listing (public)
     * GET /api/listings/:id/reviews
     */
    async getReviews(req, res) {
        try {
            const reviews = await reviewService.getReviewsByListing(req.params.id);
            return res.json({ success: true, data: reviews });
        } catch (error) {
            console.error('Get reviews error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * Submit a review (logged-in users: viewer/owner/admin)
     * POST /api/listings/:id/reviews
     */
    async createReview(req, res) {
        try {
            const result = await reviewService.createReview(
                req.params.id,
                req.user ? req.user.id : null,
                req.body
            );
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(201).json({
                success: true,
                message: 'Ulasan berhasil dikirim. Terima kasih!',
                data: result.data,
            });
        } catch (error) {
            console.error('Create review error:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}

module.exports = new ReviewController();
