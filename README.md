# Web Kos Kosan - Platform Manajemen Listing Kos

Platform manajemen listing kos di wilayah **Ende, NTT** dengan sistem trial, subscription, dan approval admin.

## 🏗️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Token)
- **Cron Job**: node-cron (untuk pengecekan subscription expired)

## 📁 Struktur Project

```
webkoskosan/
├── database/
│   ├── schema.sql          # Database schema (tables, relations, triggers)
│   ├── migrate.js          # Migration script
│   └── seed.js             # Seed data
├── src/
│   ├── config/
│   │   └── database.js     # Database connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── listingController.js
│   │   └── subscriptionController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication
│   │   ├── subscriptionCheck.js  # Trial & subscription check
│   │   └── validateLocation.js   # Validasi lokasi Ende NTT
│   ├── routes/
│   │   ├── auth.js
│   │   ├── listings.js
│   │   ├── subscriptions.js
│   │   └── locations.js
│   ├── services/
│   │   ├── listingService.js
│   │   └── subscriptionService.js
│   ├── jobs/
│   │   └── subscriptionCron.js   # Cron job cek expired
│   └── app.js
├── server.js
├── package.json
└── .env.example
```

## 🚀 Instalasi

```bash
# Clone repository
git clone <repo-url>
cd webkoskosan

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi database Anda

# Jalankan migration
npm run migrate

# Jalankan seed (opsional, untuk data awal)
npm run seed

# Start development server
npm run dev

# Start production server
npm start
```

## 📊 Database Schema

### Tables
| Table | Description |
|-------|-------------|
| `users` | Data pengguna (owner, admin, viewer) |
| `subscriptions` | Data langganan (trial, active, expired) |
| `payments` | Data pembayaran |
| `locations` | Data lokasi valid di Ende, NTT |
| `listings` | Data listing kos |
| `activity_logs` | Log aktivitas |

### Enums
- **user_role**: `owner`, `admin`, `viewer`
- **subscription_status**: `trial`, `active`, `expired`, `cancelled`
- **listing_status**: `pending`, `approved`, `rejected`, `inactive`
- **payment_status**: `pending`, `verified`, `rejected`

### Triggers
- Auto-create subscription saat user register
- Auto-update `updated_at` timestamp

## 🔄 Alur Bisnis (Business Flow)

### 1. Register Owner → Trial Aktif
```
POST /api/auth/register
→ User terdaftar dengan role 'owner'
→ Subscription 'trial' otomatis dibuat (14 hari)
→ JWT token dikembalikan
```

### 2. Input Kos (Listing)
```
POST /api/listings
→ Middleware: authenticate → checkSubscription → validateLocation
→ Listing dibuat dengan status 'pending'
→ Menunggu approval admin
```

### 3. Admin Approve Listing
```
PATCH /api/listings/admin/:id/approve
→ Admin menyetujui listing
→ Jika subscription aktif → listing is_active = true
→ Jika subscription expired → listing tetap inactive
```

### 4. Trial Habis → Subscription Expired
```
Cron job (daily at midnight) / Manual trigger:
POST /api/subscriptions/admin/check-expirations
→ Cek subscription yang trial_end_date < NOW()
→ Ubah status menjadi 'expired'
→ Ubah semua listing milik user menjadi inactive
```

### 5. Subscribe (Perpanjang Langganan)
```
POST /api/submissions/payment
→ Owner submit bukti pembayaran
→ Payment status: 'pending'

PATCH /api/subscriptions/admin/payments/:id/verify
→ Admin verifikasi pembayaran
→ Subscription diaktifkan (status: 'active')
→ Listing yang sudah approved → is_active = true
```

## 🧪 Testing Alur Lengkap

### Step 1: Register Owner
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "password123",
    "phone": "081234567890"
  }'
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful. Your 14-day trial has started!",
  "data": {
    "user": { "id": "...", "name": "Budi Santoso", ... },
    "subscription": { "status": "trial", "trial_end_date": "...", ... },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Step 2: Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "budi@example.com",
    "password": "password123"
  }'
