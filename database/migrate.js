const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

/**
 * Run database migration
 * - schema.sql untuk install baru (toleran jika tabel sudah ada)
 * - migration-002.sql untuk kolom tipe kos, koordinat & reviews (idempotent)
 */
async function migrate() {
    try {
        console.log('🔄 Starting database migration...');

        const runFile = async (file) => {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) {
                console.log(`⏭️  Skipping ${file} (not found)`);
                return;
            }
            const sql = fs.readFileSync(filePath, 'utf8');
            try {
                await db.query(sql);
                console.log(`✅ ${file} applied`);
            } catch (err) {
                // Toleran untuk objek yang sudah ada (rerun di Railway/Render)
                const ignorable = ['already exists', 'duplicate key'];
                if (ignorable.some((m) => err.message.includes(m))) {
                    console.log(`⏭️  ${file}: sebagian objek sudah ada, dilanjutkan`);
                } else {
                    throw err;
                }
            }
        };

        await runFile('schema.sql');
        await runFile('migration-002.sql');
        await runFile('migration-003.sql');

        console.log('✅ Migration completed successfully!');
        console.log('📊 Tables: users, subscriptions, payments, locations, listings, reviews, activity_logs');
        console.log('📈 Views: v_active_listings, v_subscription_overview');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
