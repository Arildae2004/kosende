const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google',
});

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
];

function getGoogleAuthUrl(state = '') {
    const params = new URLSearchParams({
        client_id: googleClient._clientId,
        redirect_uri: googleClient.redirectUri,
        response_type: 'code',
        scope: GOOGLE_SCOPES.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function getGoogleTokens(code) {
    const { tokens } = await googleClient.getToken(code);
    return tokens;
}

async function getGoogleUserInfo(tokens) {
    const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: googleClient._clientId,
    });
    return ticket.getPayload();
}

module.exports = {
    googleClient,
    getGoogleAuthUrl,
    getGoogleTokens,
    getGoogleUserInfo,
};
