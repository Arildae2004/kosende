/**
 * Payment Gateway abstraction (Midtrans / Xendit ready)
 * - Bila MIDTRANS_SERVER_KEY diset: pakai Midtrans Snap API asli.
 * - Bila belum diset: fallback mode manual (transfer BNI + WA) agar tetap jalan di Railway.
 * Docs: https://docs.midtrans.com
 */
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : (process.env.APP_BASE_URL || 'https://kosende-production.up.railway.app');

const SUBSCRIPTION_PRICE = parseInt(process.env.SUBSCRIPTION_PRICE || '50000', 10);

function isGatewayEnabled() {
    return Boolean(MIDTRANS_SERVER_KEY);
}

async function createSubscriptionCharge({ orderId, amount, customer }) {
    if (!isGatewayEnabled()) {
        return {
            enabled: false,
            orderId,
            amount,
            message: 'Payment gateway belum dikonfigurasi. Gunakan transfer manual BNI.',
        };
    }
    // Midtrans Snap: https://api.midtrans.com/snap/v1/transactions (prod) / sandbox
    const base = MIDTRANS_IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
    const payload = {
        transaction_details: { order_id: orderId, gross_amount: amount },
        customer_details: {
            first_name: (customer && customer.name) || 'Owner KosEnde',
            email: (customer && customer.email) || undefined,
            phone: (customer && customer.phone) || undefined,
        },
        callbacks: { finish: `${APP_BASE_URL}/?payment=finish&order_id=${orderId}` },
        expiry: { duration: 24, unit: 'hours' },
    };
    const res = await fetch(base, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data?.error_messages?.join('; ') || 'Midtrans error');
        err.details = data;
        throw err;
    }
    return { enabled: true, orderId, token: data.token, redirect_url: data.redirect_url };
}

module.exports = {
    isGatewayEnabled,
    createSubscriptionCharge,
    SUBSCRIPTION_PRICE,
    MIDTRANS_CLIENT_KEY,
    APP_BASE_URL,
};
