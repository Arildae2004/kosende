const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const { startSubscriptionCron } = require('./jobs/subscriptionCron');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const { detectXSS } = require('./middleware/sanitize');

const app = express();

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
            imgSrc: ["'self'", "data:", "https:"],
            frameSrc: ["'self'", "https:"], // OpenStreetMap / Google Maps embed di detail kos
            connectSrc: ["'self'"],
            frameAncestors: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(apiRateLimiter);

// XSS Detection (reject request if XSS detected)
app.use(detectXSS);

// Sitemap dinamis (statis + listing aktif untuk SEO) — dipasang SEBELUM static agar tidak tertutup file statis
app.get('/sitemap.xml', async (req, res, next) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        let urls = `  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`;
        try {
            const db = require('./config/database');
            const r = await db.query(`SELECT id FROM listings WHERE is_active = true AND status = 'approved' LIMIT 500`);
            for (const row of r.rows) {
                urls += `\n  <url><loc>${baseUrl}/kos/${row.id}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
            }
        } catch (_) { /* fallback hanya homepage bila DB down */ }
        res.set('Content-Type', 'application/xml');
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`);
    } catch (e) {
        return next();
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SEO: halaman detail kos dengan meta OG dinamis per listing
// URL: /kos/:id — dibagikan ke WhatsApp/FB akan menampilkan judul, harga & foto
app.get('/kos/:id', async (req, res, next) => {
    try {
        const db = require('./config/database');
        const r = await db.query(
            `SELECT l.id, l.title, l.description, l.address, l.price_monthly, l.images,
                    loc.village, loc.district
             FROM listings l LEFT JOIN locations loc ON l.location_id = loc.id
             WHERE l.id = $1 LIMIT 1`,
            [req.params.id]
        );
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        if (r.rows.length === 0) {
            return res.redirect('/?notfound=kos');
        }
        const l = r.rows[0];
        const images = Array.isArray(l.images) ? l.images : [];
        const price = new Intl.NumberFormat('id-ID').format(l.price_monthly || 0);
        const title = `${l.title} — Rp ${price}/bln | KosEnde`;
        const desc = (l.description || l.address || 'Kos di Ende, NTT').slice(0, 160);
        const img = images[0] || `${baseUrl}/og-cover.svg`;
        const url = `${baseUrl}/kos/${l.id}`;
        const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title.replace(/</g, '&lt;')}</title>
<meta name="description" content="${String(desc).replace(/"/g, '&quot;')}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="KosEnde">
<meta property="og:title" content="${String(l.title).replace(/"/g, '&quot;')} — Rp ${price}/bulan">
<meta property="og:description" content="${String(desc).replace(/"/g, '&quot;')} — ${l.village || ''}, ${l.district || 'Ende'}">
<meta property="og:image" content="${img}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=/?kos=${l.id}#cari">
</head><body><p>Membuka <a href="/?kos=${l.id}#cari">${String(l.title).replace(/</g, '&lt;')}</a>...</p>
<script>window.location.replace('/?kos=${l.id}#cari');</script></body></html>`;
        res.set('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    } catch (e) {
        return next(e);
    }
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
});

// Start cron jobs
startSubscriptionCron();

module.exports = app;
