# Medical Transcription App - Technical Specification

## Overview

A mobile-first medical transcription system that allows practitioners to dictate consultation notes, with a web interface for reviewing and copying transcripts. The system learns from corrections to improve accuracy over time.

## Tech Stack

- **Mobile App:** Expo (React Native)
- **Web App:** Next.js
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Transcription:** Deepgram (with custom enhancement layer)
- **AI Suggestions:** Claude API

## Core Workflow

1. Practitioner opens mobile app and starts recording consultation
2. Recording ends, audio saved locally and queued for upload
3. When online, audio uploads to Supabase Storage
4. Edge function processes: transcription → vocabulary corrections → summary → AI suggestions
5. Practitioner views transcript on mobile or web
6. Web login options: email OTP (primary) or QR code scan from authenticated mobile (secondary)
7. Practitioner edits errors, accepts/rejects suggestions
8. Copies formatted text to EMR
9. Auto-logout after inactivity, corrections stored for learning

---

## System Components

### 1. Mobile App (Expo)

**Features:**

- Audio recording with start/stop/pause controls
- Visual feedback during recording (waveform, duration)
- Offline queue for failed uploads
- Background recording support
- QR code scanner for web authentication
- Email OTP authentication

**Key Libraries:**

- `expo-av` - Audio recording (AAC format, mono 128kbps)
- `expo-camera` - QR scanning
- `expo-secure-store` - Token storage
- `expo-file-system` - Local file management
- `tus-js-client` - TUS resumable uploads to Supabase Storage
- `@tanstack/react-query` - Data fetching/caching
- `react-native-mmkv` - Offline queue persistence

**Screens:**

- Authentication (email OTP)
- Conversation (main recording interface, with sidebar menu)
- Scan QR (authenticate web session)
- Settings (preferences, vocabulary)

### 2. Web App (Next.js)

**Features:**

- Email OTP login (primary authentication method)
- QR code login (secondary - for quick login from authenticated mobile)
- Transcript viewer with inline editing
- AI suggestions sidebar
- Search and history
- Export/copy functionality
- Auto-logout after 15-30 minutes

**Key Libraries:**

- `@supabase/ssr` - Supabase SSR auth (supports OTP natively)
- `qrcode.react` - QR generation
- `@supabase/supabase-js` - Database/realtime
- `sonner` - Toast notifications (via shadcn/ui)
- `stripe` - Stripe API for payments

**Pages:**

- `/login` - Email OTP + QR code display
- `/dashboard` - Recent transcripts with summaries
- `/dashboard/transcript/[id]` - View/edit transcript
- `/dashboard/settings` - Preferences
- `/dashboard/credits` - Buy credits (Stripe Checkout redirect)

### 3. Backend (Supabase)

**Database Schema:**

```sql
-- Practitioners (extends auth.users)
create table practitioners (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  credits integer default 5 not null,  -- Free credits on signup
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Recordings
create table recordings (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  audio_path text not null,
  duration_seconds integer,
  status text default 'pending', -- pending, pending_credits, processing, completed, failed
  created_at timestamptz default now()
);

-- Transcripts
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

-- Custom vocabulary per practitioner
create table vocabulary (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id) not null,
  original_term text not null,  -- What transcription API produces
  corrected_term text not null, -- What practitioner corrects it to
  frequency integer default 1,
  created_at timestamptz default now(),
  UNIQUE(practitioner_id, original_term)
);

-- Web sessions (for QR login)
create table web_sessions (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id),
  token text unique not null,
  status text default 'pending', -- pending, authenticated, expired
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Credit transactions (audit trail for all credit changes)
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

**Edge Functions:**

- `process-recording` - Triggered on audio upload, orchestrates full pipeline:
  - Calls Deepgram API for transcription
  - Applies vocabulary corrections
  - Generates one-sentence summary (LLM)
  - Generates AI suggestions (LLM)
- `authenticate-qr` - Validates QR scan and creates web session

**Storage Buckets:**

- `recordings` - Audio files (private, RLS protected)

### 4. AI Transcription Service

**Architecture:**

```
Mobile App
    │
    ▼
