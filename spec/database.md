# Database Schema

Complete PostgreSQL schema for Supabase backend.

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

Audio recordings with processing status.

```sql
create table recordings (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  conversation_id uuid references conversations(id),  -- Links to conversation thread
  audio_path text not null,
  duration_seconds integer,
  status text default 'pending', -- pending, pending_credits, processing, completed, failed
  created_at timestamptz default now()
);
```

### transcripts

Transcription results with versions.

```sql
create table transcripts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid references recordings(id) not null,
  raw_text text,              -- Original from transcription API
  enhanced_text text,         -- After vocabulary corrections
  edited_text text,           -- After practitioner corrections
  summary text,               -- One-sentence summary for list display
  suggestions jsonb,          -- AI-generated suggestions
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

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
  type text not null,                   -- 'signup_bonus', 'purchase', 'transcription', 'refund'
  stripe_checkout_session_id text,      -- For purchases
  stripe_payment_intent_id text,        -- For purchases
  recording_id uuid references recordings(id),  -- For transcription/refund
  notes text,
  created_at timestamptz default now()
);

create index idx_credit_transactions_practitioner
  on credit_transactions(practitioner_id, created_at desc);
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

CREATE POLICY "transcripts_via_recordings" ON transcripts
  FOR ALL USING (
    recording_id IN (
      SELECT id FROM recordings WHERE practitioner_id = (select auth.uid())
    )
  );

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
  p_recording_id uuid default null
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
    stripe_checkout_session_id, recording_id
  ) values (
    p_practitioner_id, p_amount, new_balance, p_type,
    p_stripe_session_id, p_recording_id
  );

  return new_balance;
end;
$$ language plpgsql security definer set search_path = '';

-- Use credit (returns true if successful)
create or replace function use_credit(
  p_practitioner_id uuid,
  p_recording_id uuid
) returns boolean as $$
declare
  current_credits integer;
begin
  update practitioners
  set credits = credits - 1
  where id = p_practitioner_id and credits > 0
  returning credits into current_credits;

  if current_credits is null then
    return false;
  end if;

  insert into credit_transactions (
    practitioner_id, amount, balance_after, type, recording_id
  ) values (
    p_practitioner_id, -1, current_credits, 'transcription', p_recording_id
  );

  return true;
end;
$$ language plpgsql security definer set search_path = '';

-- Refund credit on failed transcription
create or replace function refund_credit(
  p_practitioner_id uuid,
  p_recording_id uuid
) returns integer as $$
begin
  return add_credits(
    p_practitioner_id, 1, 'refund', null, p_recording_id
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
-- Recordings bucket (private, RLS protected)
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false);

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

create trigger transcripts_updated_at
  before update on transcripts
  for each row execute function update_updated_at();

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();
```

## Related Specs

- [payments.md](./payments.md) - Credit system details
- [security.md](./security.md) - RLS best practices
- [conversations.md](./conversations.md) - Message types and schemas
