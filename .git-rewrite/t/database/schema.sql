-- =====================================================
-- Database Schema: Web Kos Kosan
-- Platform manajemen listing kos dengan sistem trial,
-- subscription, dan approval admin.
-- Lokasi: Ende, NTT
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'viewer');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled');
CREATE TYPE listing_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected');

-- =====================================================
-- TABEL USERS
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABEL SUBSCRIPTIONS
-- =====================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status subscription_status NOT NULL DEFAULT 'trial',
    trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABEL PAYMENTS
-- =====================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50),
    proof_url VARCHAR(500),
    status payment_status NOT NULL DEFAULT 'pending',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABEL LOCATIONS (Valid area Ende, NTT)
-- =====================================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    village VARCHAR(100) NOT NULL,        -- Desa/Kelurahan
    district VARCHAR(100) NOT NULL,       -- Kecamatan
    city VARCHAR(100) NOT NULL DEFAULT 'Ende',
    province VARCHAR(100) NOT NULL DEFAULT 'Nusa Tenggara Timur',
    postal_code VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert valid areas in Ende, NTT
INSERT INTO locations (village, district, city, province, postal_code) VALUES
('Kelapa Lima', 'Ende', 'Ende', 'Nusa Tenggara Timur', '86318'),
('Paupanda', 'Ende', 'Ende', 'Nusa Tenggara Timur', '86318'),
('Onekore', 'Ende', 'Ende', 'Nusa Tenggara Timur', '86318'),
('Maurole', 'Ende Selatan', 'Ende', 'Nusa Tenggara Timur', '86313'),
('Mbongawani', 'Ende Timur', 'Ende', 'Nusa Tenggara Timur', '86362'),
('Rukuramba', 'Ende Utara', 'Ende', 'Nusa Tenggara Timur', '86312'),
('Tetandara', 'Ende Tengah', 'Ende', 'Nusa Tenggara Timur', '86319'),
('Ndona', 'Ende Timur', 'Ende', 'Nusa Tenggara Timur', '86362'),
('Wolowaru', 'Ende Selatan', 'Ende', 'Nusa Tenggara Timur', '86313'),
('Kota Raja', 'Ende', 'Ende', 'Nusa Tenggara Timur', '86318'),
('Kota Ratu', 'Ende', 'Ende', 'Nusa Tenggara Timur', '86318'),
('Mbomba', 'Ende Utara', 'Ende', 'Nusa Tenggara Timur', '86312'),
('Raterua', 'Ende Tengah', 'Ende', 'Nusa Tenggara Timur', '86319'),
('Wee Wella', 'Ende Timur', 'Ende', 'Nusa Tenggara Timur', '86362'),
('Poto', 'Ende Selatan', 'Ende', 'Nusa Tenggara Timur', '86313');

-- =====================================================
-- TABEL LISTINGS (Kos)
-- =====================================================
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    price_monthly DECIMAL(12, 2) NOT NULL,
    deposit DECIMAL(12, 2) DEFAULT 0,
    room_size VARCHAR(50),                  -- contoh: "3x4 meter"
    facilities JSONB DEFAULT '[]'::jsonb,   -- ["AC", "WiFi", "Kamar Mandi Dalam"]
    images JSONB DEFAULT '[]'::jsonb,       -- array of image URLs
    status listing_status NOT NULL DEFAULT 'pending',
    is_active BOOLEAN NOT NULL DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABEL ACTIVITY LOGS
-- =====================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,       -- 'listing', 'subscription', 'payment'
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end_date);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(subscription_end_date);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_listings_owner_id ON listings(owner_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location_id ON listings(location_id);
CREATE INDEX idx_listings_is_active ON listings(is_active);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create subscription on user registration
-- =====================================================
CREATE OR REPLACE FUNCTION create_subscription_on_user_registration()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (user_id, status, trial_start_date, trial_end_date)
    VALUES (
        NEW.id,
        'trial',
        NOW(),
        NOW() + INTERVAL '14 days'
    );

    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (
        NEW.id,
        'subscription_created',
        'subscription',
        NEW.id,
        jsonb_build_object('status', 'trial', 'trial_end_date', NOW() + INTERVAL '14 days')
    );

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_create_subscription_on_registration
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_subscription_on_user_registration();

-- =====================================================
-- FUNCTION: Check and expire subscriptions
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_expire_subscriptions()
RETURNS void AS $$
DECLARE
    expired_sub RECORD;
BEGIN
    -- Find subscriptions where trial/subscription has ended
    FOR expired_sub IN
        SELECT s.id, s.user_id, s.status
        FROM subscriptions s
        WHERE s.status IN ('trial', 'active')
          AND s.trial_end_date < NOW()
    LOOP
        -- Update subscription status to expired
        UPDATE subscriptions
        SET status = 'expired',
            updated_at = NOW()
        WHERE id = expired_sub.id;

        -- Deactivate all listings belonging to this user
        UPDATE listings
        SET is_active = false,
            status = 'inactive',
            updated_at = NOW()
        WHERE owner_id = expired_sub.user_id;

        -- Log the expiration
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES (
            expired_sub.user_id,
            'subscription_expired',
            'subscription',
            expired_sub.id,
            jsonb_build_object('previous_status', expired_sub.status)
        );
    END LOOP;
END;
$$ language 'plpgsql';

-- =====================================================
-- VIEW: Active listings with owner info
-- =====================================================
CREATE VIEW v_active_listings AS
SELECT
    l.id,
    l.title,
    l.description,
    l.address,
    l.price_monthly,
    l.facilities,
    l.images,
    l.status,
    l.is_active,
    l.created_at,
    u.id AS owner_id,
    u.name AS owner_name,
    u.email AS owner_email,
    u.phone AS owner_phone,
    loc.village,
    loc.district,
    loc.city,
    loc.province
FROM listings l
JOIN users u ON l.owner_id = u.id
LEFT JOIN locations loc ON l.location_id = loc.id
WHERE l.is_active = true AND l.status = 'approved';

-- =====================================================
-- VIEW: Subscription status overview
-- =====================================================
CREATE VIEW v_subscription_overview AS
SELECT
    u.id AS user_id,
    u.name,
    u.email,
    u.phone,
    s.id AS subscription_id,
    s.status AS subscription_status,
    s.trial_start_date,
    s.trial_end_date,
    s.subscription_start_date,
    s.subscription_end_date,
    CASE
        WHEN s.status = 'trial' AND s.trial_end_date > NOW()
            THEN EXTRACT(DAY FROM (s.trial_end_date - NOW()))::INTEGER
        WHEN s.status = 'active' AND s.subscription_end_date > NOW()
            THEN EXTRACT(DAY FROM (s.subscription_end_date - NOW()))::INTEGER
        ELSE 0
    END AS days_remaining,
    (SELECT COUNT(*) FROM listings WHERE owner_id = u.id) AS total_listings,
    (SELECT COUNT(*) FROM listings WHERE owner_id = u.id AND is_active = true) AS active_listings
FROM users u
JOIN subscriptions s ON u.id = s.user_id
WHERE u.role = 'owner';
