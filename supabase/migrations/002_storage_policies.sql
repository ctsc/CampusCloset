-- Migration 002: Storage bucket RLS policies
-- Sprint 0 Phase 3
--
-- Prerequisites: buckets "listing-images" and "avatars" must be created
-- via the Supabase dashboard (manual task M-0.09).

-- ============================================================
-- listing-images bucket policies
-- ============================================================

-- Public read access for listing images
CREATE POLICY "listing_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'listing-images');

-- Authenticated users can upload to their own folder: {user_id}/*
CREATE POLICY "listing_images_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own uploaded images
CREATE POLICY "listing_images_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own uploaded images
CREATE POLICY "listing_images_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- avatars bucket policies
-- ============================================================

-- Public read access for avatars
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder: {user_id}/*
CREATE POLICY "avatars_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
