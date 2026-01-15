-- Phase 0.5: Skills Architecture Migration
-- Establishes the extensible skills/artifacts architecture to support future capabilities

-- ============================================================================
-- A. Rename transcripts → artifacts and add skill-related columns
-- ============================================================================

-- 1. Rename the table
ALTER TABLE public.transcripts RENAME TO artifacts;

-- 2. Rename the index
ALTER INDEX idx_transcripts_recording_id RENAME TO idx_artifacts_recording_id;

-- 3. Add practitioner_id column (needed for direct access via RLS)
ALTER TABLE public.artifacts
  ADD COLUMN practitioner_id UUID REFERENCES public.practitioners(id);

-- 4. Backfill practitioner_id from recordings
UPDATE public.artifacts a
SET practitioner_id = r.practitioner_id
FROM public.recordings r
WHERE a.recording_id = r.id;

-- 5. Make practitioner_id NOT NULL after backfill
ALTER TABLE public.artifacts ALTER COLUMN practitioner_id SET NOT NULL;

-- 6. Add conversation_id column
ALTER TABLE public.artifacts
  ADD COLUMN conversation_id UUID REFERENCES public.conversations(id);

-- 7. Backfill conversation_id from recordings (if any)
UPDATE public.artifacts a
SET conversation_id = r.conversation_id
FROM public.recordings r
WHERE a.recording_id = r.id AND r.conversation_id IS NOT NULL;

-- 8. Add skill-related columns
ALTER TABLE public.artifacts
  ADD COLUMN skill_id TEXT,
  ADD COLUMN source_input_id UUID,  -- Will reference user_inputs after it's created
  ADD COLUMN artifact_type TEXT,
  ADD COLUMN content JSONB,
  ADD COLUMN raw_content TEXT,
  ADD COLUMN title TEXT,
  ADD COLUMN "references" JSONB DEFAULT '[]',
  ADD COLUMN status TEXT DEFAULT 'ready',
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;

-- 9. Set default values for existing rows (transcripts from audio)
UPDATE public.artifacts SET
  skill_id = 'transcription',
  artifact_type = 'transcript',
  content = jsonb_build_object(
    'text', COALESCE(raw_text, ''),
    'enhancedText', COALESCE(enhanced_text, raw_text, ''),
    'editedText', edited_text,
    'sourceType', 'audio',
    'wordCount', COALESCE(array_length(regexp_split_to_array(COALESCE(enhanced_text, raw_text, ''), '\s+'), 1), 0)
  ),
  raw_content = raw_text,
  status = 'ready'
WHERE skill_id IS NULL;

-- 10. Add constraints
ALTER TABLE public.artifacts
  ADD CONSTRAINT valid_artifact_status CHECK (status IN ('processing', 'ready', 'failed'));

-- 11. Create additional indexes
CREATE INDEX idx_artifacts_practitioner ON public.artifacts(practitioner_id, created_at DESC);
CREATE INDEX idx_artifacts_conversation ON public.artifacts(conversation_id, created_at DESC);
CREATE INDEX idx_artifacts_skill ON public.artifacts(skill_id);
CREATE INDEX idx_artifacts_type ON public.artifacts(artifact_type);

-- 12. Update RLS policies (drop old, create new)
DROP POLICY IF EXISTS "Users can view own transcripts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can update own transcripts" ON public.artifacts;

CREATE POLICY "artifacts_own_data" ON public.artifacts
  FOR ALL USING ((SELECT auth.uid()) = practitioner_id);

-- 13. Update the updated_at trigger
DROP TRIGGER IF EXISTS set_transcripts_updated_at ON public.artifacts;
CREATE TRIGGER set_artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- B. Create user_inputs table
-- ============================================================================

CREATE TABLE public.user_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,

  -- Input type and source
  input_type TEXT NOT NULL,                  -- 'audio', 'text', 'image', 'document'
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  storage_path TEXT,                         -- For image/document inputs
  raw_content TEXT,                          -- For text inputs (or extracted text)

  -- Classification result (from unified classifier)
  classification JSONB,

  -- Processing state
  status TEXT DEFAULT 'received' NOT NULL,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_input_type CHECK (input_type IN ('audio', 'text', 'image', 'document')),
  CONSTRAINT valid_input_status CHECK (status IN ('received', 'classifying', 'processing', 'completed', 'failed'))
);

ALTER TABLE public.user_inputs ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "user_inputs_own_data" ON public.user_inputs
  FOR ALL USING ((SELECT auth.uid()) = practitioner_id);

-- Indexes
CREATE INDEX idx_user_inputs_conversation ON public.user_inputs(conversation_id, created_at DESC);
CREATE INDEX idx_user_inputs_practitioner ON public.user_inputs(practitioner_id, created_at DESC);
CREATE INDEX idx_user_inputs_type ON public.user_inputs(input_type);
CREATE INDEX idx_user_inputs_status ON public.user_inputs(status);

-- Updated at trigger
CREATE TRIGGER set_user_inputs_updated_at
  BEFORE UPDATE ON public.user_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- C. Add foreign key from artifacts to user_inputs
-- ============================================================================

