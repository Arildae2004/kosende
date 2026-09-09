-- =====================================================
-- Database Schema: Web Kos Kosan (MySQL Version)
-- Platform manajemen listing kos dengan sistem trial,
-- subscription, dan approval admin.
-- Lokasi: Ende, NTT
-- =====================================================

-- =====================================================
-- TABEL USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('owner', 'admin', 'viewer') NOT NULL DEFAULT 'owner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABEL SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    status ENUM('trial', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'trial',
    trial_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    trial_end_date TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 14 DAY),
    subscription_start_date TIMESTAMP NULL,
    subscription_end_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABEL PAYMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    subscription_id CHAR(36),
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    proof_image VARCHAR(500),
    status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    notes TEXT,
    verified_by CHAR(36),
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABEL LOCATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    village VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABEL LISTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS listings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    owner_id CHAR(36) NOT NULL,
    location_id CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    address TEXT,
    price_monthly DECIMAL(15,2) NOT NULL,
    deposit DECIMAL(15,2) DEFAULT 0,
    room_size VARCHAR(50),
    facilities JSON,
    images JSON,
    status ENUM('pending', 'approved', 'rejected', 'inactive') NOT NULL DEFAULT 'pending',
    is_active BOOLEAN DEFAULT FALSE,
    approved_by CHAR(36),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABEL ACTIVITY LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_listings_owner_id ON listings(owner_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location_id ON listings(location_id);
CREATE INDEX idx_locations_district ON locations(district);

-- =====================================================
-- VIEW: Active Listings
-- =====================================================
CREATE OR REPLACE VIEW v_active_listings AS
SELECT
    l.*,
    u.name AS owner_name,
    u.email AS owner_email,
    loc.village,
    loc.district
FROM listings l
JOIN users u ON l.owner_id = u.id
JOIN locations loc ON l.location_id = loc.id
WHERE l.status = 'approved' AND l.is_active = TRUE;

-- =====================================================
-- VIEW: Subscription Overview
-- =====================================================
CREATE OR REPLACE VIEW v_subscription_overview AS
SELECT
    u.id AS user_id,
    u.name,
    u.email,
    u.phone,
    s.id AS subscription_id,
    s.status AS subscription_status,
    s.trial_end_date,
    s.subscription_end_date,
    CASE
        WHEN s.status = 'trial' THEN DATEDIFF(s.trial_end_date, NOW())
        WHEN s.status = 'active' THEN DATEDIFF(s.subscription_end_date, NOW())
        ELSE 0
    END AS days_remaining,
    (SELECT COUNT(*) FROM listings WHERE owner_id = u.id) AS total_listings,
    (SELECT COUNT(*) FROM listings WHERE owner_id = u.id AND is_active = TRUE) AS active_listings
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.role = 'owner';

-- =====================================================
-- TRIGGER: Auto-create subscription for new user
-- =====================================================
DELIMITER //
CREATE TRIGGER IF NOT EXISTS trg_after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO subscriptions (user_id, status, trial_start_date, trial_end_date)
    VALUES (NEW.id, 'trial', NOW(), NOW() + INTERVAL 14 DAY);
END//
DELIMITER ;

-- =====================================================
-- SEED DATA: Locations (75 locations across 11 districts in Ende NTT)
-- =====================================================
INSERT INTO locations (village, district) VALUES
-- Ende (Kecamatan Ende)
('Kelapa Lima', 'Ende'),
('Onekore', 'Ende'),
('Paupire', 'Ende'),
('Kotu', 'Ende'),
('Maukaro', 'Ende'),
('Wolowaru', 'Ende'),
('Ngkodokonda', 'Ende'),
('Raterua', 'Ende'),
-- Ende Selatan
('Tetandara', 'Ende Selatan'),
('Ndungga', 'Ende Selatan'),
('Tinowutu', 'Ende Selatan'),
('Embundunga', 'Ende Selatan'),
('Kedebodu', 'Ende Selatan'),
('Loi', 'Ende Selatan'),
-- Ende Tengah
('Rukuramba', 'Ende Tengah'),
('Mbongawani', 'Ende Tengah'),
('Selutura', 'Ende Tengah'),
('Ndetundora', 'Ende Tengah'),
('Wee Wella', 'Ende Tengah'),
('Wee Kambala', 'Ende Tengah'),
-- Ende Timur
('Rewarangga', 'Ende Timur'),
('Ndori', 'Ende Timur'),
('Kojadoi', 'Ende Timur'),
('Kojagete', 'Ende Timur'),
('Mbuliwaralau', 'Ende Timur'),
('Waiara', 'Ende Timur'),
-- Ende Utara
('Wee Karou', 'Ende Utara'),
('Kota Raja', 'Ende Utara'),
('Kota Ratu', 'Ende Utara'),
('Maurole', 'Ende Utara'),
('Numba', 'Ende Utara'),
('Maukeli', 'Ende Utara'),
-- Ndona
('Nanganesa', 'Ndona'),
('Wolotopo', 'Ndona'),
('Ndetundora I', 'Ndona'),
('Ndetundora II', 'Ndona'),
('Wolokota', 'Ndona'),
('Embundunga', 'Ndona'),
-- Detusoko
('Detusoko', 'Detusoko'),
('Kampung Baru', 'Detusoko'),
('Kampung Lama', 'Detusoko'),
('Wolokoli', 'Detusoko'),
('Nggela', 'Detusoko'),
('Wolomage', 'Detusoko'),
-- Wewaria
('Wewaria', 'Wewaria'),
('Jopu', 'Wewaria'),
('Mausambi', 'Wewaria'),
('Niora', 'Wewaria'),
('Bheramari', 'Wewaria'),
('Wolowiro', 'Wewaria'),
-- Lio Timur
('Watuneso', 'Lio Timur'),
('Wolowona', 'Lio Timur'),
('Mbuliwaralau', 'Lio Timur'),
('Kojadoi', 'Lio Timur'),
('Kojagete', 'Lio Timur'),
('Ndori', 'Lio Timur'),
-- Wolowaru
('Wolowaru', 'Wolowaru'),
('Raterua', 'Wolowaru'),
('Ngkodokonda', 'Wolowaru'),
('Maukaro', 'Wolowaru'),
('Kotu', 'Wolowaru'),
('Paupire', 'Wolowaru'),
-- Kelimutu
('Kelimutu', 'Kelimutu'),
('Ndungga', 'Kelimutu'),
('Tetandara', 'Kelimutu'),
('Tinowutu', 'Kelimutu'),
('Embundunga', 'Kelimutu'),
('Loi', 'Kelimutu');

-- =====================================================
-- SEED DATA: Admin User (password: admin123)
-- Password hash generated with bcrypt
-- =====================================================
INSERT INTO users (name, email, password_hash, phone, role) VALUES
('Admin Web Kos', 'admin@webkos.com', '$2a$12$LJ3m4ys3Lk8nFgQOIc/MNOxHBMGxPJsGK5bS8YjK3V0mPZK1Z7GqO', '081234567890', 'admin');
