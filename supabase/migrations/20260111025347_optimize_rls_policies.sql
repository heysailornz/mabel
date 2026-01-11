-- Optimize RLS policies by wrapping auth.uid() in a subquery
-- This evaluates auth.uid() once per query instead of per row

-- ============================================================================
-- practitioners
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own practitioner record" ON public.practitioners;
DROP POLICY IF EXISTS "Users can update own practitioner record" ON public.practitioners;
DROP POLICY IF EXISTS "Users can insert own practitioner record" ON public.practitioners;

CREATE POLICY "Users can view own practitioner record" ON public.practitioners
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own practitioner record" ON public.practitioners
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own practitioner record" ON public.practitioners
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- recordings
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON public.recordings;

CREATE POLICY "Users can view own recordings" ON public.recordings
  FOR SELECT USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "Users can insert own recordings" ON public.recordings
  FOR INSERT WITH CHECK ((select auth.uid()) = practitioner_id);

CREATE POLICY "Users can update own recordings" ON public.recordings
  FOR UPDATE USING ((select auth.uid()) = practitioner_id);

-- ============================================================================
-- transcripts
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can update own transcripts" ON public.transcripts;

CREATE POLICY "Users can view own transcripts" ON public.transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.practitioner_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own transcripts" ON public.transcripts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recordings r
      WHERE r.id = recording_id AND r.practitioner_id = (select auth.uid())
    )
  );

-- ============================================================================
-- vocabulary
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own vocabulary" ON public.vocabulary;
DROP POLICY IF EXISTS "Users can insert own vocabulary" ON public.vocabulary;
DROP POLICY IF EXISTS "Users can update own vocabulary" ON public.vocabulary;
DROP POLICY IF EXISTS "Users can delete own vocabulary" ON public.vocabulary;

CREATE POLICY "Users can view own vocabulary" ON public.vocabulary
  FOR SELECT USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "Users can insert own vocabulary" ON public.vocabulary
  FOR INSERT WITH CHECK ((select auth.uid()) = practitioner_id);

CREATE POLICY "Users can update own vocabulary" ON public.vocabulary
  FOR UPDATE USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "Users can delete own vocabulary" ON public.vocabulary
  FOR DELETE USING ((select auth.uid()) = practitioner_id);

-- ============================================================================
-- web_sessions
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own web sessions" ON public.web_sessions;
DROP POLICY IF EXISTS "Anyone can create pending session" ON public.web_sessions;
DROP POLICY IF EXISTS "Authenticated users can claim sessions" ON public.web_sessions;

CREATE POLICY "Users can view own web sessions" ON public.web_sessions
  FOR SELECT USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "Anyone can create pending session" ON public.web_sessions
  FOR INSERT WITH CHECK (status = 'pending' AND practitioner_id IS NULL);

CREATE POLICY "Authenticated users can claim sessions" ON public.web_sessions
  FOR UPDATE USING (
    status = 'pending'
    AND expires_at > NOW()
  );

-- ============================================================================
-- credit_transactions
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING ((select auth.uid()) = practitioner_id);