-- Now that user_inputs exists, add the foreign key constraint
ALTER TABLE public.artifacts
  ADD CONSTRAINT fk_artifacts_source_input
  FOREIGN KEY (source_input_id) REFERENCES public.user_inputs(id) ON DELETE SET NULL;

CREATE INDEX idx_artifacts_source ON public.artifacts(source_input_id);

-- ============================================================================
-- D. Create uploads storage bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  false,
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for uploads bucket
CREATE POLICY "uploads_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "uploads_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "uploads_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'uploads' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "uploads_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND
    (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- E. Update credit_transactions table for skills
-- ============================================================================

-- Add skill_id column
ALTER TABLE public.credit_transactions
  ADD COLUMN skill_id TEXT,
  ADD COLUMN user_input_id UUID REFERENCES public.user_inputs(id) ON DELETE SET NULL,
  ADD COLUMN artifact_id UUID REFERENCES public.artifacts(id) ON DELETE SET NULL;

-- Update type constraint to include skill_usage
ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS valid_transaction_type;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT valid_transaction_type
  CHECK (type IN ('signup_bonus', 'purchase', 'transcription', 'skill_usage', 'refund'));

-- Add index for skill queries
CREATE INDEX idx_credit_transactions_skill ON public.credit_transactions(skill_id);

-- ============================================================================
-- F. Update credit management functions for skills
-- ============================================================================

-- Drop existing functions to allow parameter changes
DROP FUNCTION IF EXISTS public.add_credits(UUID, INTEGER, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.add_credits(UUID, INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.use_credit(UUID, UUID);
DROP FUNCTION IF EXISTS public.refund_credit(UUID, UUID);

-- Recreate add_credits to support skills
CREATE OR REPLACE FUNCTION public.add_credits(
  p_practitioner_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_user_input_id UUID DEFAULT NULL,
  p_skill_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE public.practitioners
  SET credits = credits + p_amount
  WHERE id = p_practitioner_id
  RETURNING credits INTO new_balance;

  INSERT INTO public.credit_transactions (
    practitioner_id, amount, balance_after, type,
    stripe_checkout_session_id, user_input_id, skill_id
  ) VALUES (
    p_practitioner_id, p_amount, new_balance, p_type,
    p_stripe_session_id, p_user_input_id, p_skill_id
  );

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create use_skill_credits function (supports variable credit costs)
CREATE OR REPLACE FUNCTION public.use_skill_credits(
  p_practitioner_id UUID,
  p_user_input_id UUID,
  p_skill_id TEXT,
  p_credit_cost INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  UPDATE public.practitioners
  SET credits = credits - p_credit_cost
  WHERE id = p_practitioner_id AND credits >= p_credit_cost
  RETURNING credits INTO current_credits;

  IF current_credits IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.credit_transactions (
    practitioner_id, amount, balance_after, type, user_input_id, skill_id
  ) VALUES (
    p_practitioner_id, -p_credit_cost, current_credits, 'skill_usage', p_user_input_id, p_skill_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create refund_skill_credits function
CREATE OR REPLACE FUNCTION public.refund_skill_credits(
  p_practitioner_id UUID,
  p_user_input_id UUID,
  p_skill_id TEXT,
  p_credit_amount INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
BEGIN
  RETURN public.add_credits(
    p_practitioner_id, p_credit_amount, 'refund', NULL, p_user_input_id, p_skill_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update existing use_credit to call use_skill_credits internally
CREATE OR REPLACE FUNCTION public.use_credit(
  p_practitioner_id UUID,
  p_recording_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_input_id UUID;
BEGIN
  -- Try to find user_input_id from recording (if exists)
  SELECT id INTO v_user_input_id
  FROM public.user_inputs
  WHERE recording_id = p_recording_id
  LIMIT 1;

  RETURN public.use_skill_credits(
    p_practitioner_id, v_user_input_id, 'transcription', 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Update refund_credit to call refund_skill_credits internally
CREATE OR REPLACE FUNCTION public.refund_credit(
  p_practitioner_id UUID,
  p_recording_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_user_input_id UUID;
BEGIN
  -- Try to find user_input_id from recording (if exists)
  SELECT id INTO v_user_input_id
  FROM public.user_inputs
  WHERE recording_id = p_recording_id
  LIMIT 1;

  RETURN public.refund_skill_credits(
    p_practitioner_id, v_user_input_id, 'transcription', 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- G. Update conversation_messages for new message types
-- ============================================================================

-- Drop the existing constraint and recreate with new types
ALTER TABLE public.conversation_messages
  DROP CONSTRAINT IF EXISTS valid_message_type;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT valid_message_type CHECK (
    message_type IN (
      -- Original types
      'recording_upload', 'transcription_result', 'suggestion', 'summary',
      'user_edit', 'accepted_suggestion', 'status_update',
      -- New generalized types for skills architecture
      'user_input',         -- Any user input (text, image, etc.)
      'artifact_created',   -- Any artifact created by a skill
      'artifact_updated',   -- Artifact was enriched/modified
      'instruction_response', -- Response to user instruction
      'clarification_request' -- AI asking for clarification
    )
  );

-- ============================================================================
-- H. Enable realtime for new tables
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_inputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.artifacts;
