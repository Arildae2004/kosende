# Panduan Hosting - KosEnde

## ✅ Status Aplikasi: SIAP HOSTING

Semua fitur sudah berjalan dengan baik dan sudah di-test.

---

## 📋 Pre-Hosting Checklist

### 1. Environment Variables
File `.env` untuk production:
```env
PORT=3000
NODE_ENV=production
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=webkoskosan
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-random-secret-key
JWT_EXPIRES_IN=7d
```

### 2. Database Setup
```bash
# Jalankan migration
npm run migrate

# Jalankan seed (opsional, untuk data awal)
npm run seed
```

### 3. Install Dependencies
```bash
npm install --production
```

### 4. Start Server
```bash
npm start
```

---

## 🚀 Hosting Options

### Option 1: VPS/Cloud Server (DigitalOcean, AWS, dll)
1. Setup Ubuntu server
2. Install Node.js 18+
3. Install PostgreSQL
4. Clone/upload project
5. Setup Nginx sebagai reverse proxy
6. Setup PM2 untuk process manager

### Option 2: Platform as a Service (Heroku, Railway, Render)
1. Connect GitHub repository
2. Set environment variables
3. Add PostgreSQL addon
4. Deploy!

### Option 3: Shared Hosting dengan Node.js Support
1. Upload file via FTP/SFTP
2. Setup database
3. Start Node.js app via panel

---

## 🔧 Konfigurasi Nginx (Recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /path/to/webkoskosan/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔧 Setup PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start app with PM2
pm2 start server.js --name "kosende"

# Save PM2 config
pm2 save

# Setup auto-start on boot
pm2 startup
```

---

## 📁 Struktur File untuk Hosting

```
webkoskosan/
├── database/
│   ├── schema.sql          # Database schema
│   ├── migrate.js          # Migration script
│   └── seed.js             # Seed data
├── public/
│   ├── css/
│   │   └── style.css       # Stylesheet
│   ├── js/
│   │   └── app.js          # Frontend JavaScript
│   ├── uploads/            # Uploaded images
│   └── index.html          # Main page
├── src/
│   ├── config/
│   │   ├── database.js     # DB connection
│   │   └── multer.js       # Upload config
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── app.js
├── server.js               # Entry point
├── package.json
└── .env                    # Environment variables
```

---

## 🔐 Security Checklist

- [ ] Ganti JWT_SECRET dengan random string yang kuat
- [ ] Gunakan HTTPS (SSL Certificate)
- [ ] Setup firewall (hanya port 80, 443, dan SSH)
- [ ] Backup database secara rutin
- [ ] Update dependencies secara berkala
- [ ] Setup rate limiting untuk API
- [ ] Validasi semua input user

---

## 📊 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@webkos.com | admin123 |
| Owner | budi@example.com | owner123 |

**PENTING:** Ganti password default setelah pertama kali login!

---

## 🐛 Troubleshooting

### Error: Cannot connect to database
- Cek DB_HOST, DB_PORT, DB_USER, DB_PASSWORD di .env
- Pastikan PostgreSQL berjalan
- Cek firewall rules

### Error: EADDRINUSE
- Port sudah digunakan, ganti PORT di .env
- Atau kill process yang menggunakan port tersebut

### Upload tidak berjalan
- Cek folder `public/uploads/` ada dan writable
- Cek permission folder (chmod 755)

### 404 Not Found
- Pastikan file `public/index.html` ada
- Cek route di `src/routes/`

---

## 📞 Support

Jika ada masalah saat hosting, periksa:
1. Logs: `pm2 logs` atau `node server.js`
2. Database connection
3. File permissions
4. Environment variables
