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

        // ---------- 15 Sample listings (Ende riil) ----------
        const samples = [
            {
                village: 'Mbongawani',
                title: 'Kos Putri Anugerah — Dekat Unflor',
                description: 'Kos putri eksklusif 5 menit jalan kaki ke Universitas Flores. Lingkungan tenang, penjaga 24 jam, dapur bersama, dan area jemuran luas. Cocok untuk mahasiswi.',
                address: 'Jl. Anggrek No. 12, Mbongawani, Ende Timur',
                price: 750000, room: '3x4 meter', type: 'putri',
                lat: -8.8362, lng: 121.6519,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'AC', 'Dapur Bersama', 'Parkir Motor', 'CCTV', 'Air PAM', 'Listrik Token'],
                rules: 'Jam malam 22.00 WITA. Tidak boleh bawa hewan. Tamu lawan jenis hanya sampai ruang tamu. Dilarang merokok di dalam kamar.',
                rooms: 4, electricity: 'Token', water: 'PAM',
                seed: 'kosende-putri1',
            },
            {
                village: 'Tetandara',
                title: 'Kos Putra Wira — Pusat Kota Ende',
                description: 'Kos putra strategis di pusat kota, dekat pasar Mbongawani dan perkantoran. Kamar luas dengan ventilasi bagus, listrik token masing-masing kamar.',
                address: 'Jl. Soekarno No. 45, Tetandara, Ende Tengah',
                price: 500000, room: '3x3 meter', type: 'putra',
                lat: -8.8402, lng: 121.6601,
                facilities: ['WiFi', 'Kamar Mandi Luar', 'Parkir Motor', 'Air PAM', 'Listrik Token'],
                rules: 'Bebas jam malam untuk karyawan. Dilarang membawa minuman keras. Jaga kebersihan kamar masing-masing.',
                rooms: 6, electricity: 'Token', water: 'PAM',
                seed: 'kosende-putra1',
            },
            {
                village: 'Maurole',
                title: 'Kos Campur Pelita Harapan',
                description: 'Kos campur nyaman untuk mahasiswa dan karyawan. Dekat RSUD Ende dan terminal. Air PDAM lancar, free WiFi 50 Mbps, bisa bayar per 6 bulan dengan diskon.',
                address: 'Jl. Pelita No. 8, Maurole, Ende Selatan',
                price: 650000, room: '3x4 meter', type: 'campur',
                lat: -8.8490, lng: 121.6490,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'Parkir Motor', 'Dapur Bersama', 'Laundry', 'Air PAM', 'Listrik Inklusi'],
                rules: 'Jam malam 23.00. Tidak boleh bawa hewan besar. Wajib lapor KTP 1x24 jam setelah masuk.',
                rooms: 8, electricity: 'Inklusi', water: 'PAM',
                seed: 'kosende-campur1',
            },
            {
                village: 'Rukuramba',
                title: 'Kos Eksklusif Nusa Bunga',
                description: 'Kos premium dengan full furnished: spring bed, lemari, meja belajar, AC, dan water heater. Keamanan CCTV 24 jam + gerbang kunci. Area asri dan sejuk.',
                address: 'Jl. Nusa Bunga No. 21, Rukuramba, Ende Utara',
                price: 1200000, room: '4x4 meter', type: 'putri',
                lat: -8.8280, lng: 121.6700,
                facilities: ['AC', 'WiFi', 'Kamar Mandi Dalam', 'Water Heater', 'CCTV', 'Parkir Motor', 'Dapur Pribadi', 'Air PAM', 'Listrik Token'],
                rules: 'Khusus mahasiswi/karyawati. Jam malam 21.30. Tidak boleh pasutri. Tidak boleh bawa hewan.',
                rooms: 5, electricity: 'Token', water: 'PAM',
                seed: 'kosende-premium1',
            },
            {
                village: 'Ndona',
                title: 'Kos Pasutri Berkah Ndona',
                description: 'Kos khusus pasutri/karyawan dengan 1 kamar tidur + ruang tamu mini dan dapur pribadi. Parkir mobil tersedia. Lingkungan keluarga yang aman dan nyaman.',
                address: 'Jl. Trans Ndona No. 3, Ndona, Ende Timur',
                price: 900000, room: '4x6 meter', type: 'pasutri',
                lat: -8.8315, lng: 121.6478,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'Dapur Pribadi', 'Parkir Mobil', 'Balkon', 'Air Sumur', 'Listrik Token'],
                rules: 'Khusus pasutri/keluarga (wajib KK/buku nikah). Boleh bawa anak. Hewan kecil boleh dengan izin owner.',
                rooms: 3, electricity: 'Token', water: 'Sumur',
                seed: 'kosende-pasutri1',
            },
            {
                village: 'Kota Raja',
                title: 'Kos Putri Kartini — Belakang Pasar Ende',
                description: 'Kos putri 10 menit ke SMAN 1 Ende dan pasar. Kamar bersih, ada lemari & kasur, jemuran di lantai 2. Ibu kos tinggal di depan, aman.',
                address: 'Jl. Kartini Gg. Mawar No. 5, Kota Raja, Ende',
                price: 550000, room: '3x3 meter', type: 'putri',
                lat: -8.8387, lng: 121.6642,
                facilities: ['WiFi', 'Kamar Mandi Luar', 'Dapur Bersama', 'Parkir Motor', 'Air PAM', 'Listrik Inklusi', 'CCTV'],
                rules: 'Jam malam 22.00. Tamu maksimal sampai 21.00. Tidak boleh merokok di area kos.',
                rooms: 7, electricity: 'Inklusi', water: 'PAM',
                seed: 'kosende-putri2',
            },
            {
                village: 'Kota Ratu',
                title: 'Kos Putra Bahagia Kota Ratu',
                description: 'Kos putra ekonomis untuk mahasiswa Unflor & pekerja. Bebas banjir, air sumur + PAM tidak pernah kering. Bisa bulanan atau tahunan.',
                address: 'Jl. Wirajaya No. 17, Kota Ratu, Ende',
                price: 450000, room: '3x3 meter', type: 'putra',
                lat: -8.8415, lng: 121.6580,
                facilities: ['Kamar Mandi Luar', 'Parkir Motor', 'Dapur Bersama', 'Air Sumur', 'Listrik Token'],
                rules: 'Bebas tapi sopan. Dilarang berisik di atas jam 23.00. Iuran kebersihan Rp 20rb/bulan.',
                rooms: 10, electricity: 'Token', water: 'Sumur',
                seed: 'kosende-putra2',
            },
            {
                village: 'Onekore',
                title: 'Kos Campur Onekore Permai',
                description: 'Kos campur dekat Bandara H. Hasan Aroeboesman (±10 menit) dan kampus. Cocok untuk karyawan bandara & mahasiswa. WiFi kencang 100 Mbps.',
                address: 'Jl. Bandara No. 30, Onekore, Ende',
                price: 700000, room: '3x4 meter', type: 'campur',
                lat: -8.8465, lng: 121.6670,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'AC', 'Parkir Motor', 'Dapur Bersama', 'Air PAM', 'Listrik Token'],
                rules: 'Jam malam 23.00. Wajib menjaga ketertiban. Tidak boleh bawa hewan.',
                rooms: 6, electricity: 'Token', water: 'PAM',
                seed: 'kosende-campur2',
            },
            {
                village: 'Paupanda',
                title: 'Kos Putri Paupanda Asri',
                description: 'Kos putri di kawasan perumahan Paupanda yang tenang. Dekat masjid & gereja, minimarket 2 menit. Kamar mandi dalam semua kamar.',
                address: 'Jl. Paupanda Permai Blok B No. 9, Ende',
                price: 800000, room: '3x4 meter', type: 'putri',
                lat: -8.8430, lng: 121.6530,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'Lemari', 'Meja Belajar', 'Parkir Motor', 'CCTV', 'Air PAM', 'Listrik Token'],
                rules: 'Khusus putri. Jam malam 22.00. Tidak boleh membawa tamu menginap tanpa izin.',
                rooms: 5, electricity: 'Token', water: 'PAM',
                seed: 'kosende-putri3',
            },
            {
                village: 'Kelapa Lima',
                title: 'Kos Putra Kelapa Lima Budget',
                description: 'Kos putra paling hemat di pusat Ende. 5 menit ke Pelabuhan Bung Karno. Kasur + kipas angin, kamar mandi luar bersih disikat tiap hari.',
                address: 'Jl. Kelapa Lima No. 22, Ende',
                price: 400000, room: '2.5x3 meter', type: 'putra',
                lat: -8.8370, lng: 121.6590,
                facilities: ['Kamar Mandi Luar', 'Parkir Motor', 'Air PAM', 'Listrik Inklusi'],
                rules: 'Bayar maksimal tanggal 5 tiap bulan. Dilarang membawa barang terlarang. Wajib ikut kerja bakti 1x sebulan.',
                rooms: 12, electricity: 'Inklusi', water: 'PAM',
                seed: 'kosende-putra3',
            },
            {
                village: 'Mbomba',
                title: 'Kos Campur Griya Mbomba',
                description: 'Kos baru 2025, bangunan fresh, cat baru, sanitair baru. Dekat Unipers & STKIP. Ada rooftop untuk nongkrong & jemuran.',
                address: 'Jl. Mbomba Raya No. 11, Ende Utara',
                price: 850000, room: '3x5 meter', type: 'campur',
                lat: -8.8340, lng: 121.6720,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'AC', 'Parkir Motor', 'Rooftop', 'CCTV', 'Air PAM', 'Listrik Token', 'Laundry'],
                rules: 'Dilarang merokok di kamar (ada area smoking rooftop). Jam malam 23.30. Hewan tidak boleh.',
                rooms: 9, electricity: 'Token', water: 'PAM',
                seed: 'kosende-campur3',
            },
            {
                village: 'Raterua',
                title: 'Kos Putri Raterua Syariah',
                description: 'Kos putri syariah, full muslimah friendly: mushola dalam kos, jam malam ketat, gerbang dikunci 21.30. Pengasuh kos standby.',
                address: 'Jl. Raterua No. 4, Ende Tengah',
                price: 600000, room: '3x3 meter', type: 'putri',
                lat: -8.8451, lng: 121.6553,
                facilities: ['WiFi', 'Kamar Mandi Dalam', 'Mushola', 'Dapur Bersama', 'Parkir Motor', 'Air Sumur', 'Listrik Token'],
                rules: 'Khusus muslimah. Wajib menutup aurat di area umum. Jam malam 21.30. Tidak boleh menerima tamu pria di kamar.',
                rooms: 8, electricity: 'Token', water: 'Sumur',
                seed: 'kosende-putri4',
            },
            {
                village: 'Tetandara',
                title: 'Kontrakan Mini Tetandara (Pasutri)',
                description: 'Kontrakan 1 petak besar: ruang tidur + dapur + KM dalam + ruang tamu. Cocok pasutri muda/PNS. Listrik 1300W token sendiri, air PAM.',
                address: 'Gg. Sawah No. 6, Tetandara, Ende Tengah',
                price: 1100000, room: '6x8 meter', type: 'pasutri',
                lat: -8.8402, lng: 121.6601,
                facilities: ['Kamar Mandi Dalam', 'Dapur Pribadi', 'Parkir Mobil', 'Air PAM', 'Listrik Token'],
                rules: 'Maksimal 4 jiwa per unit. Boleh renovasi ringan seizin owner. Bayar tahunan diskon 1 bulan.',
                rooms: 2, electricity: 'Token', water: 'PAM',
                seed: 'kosende-pasutri2',
            },
            {
                village: 'Wolowaru',
                title: 'Kos Karyawan Wolowaru Transit',
                description: 'Kos transit untuk pekerja proyek & dinas luar kota. Bisa harian/mingguan/bulanan. Dekat jalan trans Ende–Maumere.',
                address: 'Jl. Trans Wolowaru Km 4, Ende Selatan',
                price: 500000, room: '3x4 meter', type: 'campur',
                lat: -8.8490, lng: 121.6490,
                facilities: ['WiFi', 'Kamar Mandi Luar', 'Parkir Mobil', 'Dapur Bersama', 'Air Sumur', 'Listrik Inklusi'],
                rules: 'Bisa harian Rp 75rb. Wajib menunjukkan KTP. Check-in maksimal 22.00 untuk harian.',
                rooms: 6, electricity: 'Inklusi', water: 'Sumur',
                seed: 'kosende-transit1',
            },
            {
                village: 'Wee Wella',
                title: 'Kos Eksklusif Wee Wella View Kota',
                description: 'Kos view kota Ende + laut dari balkon. Full furnished + AC + smart TV. Premium untuk profesional & dosen. Parkir mobil luas.',
                address: 'Jl. Wee Wella Atas No. 2, Ende Timur',
                price: 1500000, room: '4x5 meter', type: 'campur',
                lat: -8.8320, lng: 121.6750,
                facilities: ['AC', 'Smart TV', 'WiFi', 'Kamar Mandi Dalam', 'Water Heater', 'Balkon', 'Parkir Mobil', 'CCTV', 'Air PAM', 'Listrik Token', 'Laundry'],
                rules: 'Dilarang party/merokok di kamar. Tamu menginap wajib lapor. Deposit 1 bulan kembali 100% bila tidak ada kerusakan.',
                rooms: 4, electricity: 'Token', water: 'PAM',
                seed: 'kosende-premium2',
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
                    `INSERT INTO listings (owner_id, location_id, title, description, address, price_monthly, room_size, kos_type, kos_rules, available_rooms, electricity, water_source, latitude, longitude, facilities, images, status, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'approved', true)
                     RETURNING id`,
                    [
                        demoOwnerId, loc.rows[0].id, s.title, s.description, s.address,
                        s.price, s.room, s.type, s.rules || null, s.rooms || 1,
                        s.electricity || null, s.water || null, s.lat, s.lng,
                        JSON.stringify(s.facilities),
                        JSON.stringify([`https://picsum.photos/seed/${s.seed}/800/600`]),
                    ]
                );
                listingId = ins.rows[0].id;
                console.log(`   + Listing: ${s.title}`);
            } else {
                // Update listing lama agar punya aturan & detail baru (idempotent)
                await db.query(
                    `UPDATE listings SET kos_rules = COALESCE(kos_rules, $2), available_rooms = COALESCE(available_rooms, $3),
                     electricity = COALESCE(electricity, $4), water_source = COALESCE(water_source, $5),
                     facilities = $6 WHERE id = $1`,
                    [listingId, s.rules || null, s.rooms || 1, s.electricity || null, s.water || null, JSON.stringify(s.facilities)]
                );
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
