-- Migration 001: Initial schema — profiles, listings, listing_images, favorites
-- Sprint 0 Phase 3

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tables
-- ============================================================

-- profiles: auto-created via trigger on auth.users insert
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  university TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES profiles NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  size TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('new','like_new','good','fair')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES listings ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles NOT NULL,
  listing_id UUID REFERENCES listings NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Profile auto-creation trigger
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS Policies: profiles
-- ============================================================

-- Any authenticated user can read any profile
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert handled by trigger (SECURITY DEFINER), no direct insert policy needed

-- ============================================================
-- RLS Policies: listings
-- ============================================================

-- Any authenticated user can view active listings
CREATE POLICY "listings_select_active"
  ON listings FOR SELECT
  TO authenticated
  USING (status = 'active' OR auth.uid() = seller_id);

-- Sellers can insert their own listings
CREATE POLICY "listings_insert_own"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "listings_update_own"
  ON listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own listings
CREATE POLICY "listings_delete_own"
  ON listings FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- ============================================================
-- RLS Policies: listing_images
-- ============================================================

-- Any authenticated user can view listing images
CREATE POLICY "listing_images_select_authenticated"
  ON listing_images FOR SELECT
  TO authenticated
  USING (true);

-- Seller can insert images for their own listings
CREATE POLICY "listing_images_insert_own"
  ON listing_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_id
        AND listings.seller_id = auth.uid()
    )
  );

-- Seller can update images for their own listings
CREATE POLICY "listing_images_update_own"
  ON listing_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_id
        AND listings.seller_id = auth.uid()
    )
  );

-- Seller can delete images for their own listings
CREATE POLICY "listing_images_delete_own"
  ON listing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_id
        AND listings.seller_id = auth.uid()
    )
  );

-- ============================================================
-- RLS Policies: favorites
-- ============================================================

-- Users can view their own favorites
CREATE POLICY "favorites_select_own"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "favorites_insert_own"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "favorites_delete_own"
  ON favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
