const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

/**
 * Run database migration
 * Execute schema.sql to create all tables and relations
 */
async function migrate() {
    try {
        console.log('🔄 Starting database migration...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute the schema
        await db.query(schema);

        console.log('✅ Migration completed successfully!');
        console.log('📊 Tables created:');
        console.log('   - users');
        console.log('   - subscriptions');
        console.log('   - payments');
        console.log('   - locations');
        console.log('   - listings');
        console.log('   - activity_logs');
        console.log('📈 Views created:');
        console.log('   - v_active_listings');
        console.log('   - v_subscription_overview');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
