const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected routes - Owner
router.get(
    '/my-subscription',
    authenticate,
    authorize('owner'),
    subscriptionController.getMySubscription
);

router.post(
    '/payment',
    authenticate,
    authorize('owner'),
    subscriptionController.submitPayment
);

router.get(
    '/payments',
    authenticate,
    authorize('owner'),
    subscriptionController.getPaymentHistory
);

// Payment gateway otomatis (Midtrans bila dikonfigurasi, fallback manual)
router.post(
    '/gateway-charge',
    authenticate,
    authorize('owner'),
    subscriptionController.createGatewayCharge
);

// Webhook publik dari Midtrans (tanpa auth JWT, validasi signature di gateway)
router.post('/gateway-webhook', subscriptionController.gatewayWebhook);

// Admin routes
router.get(
    '/admin/pending-payments',
    authenticate,
    authorize('admin'),
    subscriptionController.getPendingPayments
);

router.patch(
    '/admin/payments/:id/verify',
    authenticate,
    authorize('admin'),
    subscriptionController.verifyPayment
);

router.get(
    '/admin/overview',
    authenticate,
    authorize('admin'),
    subscriptionController.getSubscriptionOverview
);

router.post(
    '/admin/check-expirations',
    authenticate,
    authorize('admin'),
    subscriptionController.checkExpirations
);

module.exports = router;
