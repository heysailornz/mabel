# Security Requirements

Security considerations for a medical transcription application.

## HIPAA Compliance (Future Phase)

- **BAA Required:** Business Associate Agreements needed from:
  - Supabase
  - Deepgram (transcription API)
  - Anthropic (LLM provider)
- **Audit Logging:** Track all access to patient data

## Encryption

### In Transit

- TLS 1.2+ for all network traffic
- HTTPS enforced on all endpoints
- Supabase handles TLS for database connections

### At Rest

- AES-256 encryption for audio files in Supabase Storage
- Database encryption managed by Supabase

## Session Management

### Web Sessions

- Auto-logout after **15-30 minutes** of inactivity
- Secure, HTTP-only cookies for session tokens
- CSRF protection via SameSite cookie attribute

### QR Code Sessions

- QR tokens expire after **5 minutes** if not scanned
- **Single-use tokens:** invalidated after successful authentication
- Token stored securely, not in URL

```typescript
// Inactivity logout implementation
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function useInactivityLogout() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(async () => {
      await supabase.auth.signOut();
      router.push("/auth");
    }, INACTIVITY_TIMEOUT);
  }, [router]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);
}
```

## Row Level Security (RLS)

### Core Principle

Practitioners can only access their own data. Always enable RLS on all tables.

### Performance Optimization

Wrap `auth.uid()` in a subquery to evaluate once per query:

```sql
-- Bad: auth.uid() evaluated for every row
CREATE POLICY "bad_policy" ON posts
  FOR SELECT USING (auth.uid() = author_id);

-- Good: auth.uid() evaluated once per query
CREATE POLICY "good_policy" ON posts
  FOR SELECT USING ((select auth.uid()) = author_id);
```

### RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_sessions ENABLE ROW LEVEL SECURITY;

-- Practitioner data access
CREATE POLICY "practitioners_own_data" ON practitioners
  FOR ALL USING ((select auth.uid()) = id);

CREATE POLICY "recordings_own_data" ON recordings
  FOR ALL USING ((select auth.uid()) = practitioner_id);

CREATE POLICY "conversations_own_data" ON conversations
  FOR ALL USING ((select auth.uid()) = practitioner_id);

-- Nested access through parent tables
CREATE POLICY "transcripts_via_recordings" ON transcripts
  FOR ALL USING (
    recording_id IN (
      SELECT id FROM recordings WHERE practitioner_id = (select auth.uid())
    )
  );

CREATE POLICY "messages_via_conversations" ON conversation_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE practitioner_id = (select auth.uid())
    )
  );
```

### Storage RLS

```sql
-- Users can only access their own folder in recordings bucket
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

## SECURITY DEFINER Functions

Always set an empty `search_path` to prevent search_path hijacking:

```sql
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS void AS $$
BEGIN
  -- function body
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

## API Security

### Server Actions

- Validate user session before all operations
- Use Supabase service role only in edge functions
- Never expose service role key to client

### Webhook Validation

```typescript
// Stripe webhook signature verification
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

## Mobile Security

### Token Storage

Use `expo-secure-store` for sensitive data:

```typescript
import * as SecureStore from "expo-secure-store";

await SecureStore.setItemAsync("access_token", token);
const token = await SecureStore.getItemAsync("access_token");
```

### Certificate Pinning

Consider certificate pinning for production to prevent MITM attacks.

## Input Validation

- Validate all user inputs on server
- Sanitize content before storage
- Use parameterized queries (Supabase handles this)

## Environment Variables

Never commit secrets. Required secrets:

```env
# Server-only (never expose to client)
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
DEEPGRAM_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Security Checklist

### Pre-Launch

- [ ] Enable RLS on all tables
- [ ] Verify all RLS policies are correct
- [ ] Test that users cannot access other users' data
- [ ] Confirm webhook signature verification
- [ ] Review all server actions for auth checks
- [ ] Ensure no secrets in client code
- [ ] Enable HTTPS everywhere

### Ongoing

- [ ] Regular dependency updates
- [ ] Security audit logging (future)
- [ ] BAA agreements for HIPAA (future)

## Related Specs

- [database.md](./database.md) - RLS policies and functions
- [authentication.md](./authentication.md) - Session management
