/**
 * Simple in-memory rate limiter
 * Untuk production, gunakan Redis atau layanan rate limiting dedicated
 */

// Store for rate limiting
const rateLimitStore = new Map();

// Clean up old entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 10 * 60 * 1000);

/**
 * Rate limiter middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        // Get client IP
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const key = `${ip}:${req.path}`;
        const now = Date.now();

        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs,
            });
            return next();
        }

        const data = rateLimitStore.get(key);

        // Reset if window has passed
        if (now > data.resetTime) {
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs,
            });
            return next();
        }

        // Check limit
        if (data.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
                retryAfter: Math.ceil((data.resetTime - now) / 1000),
            });
        }

        data.count++;
        next();
    };
};

/**
 * Strict rate limiter for auth endpoints (login, register)
 * Max 5 attempts per 15 minutes
 */
const authRateLimiter = rateLimiter(5, 15 * 60 * 1000);

/**
 * General API rate limiter
 * Max 100 requests per 15 minutes
 */
const apiRateLimiter = rateLimiter(100, 15 * 60 * 1000);

/**
 * Upload rate limiter
 * Max 10 uploads per hour
 */
const uploadRateLimiter = rateLimiter(10, 60 * 60 * 1000);

module.exports = {
    rateLimiter,
    authRateLimiter,
    apiRateLimiter,
    uploadRateLimiter,
};
