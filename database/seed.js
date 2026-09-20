const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

/**
 * Seed database with initial data + 5 sample kos Ende + reviews
 * Idempotent: gunakan ON CONFLICT / cek eksistensi agar aman di-rerun.
 */
async function seed() {
    try {
        console.log('🔄 Starting database seed...');

        // ---------- Users ----------
        const adminPassword = await bcrypt.hash('admin123', 12);
        await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'admin')
             ON CONFLICT (email) DO NOTHING`,
            ['Admin Web Kos', 'admin@webkos.com', adminPassword, '081234567890']
        );

        const ownerPassword = await bcrypt.hash('owner123', 12);
        const ownerResult = await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'owner')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            ['Budi Santoso', 'budi@example.com', ownerPassword, '081234567891']
        );

        await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'owner')
             ON CONFLICT (email) DO NOTHING`,
            ['Ahmad Rizki', 'ahmad@kos.com', ownerPassword, '081234567894']
        );

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

        // ---------- Demo owner untuk kos sampel ----------
        const demoPassword = await bcrypt.hash('demo1234', 12);
        let demoOwnerId = null;
        const demoRes = await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role)
             VALUES ($1, $2, $3, $4, 'owner')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            ['KosEnde Demo Owner', 'demo@kosende.id', demoPassword, '082359282149']
        );
        if (demoRes.rows.length > 0) {
            demoOwnerId = demoRes.rows[0].id;
        } else {
            const existing = await db.query(`SELECT id FROM users WHERE email = 'demo@kosende.id'`);
            demoOwnerId = existing.rows[0]?.id || null;
        }
        // Pastikan owner lama juga bisa dipakai bila demo owner gagal
        if (!demoOwnerId && ownerResult.rows.length > 0) {
            demoOwnerId = ownerResult.rows[0].id;
        }
        if (!demoOwnerId) {
            const anyOwner = await db.query(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
            demoOwnerId = anyOwner.rows[0]?.id || null;
        }

        // ---------- Koordinat lokasi Ende (untuk peta) ----------
        await db.query(`
            UPDATE locations SET latitude = -8.8402, longitude = 121.6601 WHERE village = 'Tetandara';
            UPDATE locations SET latitude = -8.8451, longitude = 121.6553 WHERE village = 'Raterua';
            UPDATE locations SET latitude = -8.8387, longitude = 121.6642 WHERE village = 'Kota Raja';
            UPDATE locations SET latitude = -8.8362, longitude = 121.6519 WHERE village = 'Mbongawani';
            UPDATE locations SET latitude = -8.8315, longitude = 121.6478 WHERE village = 'Ndona';
            UPDATE locations SET latitude = -8.8490, longitude = 121.6490 WHERE village = 'Maurole';
            UPDATE locations SET latitude = -8.8280, longitude = 121.6700 WHERE village = 'Rukuramba';
            UPDATE locations SET latitude = -8.8340, longitude = 121.6720 WHERE village = 'Mbomba';
        `);

        // ---------- 5 Sample listings ----------
        const samples = [
            {
                village: 'Mbongawani',
                title: 'Kos Putri Anugerah — Dekat Unflor',
                description: 'Kos putri eksklusif 5 menit jalan kaki ke Universitas Flores. Lingkungan tenang, penjaga 24 jam, dapur bersama, dan area jemuran luas. Cocok untuk mahasiswi.',
                address: 'Jl. Anggrek No. 12, Mbongawani, Ende Timur',
                price: 750000, room: '3x4 meter', type: 'putri',
                lat: -8.8362, lng: 121.6519,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'AC', 'Dapur Bersama', 'Parkir', 'CCTV'],
                seed: 'kosende-putri1',
            },
            {
                village: 'Tetandara',
                title: 'Kos Putra Wira — Pusat Kota Ende',
                description: 'Kos putra strategis di pusat kota, dekat pasar Mbongawani dan perkantoran. Kamar luas dengan ventilasi bagus, listrik token masing-masing kamar.',
                address: 'Jl. Soekarno No. 45, Tetandara, Ende Tengah',
                price: 500000, room: '3x3 meter', type: 'putra',
                lat: -8.8402, lng: 121.6601,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'Parkir', 'Bebas Listrik Token'],
                seed: 'kosende-putra1',
            },
            {
                village: 'Maurole',
                title: 'Kos Campur Pelita Harapan',
                description: 'Kos campur nyaman untuk mahasiswa dan karyawan. Dekat RSUD Ende dan terminal. Air PDAM lancar, free WiFi 50 Mbps, bisa bayar per 6 bulan dengan diskon.',
                address: 'Jl. Pelita No. 8, Maurole, Ende Selatan',
                price: 650000, room: '3x4 meter', type: 'campur',
                lat: -8.8490, lng: 121.6490,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'Parkir', 'Dapur Bersama', 'Laundry'],
                seed: 'kosende-campur1',
            },
            {
                village: 'Rukuramba',
                title: 'Kos Eksklusif Nusa Bunga',
                description: 'Kos premium dengan full furnished: spring bed, lemari, meja belajar, AC, dan water heater. Keamanan CCTV 24 jam + gerbang kunci. Area asri dan sejuk.',
                address: 'Jl. Nusa Bunga No. 21, Rukuramba, Ende Utara',
                price: 1200000, room: '4x4 meter', type: 'putri',
                lat: -8.8280, lng: 121.6700,
                facilities: ['AC', 'WiFi', 'Kamar Mandi Dalam', 'Water Heater', 'CCTV', 'Parkir', 'Dapur Pribadi'],
                seed: 'kosende-premium1',
            },
            {
                village: 'Ndona',
                title: 'Kos Pasutri Berkah Ndona',
                description: 'Kos khusus pasutri/karyawan dengan 1 kamar tidur + ruang tamu mini dan dapur pribadi. Parkir mobil tersedia. Lingkungan keluarga yang aman dan nyaman.',
                address: 'Jl. Trans Ndona No. 3, Ndona, Ende Timur',
                price: 900000, room: '4x6 meter', type: 'pasutri',
                lat: -8.8315, lng: 121.6478,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'Dapur Pribadi', 'Parkir Mobil', 'Balkon'],
                seed: 'kosende-pasutri1',
            },
        ];

        const sampleReviews = [
            { name: 'Maria Goreti', rating: 5, comment: 'Kosnya bersih, ibu kos ramah banget. Air lancar terus.' },
            { name: 'Yohanes Doni', rating: 4, comment: 'Lokasi strategis, dekat kampus. WiFi kencang.' },
            { name: 'Kristina W.', rating: 5, comment: 'Aman untuk anak perempuan, ada CCTV dan jam malam.' },
        ];

        for (const s of samples) {
            const loc = await db.query(`SELECT id FROM locations WHERE village = $1 LIMIT 1`, [s.village]);
            if (loc.rows.length === 0 || !demoOwnerId) continue;

            const exists = await db.query(`SELECT id FROM listings WHERE title = $1 LIMIT 1`, [s.title]);
            let listingId = exists.rows[0]?.id || null;

            if (!listingId) {
                const ins = await db.query(
                    `INSERT INTO listings (owner_id, location_id, title, description, address, price_monthly, room_size, kos_type, latitude, longitude, facilities, images, status, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'approved', true)
                     RETURNING id`,
                    [
                        demoOwnerId, loc.rows[0].id, s.title, s.description, s.address,
                        s.price, s.room, s.type, s.lat, s.lng,
                        JSON.stringify(s.facilities),
                        JSON.stringify([`https://picsum.photos/seed/${s.seed}/800/600`]),
                    ]
                );
                listingId = ins.rows[0].id;
                console.log(`   + Listing: ${s.title}`);
            }

            // Seed reviews bila belum ada
            const revCount = await db.query(`SELECT COUNT(*)::INT AS c FROM reviews WHERE listing_id = $1`, [listingId]);
            if (revCount.rows[0].c === 0) {
                for (const r of sampleReviews) {
                    await db.query(
                        `INSERT INTO reviews (listing_id, reviewer_name, rating, comment) VALUES ($1, $2, $3, $4)`,
                        [listingId, r.name, r.rating, r.comment]
                    );
                }
            }
        }

        console.log('✅ Seed completed successfully!');
        console.log('👤 Default accounts:');
        console.log('   Admin: admin@webkos.com / admin123');
        console.log('   Owner: budi@example.com / owner123');
        console.log('   Owner: ahmad@kos.com / owner123');
        console.log('   Demo Owner: demo@kosende.id / demo1234');
        console.log('   Viewer: pencari@kos.com / viewer123');
        console.log('   Viewer: sari@kos.com / viewer123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