```

### Step 3: Get Valid Locations
```bash
curl http://localhost:3000/api/locations
```

### Step 4: Create Listing
```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "location_id": "<LOCATION_ID>",
    "title": "Kos Nyaman Ende",
    "description": "Kos strategis dekat kampus",
    "address": "Jl. Kelapa Lima No. 10, Ende",
    "price_monthly": 800000,
    "room_size": "3x4 meter",
    "facilities": ["AC", "WiFi", "Kamar Mandi Dalam"]
  }'
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Listing created successfully. Waiting for admin approval.",
  "data": { "id": "...", "status": "pending", ... }
}
```

### Step 5: Admin Approve Listing
```bash
curl -X PATCH http://localhost:3000/api/listings/admin/<LISTING_ID>/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Listing approved and activated",
  "data": { "status": "approved", "is_active": true, ... }
}
```

### Step 6: Verify Active Listing
```bash
curl http://localhost:3000/api/listings
```
**Expected:** Listing muncul di daftar active listings

### Step 7: Simulate Trial Expired (Manual)
```bash
# Update trial_end_date ke masa lalu (via database)
UPDATE subscriptions SET trial_end_date = NOW() - INTERVAL '1 day' WHERE user_id = '<OWNER_ID>';

# Trigger expiration check
curl -X POST http://localhost:3000/api/subscriptions/admin/check-expirations \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
**Expected Response:**
```json
{
  "success": true,
  "message": "1 subscription(s) expired",
  "data": [{ "id": "...", "user_id": "...", "status": "trial" }]
}
```

### Step 8: Verify Listings Deactivated
```bash
curl http://localhost:3000/api/listings/my-listings \
  -H "Authorization: Bearer <TOKEN>"
```
**Expected:** Semua listing milik user memiliki `is_active: false`

### Step 9: Submit Payment
```bash
curl -X POST http://localhost:3000/api/subscriptions/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "amount": 50000,
    "payment_method": "bank_transfer",
    "proof_url": "https://example.com/bukti.jpg",
    "notes": "Pembayaran untuk 1 bulan"
  }'
```

### Step 10: Admin Verify Payment
```bash
curl -X PATCH http://localhost:3000/api/subscriptions/admin/payments/<PAYMENT_ID>/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -d '{
    "status": "verified",
    "duration_months": 1
  }'
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": { "status": "verified", ... }
}
```

### Step 11: Verify Subscription Active & Listings Reactivated
```bash
curl http://localhost:3000/api/subscriptions/my-subscription \
  -H "Authorization: Bearer <TOKEN>"
```
**Expected:** `status: "active"`, `subscription_end_date` di masa depan

```bash
curl http://localhost:3000/api/listings/my-listings \
  -H "Authorization: Bearer <TOKEN>"
```
**Expected:** Listing yang sudah approved memiliki `is_active: true`

## 🔐 API Endpoints Summary

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | - | Register owner baru |
| POST | `/api/auth/login` | - | Login |
| GET | `/api/auth/me` | ✅ | Get profile |

### Listings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/listings` | - | Get active listings (public) |
| POST | `/api/listings` | ✅ Owner | Create listing |
| GET | `/api/listings/my-listings` | ✅ Owner | Get owner's listings |
| GET | `/api/listings/:id` | - | Get listing detail |
| PUT | `/api/listings/:id` | ✅ Owner | Update listing |
| DELETE | `/api/listings/:id` | ✅ Owner | Delete listing |
| GET | `/api/listings/admin/pending` | ✅ Admin | Get pending listings |
| GET | `/api/listings/admin/all` | ✅ Admin | Get all listings |
| PATCH | `/api/listings/admin/:id/approve` | ✅ Admin | Approve listing |
| PATCH | `/api/listings/admin/:id/reject` | ✅ Admin | Reject listing |

### Subscriptions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/subscriptions/my-subscription` | ✅ Owner | Get subscription |
| POST | `/api/subscriptions/payment` | ✅ Owner | Submit payment |
| GET | `/api/subscriptions/payments` | ✅ Owner | Payment history |
| GET | `/api/subscriptions/admin/pending-payments` | ✅ Admin | Pending payments |
| PATCH | `/api/subscriptions/admin/payments/:id/verify` | ✅ Admin | Verify payment |
| GET | `/api/subscriptions/admin/overview` | ✅ Admin | Subscription overview |
| POST | `/api/subscriptions/admin/check-expirations` | ✅ Admin | Check expirations |

### Locations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations` | - | Get valid locations |

## 📝 Catatan Penting

1. **Trial Duration**: 14 hari (bisa diubah di `schema.sql`)
2. **Cron Job**: Berjalan setiap hari jam 00:00 untuk cek expired subscriptions
3. **Validasi Lokasi**: Hanya menerima alamat di wilayah Ende, NTT
4. **Payment**: Manual verification by admin (bisa diintegrasikan payment gateway)
