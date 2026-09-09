# Panduan Deploy KosEnde ke Hostinger

## 📋 Persiapan

### 1. Login ke Hostinger Panel
- Buka https://hpanel.hostinger.com
- Login dengan akun Anda

### 2. Pastikan Paket Hosting Support Node.js
- Paket **Business** atau **Cloud** mendukung Node.js
- Paket Single/Personal mungkin tidak mendukung Node.js

---

## 🚀 Langkah Deploy

### Step 1: Upload File

#### Opsi A: Via File Manager
1. Buka **File Manager** di hPanel
2. Navigasi ke folder `public_html`
3. Upload semua file project (zip lalu extract)

#### Opsi B: Via FTP
1. Buat akun FTP di hPanel → **FTP Accounts**
2. Gunakan FileZilla untuk upload
3. Upload ke folder `public_html`

### Step 2: Setup Database

1. Buka **Databases** → **MySQL** di hPanel
2. Buat database baru:
   - Database name: `webkoskosan`
   - Username: (buat baru)
   - Password: (buat yang kuat)
3. Catat kredensial database

### Step 3: Import Database Schema

1. Buka **phpMyAdmin** di hPanel
2. Pilih database yang sudah dibuat
3. Klik **Import**
4. Upload file `database/schema-mysql.sql` (versi MySQL)
5. Klik **Go/Execute**

### Step 4: Install Dependencies

1. Buka **SSH Access** atau **Terminal** di hPanel
2. Navigasi ke folder project:
   ```bash
   cd public_html
   ```
3. Install dependencies:
   ```bash
   npm install --production
   ```

### Step 5: Konfigurasi Environment

1. Edit file `.env` dengan kredensial Hostinger:
   ```env
   PORT=3000
   NODE_ENV=production
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=webkoskosan
   DB_USER=your_username
   DB_PASSWORD=your_password
   JWT_SECRET=random-string-yang-sangat-kuat
   ```

   **Catatan:** Hostinger menggunakan MySQL, bukan PostgreSQL!

### Step 6: Setup Node.js Application

1. Buka **Node.js** di hPanel
2. Buat aplikasi baru:
   - Application root: `public_html`
   - Application entry point: `server.js`
   - Application URL: domain Anda
3. Klik **Run**

### Step 7: Setup Upload Folder

1. Buat folder `public/uploads` jika belum ada
2. Set permission ke 755:
   ```bash
   chmod -R 755 public/uploads
   ```

---

## 🔧 Troubleshooting

### Error: Cannot connect to database
- Cek kredensial di `.env`
- Pastikan database sudah dibuat
- Cek apakah user punya akses ke database

### Error: Port already used
- Ganti PORT di `.env` (contoh: 3001)
- Atau kill process yang menggunakan port tersebut

### Upload tidak berjalan
- Cek folder `public/uploads` ada dan writable
- Set permission: `chmod 755 public/uploads`

### 404 Not Found
- Pastikan file `public/index.html` ada
- Cek `.htaccess` sudah terupload

---

## 📁 Struktur Folder di Hostinger

```
public_html/
├── .env                    # Environment variables
├── .htaccess              # Apache config
├── server.js              # Entry point
├── package.json           # Dependencies
├── database/
│   ├── schema.sql         # Database schema
│   └── seed.js            # Seed data
├── public/
│   ├── index.html         # Frontend
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── uploads/           # Uploaded images
└── src/
    ├── app.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── routes/
    └── services/
```

---

## 🔐 Security Checklist

- [ ] Ganti JWT_SECRET dengan random string yang kuat
- [ ] Gunakan HTTPS (aktifkan SSL di hPanel)
- [ ] Set file permission benar (644 untuk file, 755 untuk folder)
- [ ] Jangan upload file .env ke public folder
- [ ] Backup database secara rutin

---

## 📞 Bantuan

Jika ada masalah:
1. Cek error log di hPanel → **Error Logs**
2. Cek Node.js logs di hPanel → **Node.js** → **Logs**
3. Hubungi support Hostinger jika perlu
