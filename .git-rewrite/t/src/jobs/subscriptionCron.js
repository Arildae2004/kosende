const cron = require('node-cron');
const subscriptionService = require('../services/subscriptionService');

/**
 * Cron job untuk mengecek dan mengupdate subscription yang sudah expired
 * Setiap hari jam 00:00 (midnight)
 */
const startSubscriptionCron = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running subscription expiration check...');
        try {
            const expiredSubscriptions = await subscriptionService.expireSubscriptions();
            console.log(`✅ ${expiredSubscriptions.length} subscription(s) expired and listings deactivated`);
        } catch (error) {
            console.error('❌ Error in subscription cron job:', error);
        }
    });

    console.log('⏰ Subscription cron job scheduled (daily at midnight)');
};

module.exports = { startSubscriptionCron };
