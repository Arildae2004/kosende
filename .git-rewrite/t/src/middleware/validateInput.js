/**
 * Input validation middleware
 * Validasi email, password strength, dan input lainnya
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 * - Minimal 8 karakter
 * - Minimal 1 huruf besar
 * - Minimal 1 huruf kecil
 * - Minimal 1 angka
 */
const isStrongPassword = (password) => {
    if (!password || password.length < 8) {
        return {
            valid: false,
            message: 'Password minimal 8 karakter',
        };
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        return {
            valid: false,
            message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
        };
    }

    return { valid: true };
};

/**
 * Validate phone number (Indonesian format)
 */
const isValidPhone = (phone) => {
    if (!phone) return true; // Optional
    const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;
    return phoneRegex.test(phone);
};

/**
 * Middleware: Validate registration input
 */
const validateRegistration = (req, res, next) => {
    const { name, email, password, phone } = req.body;

    // Validate name
    if (!name || name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Nama minimal 2 karakter',
        });
    }

    if (name.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Nama maksimal 100 karakter',
        });
    }

    // Validate email
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Format email tidak valid',
        });
    }

    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
        return res.status(400).json({
            success: false,
            message: passwordCheck.message,
        });
    }

    // Validate phone (optional)
    if (phone && !isValidPhone(phone)) {
        return res.status(400).json({
            success: false,
            message: 'Format nomor telepon tidak valid. Gunakan format: 08xxxxxxxxxx',
        });
    }

    next();
};

/**
 * Middleware: Validate login input
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            message: 'Format email tidak valid',
        });
    }

    if (!password) {
        return res.status(400).json({
            success: false,
            message: 'Password wajib diisi',
        });
    }

    next();
};

module.exports = {
    isValidEmail,
    isStrongPassword,
    isValidPhone,
    validateRegistration,
    validateLogin,
};
