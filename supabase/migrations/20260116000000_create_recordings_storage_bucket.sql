-- Create recordings storage bucket for audio files
-- Supports TUS resumable uploads

-- =============================================================================
-- 1. Create Storage Bucket
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,  -- Private bucket (requires authentication)
  104857600,  -- 100MB limit per file
  ARRAY['audio/aac', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav']
);

-- =============================================================================
-- 2. RLS Policies for Storage
-- =============================================================================

-- Upload policy: Users can upload to their own folder ({uid}/*)
CREATE POLICY "recordings_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- Read policy: Users can read their own recordings
CREATE POLICY "recordings_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- Update policy: Users can update their own recordings
CREATE POLICY "recordings_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'recordings' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- Delete policy: Users can delete their own recordings
CREATE POLICY "recordings_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'recordings' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- Service role can read all recordings (for edge functions/transcription)
CREATE POLICY "recordings_service_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND
    auth.role() = 'service_role'
  );

-- =============================================================================
-- 3. Update recordings table status constraint
-- =============================================================================

-- Drop existing constraint
ALTER TABLE public.recordings
  DROP CONSTRAINT IF EXISTS valid_status;

-- Add updated constraint with new statuses
ALTER TABLE public.recordings
  ADD CONSTRAINT valid_status CHECK (
    status IN (
      'pending',          -- Initial state
      'uploading',        -- TUS upload in progress
      'uploaded',         -- File uploaded, awaiting processing
      'pending_credits',  -- Waiting for credits
      'processing',       -- Being transcribed
      'completed',        -- Fully processed
      'failed'            -- Error occurred
    )
  );

-- =============================================================================
-- 4. Add storage_path column if not exists
-- =============================================================================

-- storage_path stores the path in Supabase Storage (e.g., "{uid}/{timestamp}.aac")
-- This is separate from audio_path which may have been used differently before
ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Index for efficient lookups by storage path
CREATE INDEX IF NOT EXISTS idx_recordings_storage_path
  ON public.recordings(storage_path)
  WHERE storage_path IS NOT NULL;
