const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'webkoskosan',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    dateStrings: true,
});

// Test connection()
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
}

testConnection();

module.exports = {
    query: async (text, params) => {
        const [rows] = await pool.query(text, params);
        return { rows };
    },
    pool,
    execute: (text, params) => pool.execute(text, params),
};
