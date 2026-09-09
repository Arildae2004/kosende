const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const { getGoogleAuthUrl } = require('../config/google');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../middleware/validateInput');

// Public routes with rate limiting and validation
router.post('/register', authRateLimiter, validateRegistration, authController.register);
router.post('/login', authRateLimiter, validateLogin, authController.login);

// Google OAuth routes
router.get('/google', googleAuthController.googleAuth);
router.get('/google/callback', googleAuthController.googleCallback);
router.post('/google/login', googleAuthController.googleLogin);

// Google OAuth debug route (remove in production)
router.get('/google/debug', (req, res) => {
    const { getConfig } = require('../config/google');
    const config = getConfig();
    const authUrl = getGoogleAuthUrl();
    res.json({
        success: true,
        config: {
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            clientSecretExists: config.clientSecretExists,
            authUrl: authUrl
        },
        message: 'Use this URL to test Google OAuth directly. If Google shows an error, the issue is with Google Cloud Console configuration.',
        troubleshooting: [
            '1. Go to https://console.cloud.google.com/',
            '2. Select project vast-math-508112-r6',
            '3. Go to APIs & Services > OAuth consent screen',
            '4. Make sure User Type is "External"',
            '5. Add your email as a test user if in Testing mode',
            '6. Go to APIs & Services > Credentials',
            '7. Click on your OAuth Client ID',
            '8. In Authorized redirect URIs, make sure you have EXACTLY:',
            '   https://kosende-production.up.railway.app/api/auth/google/callback',
            '9. Save changes'
        ]
    });
});

// Protected routes
router.get('/me', authenticate, authController.getProfile);

module.exports = router;
