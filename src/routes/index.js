const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const listingRoutes = require('./listings');
const subscriptionRoutes = require('./subscriptions');
const locationRoutes = require('./locations');

router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/locations', locationRoutes);

module.exports = router;