Local Recording + Offline Queue
    │
    ▼ (when online)
Supabase Storage (audio upload)
    │
    ▼
Edge Function: process-recording
    │
    ├──► Deepgram API (speech-to-text)
    │         │
    │         ▼
    │    Raw transcript
    │
    ├──► Custom Enhancement (vocabulary corrections)
    │         │
    │         ▼
    │    Enhanced transcript
    │
    ├──► Summary Generation (Claude)
    │         │
    │         ▼
    │    One-sentence summary
    │
    └──► Suggestion Engine (Claude)
              │
              ▼
         Suggestions JSON
              │
              ▼
    Save to transcripts table
```

**Transcription API Integration:**

```typescript
// Example: Deepgram integration
async function transcribeAudio(audioUrl: string): Promise<string> {
  const response = await fetch("https://api.deepgram.com/v1/listen", {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: audioUrl,
      model: "medical",
      punctuate: true,
      diarize: true, // Speaker identification
      smart_format: true,
    }),
  });

  const result = await response.json();
  return result.results.channels[0].alternatives[0].transcript;
}
```

**Custom Enhancement Layer:**

```typescript
async function enhanceTranscript(
  rawText: string,
  practitionerId: string
): Promise<string> {
  // Fetch practitioner's custom vocabulary
  const vocabulary = await supabase
    .from("vocabulary")
    .select("original_term, corrected_term")
    .eq("practitioner_id", practitionerId);

  let enhanced = rawText;

  // Apply vocabulary corrections
  for (const { original_term, corrected_term } of vocabulary.data) {
    const regex = new RegExp(original_term, "gi");
    enhanced = enhanced.replace(regex, corrected_term);
  }

  return enhanced;
}
```

**Summary Generation:**

```typescript
async function generateSummary(transcript: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `Summarize this medical consultation in one sentence (max 15 words) for display in a list view. Focus on the main complaint or reason for visit.\n\nTranscript:\n${transcript}`,
      },
    ],
  });

  return response.content[0].text;
}
```

**Suggestion Engine:**

```typescript
async function generateSuggestions(transcript: string): Promise<Suggestion[]> {
  const prompt = `
You are a medical documentation assistant. Analyze this consultation transcript and identify any missing required elements.

Transcript:
${transcript}

Check for these common elements:
1. Chief complaint
2. History of present illness (onset, duration, severity, associated symptoms)
3. Relevant past medical history
4. Current medications mentioned
5. Physical examination findings
6. Assessment/diagnosis
7. Plan (medications, referrals, follow-up)

Return a JSON array of suggestions:
[
  {
    "type": "missing_element",
    "element": "follow_up",
    "message": "No follow-up timeframe specified",
    "suggested_text": "Follow up in [X] weeks"
  }
]

Only include genuinely missing or unclear elements. Return empty array if documentation is complete.
`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.content[0].text);
}
```

### 5. Recording & Upload Architecture

**Audio Format:**
- Format: AAC (mono, 128kbps)
- File size: ~1 MB per minute of recording
- Typical consultation (30 min): ~30 MB

**Upload Method: TUS Resumable Uploads**

Supabase Storage supports the TUS protocol for resumable uploads, which is ideal for mobile networks:
- Uploads in 6MB chunks
- Automatic retry on failure
- Can pause/resume uploads
- Resume from where it left off after network interruption
- Supports files up to 50GB

**Upload Time Estimates:**

| Duration | File Size | 4G LTE | 3G | Poor Signal |
|----------|-----------|--------|-----|-------------|
| 15 min | ~15 MB | ~6 sec | ~1 min | ~4 min |
| 30 min | ~30 MB | ~12 sec | ~2 min | ~8 min |
| 60 min | ~60 MB | ~24 sec | ~4 min | ~16 min |

**Upload Flow:**

```
Recording Complete
       │
       ▼
