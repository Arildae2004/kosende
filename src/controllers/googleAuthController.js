const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { getGoogleAuthUrl, getGoogleTokens, getGoogleUserInfo } = require('../config/google');

class GoogleAuthController {
    /**
     * Redirect to Google OAuth page
     * GET /api/auth/google
     */
    googleAuth(req, res) {
        const url = getGoogleAuthUrl();
        res.redirect(url);
    }

    /**
     * Handle Google OAuth callback
     * GET /api/auth/callback/google
     */
    async googleCallback(req, res) {
        try {
            const { code, error } = req.query;

            if (error) {
                return res.redirect('/?error=google_auth_denied');
            }

            if (!code) {
                return res.redirect('/?error=google_auth_failed');
            }

            // Get tokens from Google
            const tokens = await getGoogleTokens(code);

            // Get user info from Google
            const googleUser = await getGoogleUserInfo(tokens);

            const { sub: googleId, email, name, picture } = googleUser;

            // Check if user exists by email
            let userResult = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            let user;

            if (userResult.rows.length > 0) {
                // User exists - update google_id if not set
                user = userResult.rows[0];
                if (!user.google_id) {
                    await db.query(
                        'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2',
                        [googleId, user.id]
                    );
                }
            } else {
                // Create new user
                const newUserResult = await db.query(
                    `INSERT INTO users (name, email, google_id, role, password_hash)
                     VALUES ($1, $2, $3, 'viewer', 'GOOGLE_AUTH')
                     RETURNING *`,
                    [name, email, googleId]
                );
                user = newUserResult.rows[0];
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
                process.env.JWT_SECRET || 'webkoskosan-secret-key-2024',
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Redirect to frontend with token
            res.redirect(`/?token=${token}&login=success`);
        } catch (error) {
            console.error('Google auth callback error:', error);
            res.redirect('/?error=google_auth_error');
        }
    }

    /**
     * Google login for API (for frontend handling)
     * POST /api/auth/google/login
     */
    async googleLogin(req, res) {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Authorization code is required',
                });
            }

            // Get tokens from Google
            const tokens = await getGoogleTokens(code);

            // Get user info from Google
            const googleUser = await getGoogleUserInfo(tokens);

            const { sub: googleId, email, name, picture } = googleUser;

            // Check if user exists by email
            let userResult = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            let user;

            if (userResult.rows.length > 0) {
                // User exists - update google_id if not set
                user = userResult.rows[0];
                if (!user.google_id) {
                    await db.query(
                        'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2',
                        [googleId, user.id]
                    );
                }
            } else {
                // Create new user
                const newUserResult = await db.query(
                    `INSERT INTO users (name, email, google_id, role, password_hash)
                     VALUES ($1, $2, $3, 'viewer', 'GOOGLE_AUTH')
                     RETURNING *`,
                    [name, email, googleId]
                );
                user = newUserResult.rows[0];
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
                process.env.JWT_SECRET || 'webkoskosan-secret-key-2024',
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            return res.json({
                success: true,
                message: 'Login berhasil',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    },
                    token,
                },
            });
        } catch (error) {
            console.error('Google login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Google login failed',
            });
        }
    }
}

module.exports = new GoogleAuthController();
