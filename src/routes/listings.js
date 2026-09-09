const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/subscriptionCheck');
const { validateLocation } = require('../middleware/validateLocation');
const { upload, handleMulterError } = require('../config/multer');
const { uploadRateLimiter } = require('../middleware/rateLimiter');

// Public routes - Get active listings
router.get('/', listingController.getActiveListings);

// Upload images endpoint with rate limiting
router.post(
    '/upload',
    authenticate,
    authorize('owner'),
    uploadRateLimiter,
    upload.array('images', 5),
    handleMulterError,
    listingController.uploadImages
);

// Protected routes - Owner
router.post(
    '/',
    authenticate,
    authorize('owner'),
    checkSubscription,
    validateLocation,
    listingController.createListing
);

router.get(
    '/my-listings',
    authenticate,
    authorize('owner'),
    listingController.getMyListings
);

router.get('/:id', listingController.getListingById);

router.put(
    '/:id',
    authenticate,
    authorize('owner'),
    listingController.updateListing
);

router.delete(
    '/:id',
    authenticate,
    authorize('owner'),
    listingController.deleteListing
);

// Admin routes
router.get(
    '/admin/pending',
    authenticate,
    authorize('admin'),
    listingController.getPendingListings
);

router.get(
    '/admin/all',
    authenticate,
    authorize('admin'),
    listingController.getAllListings
);

router.patch(
    '/admin/:id/approve',
    authenticate,
    authorize('admin'),
    listingController.approveListing
);

router.patch(
    '/admin/:id/reject',
    authenticate,
    authorize('admin'),
    listingController.rejectListing
);

// Admin delete any listing
router.delete(
    '/admin/:id',
    authenticate,
    authorize('admin'),
    listingController.adminDeleteListing
);

module.exports = router;
