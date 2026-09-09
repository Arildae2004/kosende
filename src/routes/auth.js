const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../middleware/validateInput');

// Public routes with rate limiting and validation
router.post('/register', authRateLimiter, validateRegistration, authController.register);
router.post('/login', authRateLimiter, validateLogin, authController.login);

// Google OAuth routes
router.get('/google', googleAuthController.googleAuth);
router.get('/callback/google', googleAuthController.googleCallback);
router.post('/google/login', googleAuthController.googleLogin);

// Protected routes
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
