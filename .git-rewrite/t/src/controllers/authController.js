const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');

class AuthController {
    /**
     * Register new user (owner)
     * POST /api/auth/register
     */
    async register(req, res) {
        try {
            const { name, email, password, phone } = req.body;

            // Validation
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, and password are required',
                });
            }

            // Check if email already exists
            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered',
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash(password, salt);

            // Create user (subscription will be auto-created via trigger)
            const result = await db.query(
                `INSERT INTO users (name, email, password_hash, phone, role)
                 VALUES ($1, $2, $3, $4, 'owner')
                 RETURNING id, name, email, phone, role, created_at`,
                [name, email, passwordHash, phone || null]
            );

            const user = result.rows[0];

            // Get the auto-created subscription
            const subscription = await db.query(
                `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [user.id]
            );

            // Generate token
            const token = generateToken(user);

            return res.status(201).json({
                success: true,
                message: 'Registration successful. Your 14-day trial has started!',
                data: {
                    user,
                    subscription: subscription.rows[0],
                    token,
                },
            });
        } catch (error) {
            console.error('Registration error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Login
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required',
                });
            }

            // Find user
            const result = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password',
                });
            }

            const user = result.rows[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password',
                });
            }

            // Get subscription
            const subscription = await db.query(
                `SELECT *,
                    CASE
                        WHEN status = 'trial' AND trial_end_date > NOW()
                            THEN EXTRACT(DAY FROM (trial_end_date - NOW()))::INTEGER
                        WHEN status = 'active' AND subscription_end_date > NOW()
                            THEN EXTRACT(DAY FROM (subscription_end_date - NOW()))::INTEGER
                        ELSE 0
                    END AS days_remaining
                 FROM subscriptions
                 WHERE user_id = $1
                 ORDER BY created_at DESC LIMIT 1`,
                [user.id]
            );

            // Generate token
            const token = generateToken(user);

            return res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                    },
                    subscription: subscription.rows[0],
                    token,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    /**
     * Get current user profile
     * GET /api/auth/me
     */
    async getProfile(req, res) {
        try {
            const userId = req.user.id;

            const userResult = await db.query(
                'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
                [userId]
            );

            const subscription = await db.query(
                `SELECT *,
                    CASE
                        WHEN status = 'trial' AND trial_end_date > NOW()
                            THEN EXTRACT(DAY FROM (trial_end_date - NOW()))::INTEGER
                        WHEN status = 'active' AND subscription_end_date > NOW()
                            THEN EXTRACT(DAY FROM (subscription_end_date - NOW()))::INTEGER
                        ELSE 0
                    END AS days_remaining
                 FROM subscriptions
                 WHERE user_id = $1
                 ORDER BY created_at DESC LIMIT 1`,
                [userId]
            );

            return res.json({
                success: true,
                data: {
                    user: userResult.rows[0],
                    subscription: subscription.rows[0],
                },
            });
        } catch (error) {
            console.error('Get profile error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }
}

module.exports = new AuthController();