Save to local storage (expo-file-system)
       │
       ▼
Add to upload queue (MMKV)
       │
       ▼
Queue manager checks connectivity
       │
       ├── Offline: Wait for connection
       │
       └── Online: Start TUS upload
                │
                ├── Create recordings DB row (status='uploading')
                │
                ├── TUS resumable upload to Supabase Storage
                │   └── Uses direct storage URL for better performance
                │
                ├── On success: Update status='pending'
                │
                └── On failure: Keep in queue, retry with backoff
```

**TUS Upload Implementation:**

```typescript
import * as tus from "tus-js-client";
import * as FileSystem from "expo-file-system";

async function uploadRecording(
  fileUri: string,
  fileName: string,
  practitionerId: string,
  accessToken: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const supabaseStorageUrl = SUPABASE_URL.replace(
    ".supabase.co",
    ".storage.supabase.co"
  );

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(fileUri, {
      endpoint: `${supabaseStorageUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: "recordings",
        objectName: `${practitionerId}/${fileName}`,
        contentType: "audio/aac",
      },
      chunkSize: 6 * 1024 * 1024, // 6MB chunks
      uploadSize: fileInfo.size,
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress((bytesUploaded / bytesTotal) * 100);
      },
      onSuccess: () => resolve(`${practitionerId}/${fileName}`),
    });

    // Resume previous upload if interrupted
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}
```

**Offline Queue Structure (MMKV):**

```typescript
interface QueuedRecording {
  id: string; // Local UUID
  fileUri: string; // Local file path
  fileName: string; // Target filename
  practitionerId: string;
  durationSeconds: number;
  createdAt: string; // ISO timestamp
  uploadAttempts: number; // Retry counter
  lastAttemptAt?: string; // For exponential backoff
  tusUploadUrl?: string; // For resuming partial uploads
}
```

### 6. Authentication Flow

**Primary: Email OTP (both web and mobile)**

```typescript
// Request OTP
async function requestOTP(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  return { error };
}

// Verify OTP
async function verifyOTP(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  return { data, error };
}
```

**Secondary: QR Code (web login from authenticated mobile)**

**Web App generates QR:**

```typescript
// server/actions/auth.ts
export async function createQRSession() {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min to scan

  await supabase.from("web_sessions").insert({
    token,
    status: "pending",
    expires_at: expiresAt,
  });

  // QR contains: { token, webAppUrl }
  return { token };
}
```

**Mobile App scans and authenticates:**

```typescript
// Mobile: After scanning QR
async function authenticateWebSession(qrData: { token: string }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("web_sessions")
    .update({
      practitioner_id: user.id,
      status: "authenticated",
    })
    .eq("token", qrData.token)
    .eq("status", "pending");
}
```

**Web App uses Supabase Realtime for instant update:**

```typescript
// Web: Subscribe to session status changes
useEffect(() => {
  const channel = supabase
    .channel(`web_session:${sessionToken}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "web_sessions",
        filter: `token=eq.${sessionToken}`,
      },
      async (payload) => {
        if (payload.new.status === "authenticated") {
          // Create session and redirect
          await createSessionFromQR(payload.new.practitioner_id);
          router.push("/dashboard");
        }
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
}, [sessionToken]);
```

### 7. Learning Pipeline

**Track corrections:**

```typescript
// When practitioner saves edited transcript
async function saveTranscript(
  transcriptId: string,
  editedText: string,
  originalText: string,
  practitionerId: string
) {
  // Save the edit
  await supabase
    .from("transcripts")
    .update({
      edited_text: editedText,
      updated_at: new Date(),
    })
    .eq("id", transcriptId);

  // Extract vocabulary corrections
  const corrections = extractCorrections(originalText, editedText);

  for (const { original, corrected } of corrections) {
    await supabase.from("vocabulary").upsert(
      {
        practitioner_id: practitionerId,
        original_term: original,
        corrected_term: corrected,
      },
      {
        onConflict: "practitioner_id, original_term",
      }
    );
  }
}
```

### 8. Payments & Credits

**Credit System:**
- New users receive 5 free credits on signup
- Each transcription costs 1 credit
- Minimum purchase: 10 credits
- Credits never expire
- Failed transcriptions are automatically refunded

**Payment Flow:**

```
User runs out of credits
         │
         ▼
Recording uploads successfully (always)
         │
         ▼
Edge function checks credits
         │
         ├── Credits > 0: Deduct 1, process transcription
         │
         └── Credits = 0: Set status='pending_credits', queue recording
                              │
                              ▼
                    User sees "Buy Credits" prompt
                              │
                              ▼
                    Redirect to Stripe Checkout
                              │
                              ▼
                    Complete payment
                              │
                              ▼
                    Webhook adds credits to account
                              │
                              ▼
                    Queued recordings auto-process
```

**Stripe Checkout Integration:**

```typescript
// server/actions/payments.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(
  practitionerId: string,
  priceId: string,
  creditAmount: number
) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      practitioner_id: practitionerId,
      credit_amount: creditAmount.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_WEB_URL}/dashboard?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_WEB_URL}/dashboard?payment=cancelled`,
  });

  return { url: session.url };
}
```

