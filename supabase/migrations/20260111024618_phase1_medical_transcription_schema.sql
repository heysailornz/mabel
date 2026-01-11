-- Phase 1: Medical Transcription Schema Migration
-- Renames profiles → practitioners and adds all required tables

-- ============================================================================
-- A. Rename profiles → practitioners & add columns
-- ============================================================================

-- Rename table
ALTER TABLE public.profiles RENAME TO practitioners;

-- Add new columns
ALTER TABLE public.practitioners
  ADD COLUMN email TEXT UNIQUE,
  ADD COLUMN credits INTEGER DEFAULT 5 NOT NULL;

-- Backfill email from auth.users for existing rows
UPDATE public.practitioners p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- Make email NOT NULL after backfill
ALTER TABLE public.practitioners ALTER COLUMN email SET NOT NULL;

-- ============================================================================
-- B. Update existing trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.practitioners (id, email, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    5  -- signup bonus
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- C. Update RLS policies (rename references)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.practitioners;

CREATE POLICY "Users can view own practitioner record" ON public.practitioners
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own practitioner record" ON public.practitioners
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own practitioner record" ON public.practitioners
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- D. Create recordings table
-- ============================================================================

CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'pending_credits', 'processing', 'completed', 'failed'))
);

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recordings" ON public.recordings
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can insert own recordings" ON public.recordings
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Users can update own recordings" ON public.recordings
  FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE INDEX idx_recordings_practitioner_id ON public.recordings(practitioner_id);
CREATE INDEX idx_recordings_status ON public.recordings(status);

-- ============================================================================
-- E. Create transcripts table
-- ============================================================================

CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE NOT NULL,
  raw_text TEXT,
  enhanced_text TEXT,
  edited_text TEXT,
  summary TEXT,
  suggestions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcripts" ON public.transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.practitioner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transcripts" ON public.transcripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.practitioner_id = auth.uid()
    )
  );

CREATE INDEX idx_transcripts_recording_id ON public.transcripts(recording_id);

CREATE TRIGGER set_transcripts_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- F. Create vocabulary table
-- ============================================================================

CREATE TABLE public.vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
  original_term TEXT NOT NULL,
  corrected_term TEXT NOT NULL,
  frequency INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(practitioner_id, original_term)
);

ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vocabulary" ON public.vocabulary
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can insert own vocabulary" ON public.vocabulary
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Users can update own vocabulary" ON public.vocabulary
  FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Users can delete own vocabulary" ON public.vocabulary
  FOR DELETE USING (auth.uid() = practitioner_id);

CREATE INDEX idx_vocabulary_practitioner_id ON public.vocabulary(practitioner_id);

-- ============================================================================
-- G. Create web_sessions table
-- ============================================================================

CREATE TABLE public.web_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_session_status CHECK (status IN ('pending', 'authenticated', 'expired'))
);

ALTER TABLE public.web_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own web sessions" ON public.web_sessions
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Anyone can create pending session" ON public.web_sessions
  FOR INSERT WITH CHECK (status = 'pending' AND practitioner_id IS NULL);

CREATE POLICY "Authenticated users can claim sessions" ON public.web_sessions
  FOR UPDATE USING (
    status = 'pending'
    AND expires_at > NOW()
  );

CREATE INDEX idx_web_sessions_token ON public.web_sessions(token);
CREATE INDEX idx_web_sessions_expires_at ON public.web_sessions(expires_at);

-- ============================================================================
-- H. Create credit_transactions table
-- ============================================================================

CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  recording_id UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_transaction_type CHECK (type IN ('signup_bonus', 'purchase', 'transcription', 'refund'))
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE INDEX idx_credit_transactions_practitioner ON public.credit_transactions(practitioner_id, created_at DESC);

-- ============================================================================
-- I. Create credit management functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_credits(
  p_practitioner_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_recording_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
    stripe_checkout_session_id, recording_id, notes
  ) VALUES (
    p_practitioner_id, p_amount, new_balance, p_type,
    p_stripe_session_id, p_recording_id, p_notes
  );

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.use_credit(
  p_practitioner_id UUID,
  p_recording_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  UPDATE public.practitioners
  SET credits = credits - 1
  WHERE id = p_practitioner_id AND credits > 0
  RETURNING credits INTO current_credits;

  IF current_credits IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.credit_transactions (
    practitioner_id, amount, balance_after, type, recording_id
  ) VALUES (
    p_practitioner_id, -1, current_credits, 'transcription', p_recording_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.refund_credit(
  p_practitioner_id UUID,
  p_recording_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN public.add_credits(
    p_practitioner_id, 1, 'refund', NULL, p_recording_id, 'Automatic refund for failed transcription'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
