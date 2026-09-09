const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

/**
 * Seed database with initial data
 */
async function seed() {
    try {
        console.log('🔄 Starting database seed...');

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 12);
        await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'admin')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            ['Admin Web Kos', 'admin@webkos.com', adminPassword, '081234567890']
        );

        // Create sample owner
        const ownerPassword = await bcrypt.hash('owner123', 12);
        const ownerResult = await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'owner')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            ['Budi Santoso', 'budi@example.com', ownerPassword, '081234567891']
        );

        // Create additional owners
        await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'owner')
             ON CONFLICT (email) DO NOTHING`,
            ['Ahmad Rizki', 'ahmad@kos.com', ownerPassword, '081234567894']
        );

        // Create viewer (pencari kos) accounts
        const viewerPassword = await bcrypt.hash('viewer123', 12);
        await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'viewer')
             ON CONFLICT (email) DO NOTHING`,
            ['Pencari Kos Test', 'pencari@kos.com', viewerPassword, '081234567892']
        );

        await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'viewer')
             ON CONFLICT (email) DO NOTHING`,
            ['Sari Dewi', 'sari@kos.com', viewerPassword, '081234567893']
        );

        if (ownerResult.rows.length > 0) {
            const ownerId = ownerResult.rows[0].id;

            // Get a location
            const locationResult = await db.query(
                `SELECT id FROM locations WHERE village = 'Kelapa Lima' LIMIT 1`
            );

            if (locationResult.rows.length > 0) {
                const locationId = locationResult.rows[0].id;

                // Create sample listing
                await db.query(
                    `INSERT INTO listings (owner_id, location_id, title, description, address, price_monthly, room_size, facilities, images, status, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved', true)
                     ON CONFLICT DO NOTHING`,
                    [
                        ownerId,
                        locationId,
                        'Kos Nyaman dekat Kampus',
                        'Kos strategis dekat kampus dan pasar. Fasilitas lengkap, WiFi cepat.',
                        'Jl. Kelapa Lima No. 10, Ende',
                        800000,
                        '3x4 meter',
                        JSON.stringify(['AC', 'WiFi', 'Kamar Mandi Dalam', 'Parkir']),
                        JSON.stringify(['https://example.com/image1.jpg']),
                    ]
                );
            }
        }

        console.log('✅ Seed completed successfully!');
        console.log('👤 Default accounts:');
        console.log('   Admin: admin@webkos.com / admin123');
        console.log('   Owner: budi@example.com / owner123');
        console.log('   Owner: ahmad@kos.com / owner123');
        console.log('   Viewer: pencari@kos.com / viewer123');
        console.log('   Viewer: sari@kos.com / viewer123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