**Webhook Handler:**

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const practitionerId = session.metadata?.practitioner_id;
    const creditAmount = parseInt(session.metadata?.credit_amount || "0");

    if (practitionerId && creditAmount > 0) {
      // Add credits using database function
      await supabase.rpc("add_credits", {
        p_practitioner_id: practitionerId,
        p_amount: creditAmount,
        p_type: "purchase",
        p_stripe_session_id: session.id,
      });

      // Process any queued recordings
      await supabase.rpc("process_pending_credit_recordings", {
        p_practitioner_id: practitionerId,
      });
    }
  }

  return new Response("OK", { status: 200 });
}
```

**Database Functions for Credit Management:**

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
$$ language plpgsql;

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
$$ language plpgsql;

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
$$ language plpgsql;
```

**Credit Check in process-recording Edge Function:**

```typescript
// Check credits before processing
const hasCredit = await supabase.rpc("use_credit", {
  p_practitioner_id: practitionerId,
  p_recording_id: recordingId,
});

if (!hasCredit) {
  await supabase
    .from("recordings")
    .update({ status: "pending_credits" })
    .eq("id", recordingId);
  return; // Exit, recording will be processed when credits purchased
}

try {
  // Process transcription...
} catch (error) {
  // Refund credit on failure
  await supabase.rpc("refund_credit", {
    p_practitioner_id: practitionerId,
    p_recording_id: recordingId,
  });
  throw error;
}
```

---

## Security Requirements

- **HIPAA Compliance:** BAA required from Supabase, transcription API, and LLM provider (future phase)
- **Encryption:** TLS in transit, AES-256 at rest for audio files
- **Session Management:**
  - Web sessions expire after 15-30 minutes of inactivity
  - QR tokens expire after 5 minutes if not scanned
  - Single-use QR tokens
- **Audit Logging:** Track all access to patient data (future phase)
- **Row Level Security:** Practitioners can only access their own recordings/transcripts

---

## Project Structure

```
mabel/
├── apps/
│   ├── mobile/                 # Expo app
│   │   ├── app/               # Expo Router screens
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── package.json
│   │
│   └── web/                   # Next.js app
│       ├── app/               # App router pages
│       ├── components/
│       │   ├── ui/           # shadcn/ui components
│       │   └── features/     # Feature components
│       ├── hooks/
│       ├── lib/
│       ├── server/
│       │   ├── actions/      # Server actions
│       │   └── queries/      # Database queries
│       └── package.json
│
├── packages/
│   └── @project/
│       ├── core/             # Shared business logic
│       │   └── src/
│       │       └── auth/     # Auth service, types, schemas
│       ├── db/               # Database clients
│       │   └── src/
│       │       ├── web/      # Server & client Supabase
│       │       ├── mobile/   # React Native Supabase
│       │       └── types/    # Generated Supabase types
│       ├── config/           # Shared config validation
│       ├── tsconfig/         # Shared TypeScript configs
│       └── eslint-config/    # Shared ESLint configs
│
├── supabase/
│   ├── migrations/           # SQL migrations
│   ├── functions/            # Edge functions
│   │   ├── process-recording/
│   │   └── authenticate-qr/
│   └── config.toml
│
└── package.json              # Monorepo root (pnpm workspaces + turborepo)
```

