const express = require('express');
const router = express.Router();
const { getValidLocations } = require('../middleware/validateLocation');

// Public routes
router.get('/', getValidLocations);

module.exports = router;
