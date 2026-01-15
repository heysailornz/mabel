# Database Schema

Complete PostgreSQL schema for Supabase backend.

## Architecture Note: Skills and Future-Proofing

The database schema is designed to support multiple "skills" (transcription, image analysis, etc.) through a unified input/artifact model. See [skills.md](./skills.md) for the skill architecture.

**Key abstractions:**
- `user_inputs` - Tracks all user inputs (audio, text, images, documents)
- `artifacts` - Unified output from any skill (replaces transcript-specific model)
- Skills are defined in code initially, not database (may add `skills` table later)

## Tables

### practitioners

Extends auth.users with profile data.

```sql
create table practitioners (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  credits integer default 5 not null,  -- Free credits on signup
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### recordings

Audio file storage and upload tracking. Links to `user_inputs` for processing.

```sql
create table recordings (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  conversation_id uuid references conversations(id),  -- Links to conversation thread
  audio_path text not null,
  duration_seconds integer,
  file_size_bytes bigint,
  mime_type text default 'audio/aac',
  status text default 'pending', -- pending, pending_credits, processing, completed, failed
  created_at timestamptz default now()
);
```

### user_inputs

Unified tracking for all user inputs (audio, text, image, document). This is the source table that feeds into skill processing.

```sql
create table user_inputs (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  conversation_id uuid references conversations(id) not null,

  -- Input type and source
  input_type text not null,                  -- 'audio', 'text', 'image', 'document'
  recording_id uuid references recordings(id),  -- For audio inputs
  storage_path text,                         -- For image/document inputs
  raw_content text,                          -- For text inputs (or extracted text)

  -- Classification result (from unified classifier)
  classification jsonb,
  /*
    {
      "skillId": "transcription",
      "intent": "new_artifact" | "enrich_existing" | "instruction" | "question",
      "confidence": 0.95,
      "reasoning": "...",
      "targetArtifactId": "uuid or null",
      "suggestedAction": "add_content"
    }
  */

  -- Processing state
  status text default 'received' not null,   -- received, classifying, processing, completed, failed
  error_message text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_user_inputs_conversation on user_inputs(conversation_id, created_at desc);
create index idx_user_inputs_practitioner on user_inputs(practitioner_id, created_at desc);
create index idx_user_inputs_type on user_inputs(input_type);
```

### artifacts

Unified output from any skill. Replaces the transcript-specific model to support future skills (X-ray analysis, VBG, etc.).

```sql
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  conversation_id uuid references conversations(id) not null,

  -- Source tracking
  skill_id text not null,                    -- 'transcription', 'xray_analysis', etc.
  source_input_id uuid references user_inputs(id) not null,

  -- Artifact type and content
  artifact_type text not null,               -- 'transcript', 'xray_analysis', 'vbg_analysis'
  content jsonb not null,                    -- Skill-specific structured content
  raw_content text,                          -- Original unprocessed content (if applicable)

  -- Display
  summary text,                              -- One-sentence summary for list display
  title text,                                -- Optional title

  -- AI assistance
  suggestions jsonb default '[]',            -- AI-generated suggestions

  -- Cross-artifact references
  references jsonb default '[]',             -- Links to related artifacts
  /*
    [
      {
        "artifactId": "uuid",
        "artifactType": "xray_analysis",
        "referenceType": "supports",
        "addedAt": "2024-01-15T10:00:00Z"
      }
    ]
  */

  -- State
  status text default 'processing' not null, -- processing, ready, failed
  version integer default 1 not null,
  is_edited boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_artifacts_conversation on artifacts(conversation_id, created_at desc);
create index idx_artifacts_skill on artifacts(skill_id);
create index idx_artifacts_type on artifacts(artifact_type);
create index idx_artifacts_source on artifacts(source_input_id);
```

**Transcript content schema (artifact_type = 'transcript'):**
```json
{
  "text": "Original text...",
  "enhancedText": "After vocabulary corrections...",
  "editedText": "After user edits (optional)...",
  "sourceType": "audio | text",
  "durationSeconds": 180,
  "wordCount": 450,
  "confidence": 0.94,
  "sections": {
    "chiefComplaint": "...",
    "historyOfPresentIllness": "...",
    "examination": "...",
    "assessment": "...",
    "plan": "..."
  }
}
```

**X-ray analysis content schema (artifact_type = 'xray_analysis'):**
```json
{
  "imageUrl": "storage://...",
  "viewType": "PA | lateral | AP",
  "findings": [
    {
      "region": "right_lower_lobe",
      "finding": "consolidation",
      "severity": "moderate",
      "confidence": 0.87,
      "description": "..."
    }
  ],
  "impression": "...",
  "recommendations": ["..."],
  "imageQuality": "good | adequate | limited"
}
```

See [artifacts.md](./artifacts.md) for complete content schemas for all artifact types.

### vocabulary

Custom vocabulary per practitioner for transcription corrections.

```sql
create table vocabulary (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  original_term text not null,  -- What transcription API produces
  corrected_term text not null, -- What practitioner corrects it to
  frequency integer default 1,
  created_at timestamptz default now(),
  UNIQUE(practitioner_id, original_term)
);
```

### web_sessions

QR code login sessions.

```sql
create table web_sessions (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id),
  token text unique not null,
  status text default 'pending', -- pending, authenticated, expired
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
```

### credit_transactions

Audit trail for all credit changes.

```sql
create table credit_transactions (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  amount integer not null,              -- +10 for purchase, -1 for use, +1 for refund
  balance_after integer not null,       -- Running balance after transaction
  type text not null,                   -- 'signup_bonus', 'purchase', 'skill_usage', 'refund'
  skill_id text,                        -- Which skill used credits (for skill_usage type)
  stripe_checkout_session_id text,      -- For purchases
  stripe_payment_intent_id text,        -- For purchases
  user_input_id uuid references user_inputs(id),  -- For skill_usage/refund
  artifact_id uuid references artifacts(id),      -- Resulting artifact (if any)
  notes text,
  created_at timestamptz default now()
);

create index idx_credit_transactions_practitioner
  on credit_transactions(practitioner_id, created_at desc);
create index idx_credit_transactions_skill on credit_transactions(skill_id);
```

### conversations

Groups recordings and messages into threads.

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  title text,  -- Auto-generated from first transcript summary
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_conversations_practitioner on conversations(practitioner_id, created_at desc);
```

### conversation_messages

All entries in a conversation thread.

```sql
create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  participant_type text not null,  -- practitioner, transcription_ai, suggestions_ai, summary_ai, system
  message_type text not null,      -- recording_upload, transcription_result, suggestion, summary, user_edit, etc.
  content text,                    -- Primary text content
  metadata jsonb default '{}',     -- Type-specific data (recording_id, suggestion details, etc.)
  created_at timestamptz default now()
);

create index idx_conversation_messages_conversation on conversation_messages(conversation_id, created_at);
```

## Row Level Security

### Basic RLS Pattern

Always enable RLS on all tables:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

**Performance optimization:** Wrap `auth.uid()` in a subquery to evaluate once per query:

```sql
-- Bad: auth.uid() evaluated for every row
CREATE POLICY "bad_policy" ON posts
  FOR SELECT USING (auth.uid() = author_id);

-- Good: auth.uid() evaluated once per query
CREATE POLICY "good_policy" ON posts
  FOR SELECT USING ((select auth.uid()) = author_id);
```

### Practitioner Policies

```sql
-- Practitioners can only see/modify their own data
CREATE POLICY "practitioners_own_data" ON practitioners
  FOR ALL USING ((select auth.uid()) = id);

CREATE POLICY "recordings_own_data" ON recordings
  FOR ALL USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "user_inputs_own_data" ON user_inputs
  FOR ALL USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "artifacts_own_data" ON artifacts
  FOR ALL USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "vocabulary_own_data" ON vocabulary
  FOR ALL USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "conversations_own_data" ON conversations
  FOR ALL USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "messages_via_conversations" ON conversation_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE practitioner_id = (select auth.uid())
    )
  );

CREATE POLICY "credit_transactions_own_data" ON credit_transactions
  FOR ALL USING ((select auth.uid()) = practitioner_id);
```

### Web Sessions Policies

```sql
-- Practitioners can view their own sessions
CREATE POLICY "web_sessions_own_view" ON web_sessions
  FOR SELECT USING ((select auth.uid()) = practitioner_id);

-- Anyone can view pending sessions by token (for QR scan)
CREATE POLICY "web_sessions_pending_view" ON web_sessions
  FOR SELECT USING (status = 'pending');
```

## Database Functions

### Credit Management

```sql
-- Add credits atomically
create or replace function add_credits(
  p_practitioner_id uuid,
  p_amount integer,
  p_type text,
  p_stripe_session_id text default null,
  p_user_input_id uuid default null,
  p_skill_id text default null
) returns integer as $$
declare
  new_balance integer;
begin
  update practitioners
  set credits = credits + p_amount
  where id = p_practitioner_id
  returning credits into new_balance;

  insert into credit_transactions (
    practitioner_id, amount, balance_after, type,
    stripe_checkout_session_id, user_input_id, skill_id
  ) values (
    p_practitioner_id, p_amount, new_balance, p_type,
    p_stripe_session_id, p_user_input_id, p_skill_id
  );

  return new_balance;
end;
$$ language plpgsql security definer set search_path = '';

-- Use credits for skill processing (supports variable credit costs)
create or replace function use_skill_credits(
  p_practitioner_id uuid,
  p_user_input_id uuid,
  p_skill_id text,
  p_credit_cost integer default 1
) returns boolean as $$
declare
  current_credits integer;
begin
  update practitioners
  set credits = credits - p_credit_cost
  where id = p_practitioner_id and credits >= p_credit_cost
  returning credits into current_credits;

  if current_credits is null then
    return false;
  end if;

  insert into credit_transactions (
    practitioner_id, amount, balance_after, type, user_input_id, skill_id
  ) values (
    p_practitioner_id, -p_credit_cost, current_credits, 'skill_usage', p_user_input_id, p_skill_id
  );

  return true;
end;
$$ language plpgsql security definer set search_path = '';

-- Refund credits on failed processing
create or replace function refund_skill_credits(
  p_practitioner_id uuid,
  p_user_input_id uuid,
  p_skill_id text,
  p_credit_amount integer default 1
) returns integer as $$
begin
  return add_credits(
    p_practitioner_id, p_credit_amount, 'refund', null, p_user_input_id, p_skill_id
  );
end;
$$ language plpgsql security definer set search_path = '';
```

### SECURITY DEFINER Functions

Always set an empty `search_path` to prevent search_path hijacking:

```sql
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS void AS $$
BEGIN
  -- function body
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

## Storage Buckets

```sql
-- Recordings bucket for audio files (private, RLS protected)
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false);

-- User uploads bucket for images and documents (private, RLS protected)
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false);

-- RLS for recordings bucket
CREATE POLICY "recordings_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "recordings_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- RLS for uploads bucket (images, documents)
CREATE POLICY "uploads_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "uploads_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND
    (select auth.uid())::text = (storage.foldername(name))[1]
  );
```

## Triggers

### Updated Timestamp

```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger practitioners_updated_at
  before update on practitioners
  for each row execute function update_updated_at();

create trigger user_inputs_updated_at
  before update on user_inputs
  for each row execute function update_updated_at();

create trigger artifacts_updated_at
  before update on artifacts
  for each row execute function update_updated_at();

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();
```

## Related Specs

- [skills.md](./skills.md) - Skill architecture and definitions
- [artifacts.md](./artifacts.md) - Unified artifact model
- [text-entry.md](./text-entry.md) - Text entry classification and processing
- [payments.md](./payments.md) - Credit system details
- [security.md](./security.md) - RLS best practices
- [conversations.md](./conversations.md) - Message types and schemas