---

## Implementation Order

### Phase 1: Core Infrastructure

- [ ] Update database schema (rename profiles → practitioners, add new tables)
- [ ] Set up email OTP authentication (replace password auth)
- [ ] Create storage bucket for recordings
- [ ] Set up Edge Functions directory structure

### Phase 2: Recording & Upload

- [ ] Mobile: Audio recording interface with expo-av (AAC mono 128kbps)
- [ ] Mobile: Local file storage with expo-file-system
- [ ] Mobile: Offline queue persistence with MMKV
- [ ] Mobile: TUS resumable uploads with tus-js-client
- [ ] Mobile: Upload progress UI and retry handling
- [ ] Backend: Storage bucket configuration with RLS
- [ ] Backend: Storage trigger for processing pipeline

### Phase 3: Transcription Integration

- [ ] Edge function: process-recording
- [ ] Integrate Deepgram API
- [ ] Vocabulary corrections layer
- [ ] Summary generation (Claude)
- [ ] Suggestions generation (Claude)

### Phase 4: Web Transcript Interface

- [ ] Dashboard with transcript list (showing summaries)
- [ ] Transcript viewer with inline editing
- [ ] AI suggestions sidebar
- [ ] Copy/export functionality

### Phase 5: QR Authentication

- [ ] Web: Generate QR code on login page
- [ ] Mobile: QR scanner screen
- [ ] Backend: web_sessions table + Realtime subscription
- [ ] Web: Instant login on QR scan

### Phase 6: Learning Pipeline

- [ ] Track corrections when saving edits
- [ ] Build vocabulary dictionary from corrections
- [ ] Apply learned vocabulary to new transcripts

### Phase 7: Payments

- [ ] Database: Add credits column and credit_transactions table
- [ ] Database: Create credit management functions (add_credits, use_credit, refund_credit)
- [ ] Stripe: Create products and prices in Stripe Dashboard
- [ ] Backend: Stripe Checkout session creation endpoint
- [ ] Backend: Stripe webhook handler (/api/webhooks/stripe)
- [ ] Backend: Update process-recording to check/use credits
- [ ] Web: Credit balance display in header
- [ ] Web: Buy credits page with Stripe Checkout redirect
- [ ] Mobile: Credit balance display
- [ ] Mobile: Buy credits flow (WebView or in-app browser)
- [ ] Both: Low balance warnings (credits ≤ 2)
- [ ] Both: Pending credits state UI for queued recordings

### Phase 8: Polish & Compliance

- [ ] Security review
- [ ] Performance optimization
- [ ] User testing with practitioners
- [ ] Documentation

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Transcription API
DEEPGRAM_API_KEY=

# AI Suggestions
ANTHROPIC_API_KEY=

# App URLs
NEXT_PUBLIC_WEB_URL=https://app.example.com
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_10_CREDITS=price_...
STRIPE_PRICE_25_CREDITS=price_...
STRIPE_PRICE_50_CREDITS=price_...
STRIPE_PRICE_100_CREDITS=price_...
```

---

## Notes

- Start with Deepgram's medical model for best out-of-box accuracy
- TUS resumable uploads handle large files reliably on mobile networks
- Use direct storage URL (`project-id.storage.supabase.co`) for upload performance
- Audio recordings use AAC mono 128kbps (~1MB/min) for optimal size/quality balance
- Local queue ensures recordings are never lost, even offline
- Consider PWA for web app to allow offline viewing of past transcripts
- Plan for multi-tenant if selling to healthcare organizations
