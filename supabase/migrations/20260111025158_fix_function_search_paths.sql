-- Fix mutable search_path on SECURITY DEFINER functions
-- This prevents potential search_path hijacking attacks

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.practitioners (id, email, full_name, avatar_url, credits)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.refund_credit(
  p_practitioner_id UUID,
  p_recording_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN public.add_credits(
    p_practitioner_id, 1, 'refund', NULL, p_recording_id, 'Automatic refund for failed transcription'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
