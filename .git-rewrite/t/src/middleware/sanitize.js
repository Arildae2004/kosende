/**
 * Input sanitization utilities
 * Fungsi ini untuk digunakan di frontend saat render data ke HTML
 *
 * CATATAN: Jangan sanitize input sebelum simpan ke database!
 * Data harus disimpan asli, dan di-escape saat ditampilkan.
 */

/**
 * Escape HTML entities untuk mencegah XSS saat render
 * Gunakan ini saat akan memasukkan data ke innerHTML
 */
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Escape HTML untuk object recursively
 */
const escapeHtmlObject = (obj) => {
    if (typeof obj === 'string') {
        return escapeHtml(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => escapeHtmlObject(item));
    }
    if (obj && typeof obj === 'object') {
        const escaped = {};
        for (const [key, value] of Object.entries(obj)) {
            escaped[key] = escapeHtmlObject(value);
        }
        return escaped;
    }
    return obj;
};

/**
 * Sanitize input - hanya untuk validasi, tidak mengubah data
 * Memeriksa apakah input mengandung konten berbahaya
 */
const containsXSS = (str) => {
    if (typeof str !== 'string') return false;
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // onclick, onerror, etc.
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
    ];
    return xssPatterns.some(pattern => pattern.test(str));
};

/**
 * Middleware: Deteksi XSS attempt (tidak mengubah data)
 * Jika terdeteksi XSS, tolak request
 */
const detectXSS = (req, res, next) => {
    const checkValue = (value, path) => {
        if (typeof value === 'string' && containsXSS(value)) {
            return res.status(400).json({
                success: false,
                message: `Input tidak valid pada field: ${path}`,
                code: 'XSS_DETECTED',
            });
        }
        return null;
    };

    const scanObject = (obj, prefix = '') => {
        if (typeof obj === 'string') {
            return checkValue(obj, prefix);
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const result = scanObject(obj[i], `${prefix}[${i}]`);
                if (result) return result;
            }
        }
        if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                const result = scanObject(value, prefix ? `${prefix}.${key}` : key);
                if (result) return result;
            }
        }
        return null;
    };

    // Scan body, query, and params
    if (req.body) {
        const result = scanObject(req.body, 'body');
        if (result) return result;
    }
    if (req.query) {
        const result = scanObject(req.query, 'query');
        if (result) return result;
    }
    if (req.params) {
        const result = scanObject(req.params, 'params');
        if (result) return result;
    }

    next();
};

module.exports = {
    escapeHtml,
    escapeHtmlObject,
    containsXSS,
    detectXSS,
};
