const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const listingRoutes = require('./listings');
const subscriptionRoutes = require('./subscriptions');
const locationRoutes = require('./locations');
const userRoutes = require('./users');

router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/locations', locationRoutes);
router.use('/users', userRoutes);

module.exports = router;
