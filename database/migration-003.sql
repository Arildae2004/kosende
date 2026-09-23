-- =====================================================
-- Migration 003: aturan kos, ketersediaan kamar & payment gateway
-- Idempotent: aman dijalankan berulang (dipakai Railway)
-- =====================================================

-- 1. Kolom baru di listings untuk aturan & ketersediaan
ALTER TABLE listings ADD COLUMN IF NOT EXISTS kos_rules TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS available_rooms INTEGER DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS electricity VARCHAR(50);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS water_source VARCHAR(50);

-- 2. Kolom baru di payments untuk payment gateway (Midtrans/Xendit)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(20) DEFAULT 'manual';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_payload JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_listings_available ON listings(available_rooms);

-- 3. Pastikan kolom peta & tipe kos ada (penguat migration-002 bila dilewati)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS kos_type VARCHAR(20) DEFAULT 'campur';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS maps_url VARCHAR(500);
