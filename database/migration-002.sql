-- =====================================================
-- Migration 002: tipe kos, koordinat peta, ulasan & rating
-- Idempotent: aman dijalankan berulang (dipakai Railway)
-- =====================================================

-- 1. Kolom baru di listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS kos_type VARCHAR(20) DEFAULT 'campur';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS maps_url VARCHAR(500);

-- 2. Constraint tipe kos (dibuat hanya jika belum ada)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_listings_kos_type') THEN
        ALTER TABLE listings ADD CONSTRAINT chk_listings_kos_type
            CHECK (kos_type IN ('putra', 'putri', 'campur', 'pasutri'));
    END IF;
END $$;

-- 3. Tabel reviews (ulasan & rating penghuni)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_name VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- 4. Index untuk filter baru
CREATE INDEX IF NOT EXISTS idx_listings_kos_type ON listings(kos_type);
