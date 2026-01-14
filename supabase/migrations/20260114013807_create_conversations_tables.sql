-- Phase 1.5: Conversations Tables Migration
-- Creates conversations and conversation_messages tables for the chat-style interface

-- ============================================================================
-- A. Create conversations table
-- ============================================================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
  title TEXT,  -- Auto-generated from first transcript summary
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations (using optimized subquery pattern)
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING ((SELECT auth.uid()) = practitioner_id);

CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = practitioner_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING ((SELECT auth.uid()) = practitioner_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE USING ((SELECT auth.uid()) = practitioner_id);

-- Indexes
CREATE INDEX idx_conversations_practitioner_id ON public.conversations(practitioner_id, created_at DESC);
CREATE INDEX idx_conversations_archived ON public.conversations(practitioner_id, is_archived, updated_at DESC);

-- Updated at trigger
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- B. Create conversation_messages table
-- ============================================================================

CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  participant_type TEXT NOT NULL,  -- practitioner, transcription_ai, suggestions_ai, summary_ai, system
  message_type TEXT NOT NULL,      -- recording_upload, transcription_result, suggestion, summary, user_edit, accepted_suggestion, status_update
  content TEXT,                    -- Primary text content
  metadata JSONB DEFAULT '{}' NOT NULL,  -- Type-specific data
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT valid_participant_type CHECK (participant_type IN ('practitioner', 'transcription_ai', 'suggestions_ai', 'summary_ai', 'system')),
  CONSTRAINT valid_message_type CHECK (message_type IN ('recording_upload', 'transcription_result', 'suggestion', 'summary', 'user_edit', 'accepted_suggestion', 'status_update'))
);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversation_messages (access via conversation ownership)
CREATE POLICY "Users can view messages in own conversations" ON public.conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.practitioner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in own conversations" ON public.conversation_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.practitioner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update messages in own conversations" ON public.conversation_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.practitioner_id = (SELECT auth.uid())
    )
  );

-- Indexes for efficient queries
CREATE INDEX idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id, created_at);
CREATE INDEX idx_conversation_messages_type ON public.conversation_messages(conversation_id, message_type);

-- ============================================================================
-- C. Add conversation_id to recordings table
-- ============================================================================

ALTER TABLE public.recordings
  ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX idx_recordings_conversation_id ON public.recordings(conversation_id);

-- ============================================================================
-- D. Enable realtime for conversation tables
-- ============================================================================

-- Enable realtime for conversations (for title updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Enable realtime for conversation_messages (for live message updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
