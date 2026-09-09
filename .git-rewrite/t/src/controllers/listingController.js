const listingService = require('../services/listingService');
const subscriptionService = require('../services/subscriptionService');

class ListingController {
    /**
     * Upload images
     * POST /api/listings/upload
     */
    async uploadImages(req, res) {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Pilih minimal 1 gambar',
                });
            }

            // Generate URLs for uploaded files
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const imageUrls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);

            return res.json({
                success: true,
                message: `${req.files.length} gambar berhasil diupload`,
                data: {
                    images: imageUrls,
                    filenames: req.files.map(file => file.filename),
                },
            });
        } catch (error) {
            console.error('Upload error:', error);
            return res.status(500).json({
                success: false,
                message: 'Gagal mengupload gambar',
            });
        }
    }

    /**
     * Create new listing (owner)
     * POST /api/listings
     */
    async createListing(req, res) {
        try {
            const ownerId = req.user.id;
            const subscription = req.subscription;

            // Check if subscription is active
            if (!subscription || subscription.status === 'expired') {
                return res.status(403).json({
                    success: false,
                    message: 'Langganan Anda telah expired. Silakan perpanjang untuk membuat listing.',
                    code: 'SUBSCRIPTION_EXPIRED',
                });
            }

            // Validate required fields
            const { title, address, price_monthly, location_id } = req.body;
            if (!title || !address || !price_monthly || !location_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Judul, alamat, harga, dan lokasi wajib diisi.',
                });
            }

            // Validate price
            const price = parseFloat(price_monthly);
            if (isNaN(price) || price <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Harga tidak valid. Masukkan angka yang benar.',
                });
            }

            if (price > 9999999999999) {
                return res.status(400).json({
                    success: false,
                    message: 'Harga terlalu besar. Maksimal 9.999.999.999.999.',
                });
            }

            const listing = await listingService.createListing(ownerId, req.body);

            return res.status(201).json({
                success: true,
                message: 'Listing berhasil didaftarkan. Menunggu approval admin.',
                data: listing,
            });
        } catch (error) {
            console.error('Create listing error:', error);

            // Handle specific database errors
            if (error.code === '22003') {
                return res.status(400).json({
                    success: false,
                    message: 'Nilai angka terlalu besar. Periksa harga yang dimasukkan.',
                });
            }

            if (error.code === '23502') {
                return res.status(400).json({
                    success: false,
                    message: 'Data wajib diisi lengkap.',
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Terjadi kesalahan server. Silakan coba lagi.',
            });
        }
    }

    /**
     * Get owner's listings
     * GET /api/listings/my-listings
     */
    async getMyListings(req, res) {
        try {
            const ownerId = req.user.id;
            const listings = await listingService.getListingsByOwner(ownerId);

            return res.json({
                success: true,
                data: listings,
            });
        } catch (error) {
            console.error('Get my listings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Get listing by ID
     * GET /api/listings/:id
     */
    async getListingById(req, res) {
        try {
            const listing = await listingService.getListingById(req.params.id);

            if (!listing) {
                return res.status(404).json({
                    success: false,
                    message: 'Listing not found',
                });
            }

            return res.json({
                success: true,
                data: listing,
            });
        } catch (error) {
            console.error('Get listing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Update listing
     * PUT /api/listings/:id
     */
    async updateListing(req, res) {
        try {
            const result = await listingService.updateListing(
                req.params.id,
                req.user.id,
                req.body
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.json({
                success: true,
                message: 'Listing updated successfully',
                data: result.data,
            });
        } catch (error) {
            console.error('Update listing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Delete listing
     * DELETE /api/listings/:id
     */
    async deleteListing(req, res) {
        try {
            const result = await listingService.deleteListing(req.params.id, req.user.id);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.json({
                success: true,
                message: 'Listing deleted successfully',
            });
        } catch (error) {
            console.error('Delete listing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Get active listings (public)
     * GET /api/listings
     */
    async getActiveListings(req, res) {
        try {
            const filters = {
                district: req.query.district,
                min_price: req.query.min_price,
                max_price: req.query.max_price,
            };

            const listings = await listingService.getActiveListings(filters);

            return res.json({
                success: true,
                data: listings,
            });
        } catch (error) {
            console.error('Get active listings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Get all pending listings (admin)
     * GET /api/listings/admin/pending
     */
    async getPendingListings(req, res) {
        try {
            const listings = await listingService.getPendingListings();

            return res.json({
                success: true,
                data: listings,
            });
        } catch (error) {
            console.error('Get pending listings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Get all listings (admin)
     * GET /api/listings/admin/all
     */
    async getAllListings(req, res) {
        try {
            const filters = {
                status: req.query.status,
                is_active: req.query.is_active,
                district: req.query.district,
            };

            const listings = await listingService.getAllListings(filters);

            return res.json({
                success: true,
                data: listings,
            });
        } catch (error) {
            console.error('Get all listings error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Approve listing (admin)
     * PATCH /api/listings/admin/:id/approve
     */
    async approveListing(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.id;

            const result = await listingService.approveListing(id, adminId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.json({
                success: true,
                message: result.message,
                data: result.data,
            });
        } catch (error) {
            console.error('Approve listing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Reject listing (admin)
     * PATCH /api/listings/admin/:id/reject
     */
    async rejectListing(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.id;
            const { reason } = req.body;

            const result = await listingService.rejectListing(id, adminId, reason);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.json({
                success: true,
                message: result.message,
                data: result.data,
            });
        } catch (error) {
            console.error('Reject listing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Delete listing by admin (any listing)
     * DELETE /api/listings/admin/:id
     */
    async adminDeleteListing(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.id;

            const result = await listingService.adminDeleteListing(id, adminId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.json({
                success: true,
                message: result.message,
            });
        } catch (error) {
            console.error('Admin delete listing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }
}

module.exports = new ListingController();
