# Conversations

Conversations are the primary interface for interacting with the transcription system. Each conversation is a chat-style thread containing practitioner inputs (recordings, text, images), AI responses (artifacts, suggestions, summaries), and user actions (edits, accepted suggestions).

## Architecture Note: Skills and Artifacts

The conversation system is designed to support multiple "skills" that process different input types. See [skills.md](./skills.md) and [artifacts.md](./artifacts.md) for the extensible architecture.

**Key concepts:**
- **User Input** - Any input from the practitioner (audio, text, image, document)
- **Skill** - A processing capability (transcription, X-ray analysis, VBG analysis, etc.)
- **Artifact** - The output from a skill (transcript, analysis report, etc.)

The message types below support both current functionality (transcription, text entry) and future skills (image analysis, etc.).

## Key Decisions

| Aspect | Decision |
|--------|----------|
| Input types | Audio, text, images, documents (extensible via skills) |
| Inputs per conversation | 1:many (multiple inputs allowed per conversation) |
| AI participant types | `transcription_ai`, `suggestions_ai`, `summary_ai`, `assistant_ai`, `skill_ai` |
| User actions tracked | Edits, accepted suggestions, and all inputs appear as messages |
| Input classification | AI determines skill + intent (new artifact, enrich existing, instruction, question) |
| Recording platform | Mobile preferred; web allows recording if microphone available |
| Conversation titles | Auto-generated from first artifact summary (not user-editable) |
| Conversation lifecycle | `active` or `archived` only (no "completed" state) |

## Visual Mockups

Reference mockups are available in `spec/mockups/`. These illustrate the intended UI for key screens and components.

### Screen Mockups

| Mockup | Description |
|--------|-------------|
| [Loading](mockups/mobile/Loading.png) | Splash screen with Mabel logo |
| [New Conversation](mockups/mobile/New%20Conversation.png) | Welcome screen with time-based greeting and recording bar |
| [Menu](mockups/mobile/Menu.png) | Left drawer showing recent conversations list |
| [Uploading state](mockups/mobile/Uploading%20state.png) | Recording uploaded, showing single tick status |
| [Processing state](mockups/mobile/Processing%20state.png) | Server processing, showing double blue ticks and "Let me work on that..." |
| [Transcription result](mockups/mobile/Transcription%20result.png) | Complete AI response with suggestions and artifact card |

### Component Mockups

| Mockup | Description |
|--------|-------------|
| [Recorder](mockups/mobile/Recorder.png) | Recording bar with waveform and red mic button |
| [Conversation Recording Entry](mockups/mobile/Conversation%20Recording%20Entry.png) | Recorded audio bubble with waveform and green play button |
| [Conversation Action Entry with artifact](mockups/mobile/Conversation%20Action%20Entry%20with%20artifact.png) | Artifact card with Review and Review on web actions |

## Conversation Flow

### Audio Recording Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. RECORD                                                                   │
│    Practitioner taps record → conversation created (if new)                 │
│    → recording_upload message inserted immediately (status: recording)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. UPLOAD                                                                   │
│    Recording stops → file saved locally → upload begins                     │
│    → recording_upload message updated (status: uploading, progress: 0-100) │
│    → Upload completes → status: pending                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. PROCESS                                                                  │
│    Edge function triggered → status_update message (status: processing)    │
│    → Deepgram transcription → transcription_result message                 │
│    → Claude suggestions → suggestion message (if any missing elements)     │
│    → Claude summary → summary message + conversation.title updated         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. REVIEW                                                                   │
│    Practitioner views on mobile or web                                      │
│    → Edits transcript → user_edit message                                  │
│    → Accepts suggestion → accepted_suggestion message                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. EXPORT                                                                   │
│    Practitioner exports/copies final transcript                             │
│    → Compiled from all transcription_result + user_edit messages           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Text Entry Flow

See [text-entry.md](./text-entry.md) for full details on classification and processing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. SUBMIT TEXT                                                              │
│    Practitioner types and submits → conversation created (if new)           │
│    → text_entry message inserted (status: sent)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. CLASSIFY                                                                 │
│    AI classifier determines intent → text_entry updated (status: classifying)│
│    → Classification result: consultation | instruction | fragment | question │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3A. CONSULTATION (new clinical content)                                     │
│    → Enhancement (vocabulary) → summary → suggestions                       │
│    → text_processed message + artifact card                                │
│    → summary message + conversation.title updated (if first)               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3B. FRAGMENT (additional info for existing transcript)                      │
│    → Enhancement → merge into latest transcript                             │
│    → Regenerate suggestions if needed                                       │
│    → fragment_merged message                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3C. INSTRUCTION (command to modify documentation)                           │
│    → Load context (transcripts, suggestions, edit history)                  │
│    → Parse and execute action (add, edit, accept suggestion, etc.)          │
│    → instruction_response message                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3D. QUESTION (query about documentation)                                    │
│    → Load context → Generate answer                                         │
│    → instruction_response message with answer                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. COMPLETE                                                                 │
│    → text_entry updated (status: completed)                                │
│    → Two blue ticks displayed                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Participant Types

| Type | Description | Avatar/Icon |
|------|-------------|-------------|
| `practitioner` | The logged-in user | User's avatar or initials |
| `transcription_ai` | Deepgram transcription results | Microphone icon |
| `suggestions_ai` | Claude-generated suggestions for missing elements | Lightbulb icon |
| `summary_ai` | Claude-generated summary | Document icon |
| `assistant_ai` | Conversational AI responses (instructions, questions, fragments) | Chat bubble icon |
| `skill_ai` | Generic skill processor (for future skills like X-ray, VBG) | Skill-specific icon |
| `system` | Status updates, errors, prompts | Info/warning icon |

## Message Types

Each message has a `participant_type`, `message_type`, `content` (text), and `metadata` (JSON).

### `recording_upload` (participant: practitioner)

Inserted immediately when recording starts. Updated as upload progresses.

```typescript
{
  participant_type: "practitioner",
  message_type: "recording_upload",
  content: null,
  metadata: {
    recording_id: "uuid",
    duration_seconds: 180,
    status: "recording" | "local_saved" | "uploading" | "uploaded" | "processing" | "completed" | "failed",
    upload_progress: 0-100,  // Only during upload
    error_message?: string   // Only on failure
  }
}
```

**UI Rendering (Tick/Check Status System):**

*See mockups: [Uploading state](mockups/mobile/Uploading%20state.png), [Processing state](mockups/mobile/Processing%20state.png)*

Recording status is shown using a tick/check indicator below the audio waveform:

| Status | Visual | Description |
|--------|--------|-------------|
| `recording` | Pulsing red indicator | Active recording in progress |
| `local_saved` | ✓ (one grey tick) | Recording saved locally, upload pending |
| `uploading` | ✓ (one grey tick, animated) | Upload in progress |
| `uploaded` | ✓✓ (two grey ticks) | Saved to server, awaiting processing |
| `processing` | ✓✓ (two grey ticks) | Server is transcribing |
| `completed` | ✓✓ (two blue ticks) | Fully processed and ready |
| `failed` | ✗ (red cross) + "Retry" link | Error occurred, tap to retry |

The tick system mirrors messaging app patterns (like WhatsApp) for familiar UX.

### `transcription_result` (participant: transcription_ai)

The transcribed text from Deepgram, after vocabulary corrections applied.

```typescript
{
  participant_type: "transcription_ai",
  message_type: "transcription_result",
  content: "Patient presents with...", // The enhanced transcript text
  metadata: {
    recording_id: "uuid",
    transcript_id: "uuid",
    raw_text: "...",           // Original before vocabulary corrections
    word_count: 450,
    confidence: 0.94           // Deepgram confidence score
  }
}
```

**UI Rendering:**

*See mockup: [Transcription result](mockups/mobile/Transcription%20result.png)*

The transcription result is presented conversationally with an artifact card:

1. **Acknowledgment text**: "Got it, thanks. This looks like a consultation about [topic]."
2. **Status text**: "I've made a draft transcription for you to review."
3. **Suggestions intro**: "I have a couple of suggestions for you to consider:" (if any)
4. **Artifact card**: Collapsible card containing the full transcript

**Artifact Card Component:**

*See mockup: [Conversation Action Entry with artifact](mockups/mobile/Conversation%20Action%20Entry%20with%20artifact.png)*

```
┌─────────────────────────────────────┐
│ 📄  Draft Transcript                │
├─────────────────────────────────────┤
│ Review                          →   │
├─────────────────────────────────────┤
│ Review on web                  [QR] │
└─────────────────────────────────────┘
```

- **Review**: Opens transcript in full-screen modal for editing
- **Review on web**: Shows QR code linking to `/c/[id]` for desktop viewing/editing

### `suggestion` (participant: suggestions_ai)

Claude-generated suggestions for missing documentation elements.

```typescript
{
  participant_type: "suggestions_ai",
  message_type: "suggestion",
  content: "I noticed some elements that may need attention:", // Intro text
  metadata: {
    recording_id: "uuid",
    suggestions: [
      {
        id: "uuid",
        type: "missing_element",
        element: "follow_up",
        message: "No follow-up timeframe specified",
        suggested_text: "Follow up in [X] weeks",
        status: "pending" | "accepted" | "dismissed"
      },
      {
        id: "uuid",
        type: "missing_element",
        element: "medication_dosage",
        message: "Medication dosage not specified for Lisinopril",
        suggested_text: "Lisinopril [X]mg daily",
        status: "pending"
      }
    ]
  }
}
```

**UI Rendering:**

Suggestions are displayed inline as conversational questions (bullet points) within the AI response, prompting the practitioner to add more detail:

```
I have a couple of suggestions for you to consider:

• what about the treatment that was given?
• were there any other examination findings like Rovsings sign or rebound tenderness?
• the vital signs are missing a temperature, was it elevated?

Record below to add more detail, or review the transcript.
```

This conversational approach encourages practitioners to record additional context rather than selecting from pre-written options. The suggestions are phrased as questions to prompt reflection.

**Note**: Suggestions are embedded in the transcription response message flow, not shown as separate interactive cards.

### `summary` (participant: summary_ai)

One-sentence summary for list display. Also updates `conversation.title`.

```typescript
{
  participant_type: "summary_ai",
  message_type: "summary",
  content: "Follow-up visit for hypertension management with medication adjustment",
  metadata: {
    recording_id: "uuid"
  }
}
```

**UI Rendering:**
- Subtle summary card
- Displayed at top of conversation or inline

### `user_edit` (participant: practitioner)

Tracks when practitioner edits a transcript.

```typescript
{
  participant_type: "practitioner",
  message_type: "user_edit",
  content: "Patient presents with controlled hypertension...", // Full edited text
  metadata: {
    recording_id: "uuid",
    transcript_id: "uuid",
    original_text: "...",      // Text before this edit
    edit_summary: "Corrected medication name" // Optional description
  }
}
```

**UI Rendering:**
- "Edited transcript" indicator
- Option to view diff from original

### `accepted_suggestion` (participant: practitioner)

Records when a suggestion is accepted and applied.

```typescript
{
  participant_type: "practitioner",
  message_type: "accepted_suggestion",
  content: null,
  metadata: {
    suggestion_message_id: "uuid",  // Reference to original suggestion message
    suggestion_id: "uuid",          // ID within suggestions array
    applied_text: "Follow up in 2 weeks"
  }
}
```

**UI Rendering:**
- Small confirmation: "Added: Follow up in 2 weeks"

### `status_update` (participant: system)

System-generated status messages.

```typescript
{
  participant_type: "system",
  message_type: "status_update",
  content: "Processing your recording...",
  metadata: {
    recording_id?: "uuid",
    status: "info" | "warning" | "error",
    action?: {
      label: "Retry",
      type: "retry_upload" | "retry_processing"
    }
  }
}
```

**UI Rendering:**
- Centered, muted text
- Optional action button

---

## Text Entry Message Types

The following message types support text input from practitioners. See [text-entry.md](./text-entry.md) for full classification and processing details.

### `text_entry` (participant: practitioner)

Raw text input from the user. Created immediately when user submits text.

```typescript
{
  participant_type: "practitioner",
  message_type: "text_entry",
  content: "Patient presents with chest pain, 3 days duration",
  metadata: {
    status: "sent" | "classifying" | "processing" | "completed" | "failed",
    classification?: {
      type: "consultation" | "instruction" | "fragment" | "question",
      confidence: 0.95,
      reasoning: "Contains clinical symptoms and timeline",
      suggestedAction?: "add_content"  // For instruction type
    },
    error_message?: string  // Only on failure
  }
}
```

**UI Rendering:**

Text entries appear as right-aligned bubbles (same as recordings) with tick status:

| Status | Visual | Description |
|--------|--------|-------------|
| `sent` | ✓ (one grey tick) | Text submitted |
| `classifying` | ✓ (one grey tick, animated) | AI determining intent |
| `processing` | ✓✓ (two grey ticks) | Processing based on classification |
| `completed` | ✓✓ (two blue ticks) | Fully processed |
| `failed` | ✗ (red cross) + Retry | Error occurred |

### `text_processed` (participant: transcription_ai)

Result of processing consultation text (similar to transcription_result but from text input).

```typescript
{
  participant_type: "transcription_ai",
  message_type: "text_processed",
  content: "Patient presents with chest pain...", // Enhanced text
  metadata: {
    text_entry_id: "uuid",
    transcript_id: "uuid",
    raw_text: "...",           // Original before vocabulary corrections
    word_count: 45,
    source_type: "text"        // Distinguishes from audio transcription
  }
}
```

**UI Rendering:**
Same as `transcription_result` - conversational acknowledgment with artifact card.

### `fragment_merged` (participant: assistant_ai)

Confirmation that a text fragment was appended to an existing transcript.

```typescript
{
  participant_type: "assistant_ai",
  message_type: "fragment_merged",
  content: "Added to your transcript: \"Patient also reports headaches...\"",
  metadata: {
    text_entry_id: "uuid",
    transcript_id: "uuid",
    fragment_text: "Patient also reports headaches starting last week",
    suggestions_updated: true  // Whether suggestions were regenerated
  }
}
```

**UI Rendering:**
- Left-aligned AI response
- Brief confirmation text
- Optional indicator if suggestions were updated

### `instruction_response` (participant: assistant_ai)

AI response to a practitioner instruction or question.

```typescript
{
  participant_type: "assistant_ai",
  message_type: "instruction_response",
  content: "Done. Added diabetes history to the Past Medical History section.",
  metadata: {
    text_entry_id: "uuid",
    instruction: "Add that patient has history of diabetes",
    action: "add_content" | "edit_content" | "accept_suggestion" | "reject_suggestion" | "answer_question",
    transcript_id?: "uuid",     // If transcript was modified
    changes_made?: string       // Description of changes
  }
}
```

**UI Rendering:**
- Left-aligned AI response
- Conversational confirmation
- For edits: "View changes" link to see diff

### `clarification_request` (participant: assistant_ai)

AI asking for clarification when instruction is ambiguous.

```typescript
{
  participant_type: "assistant_ai",
  message_type: "clarification_request",
  content: "I'm not sure what you'd like me to fix. Could you clarify?",
  metadata: {
    text_entry_id: "uuid",
    original_instruction: "fix that",
    options?: [
      "The medication names",
      "The assessment section",
      "The follow-up plan"
    ]
  }
}
```

**UI Rendering:**
- Left-aligned AI response
- Question text
- Optional quick-reply buttons for suggested options

---

## Unified Message Types

The following message types provide a unified model for the skills architecture. They support all current skills (transcription, text entry) and future skills (image analysis, VBG, ECG, etc.).

**Note:** These are the primary message types used in the application. See the specific types in the sections above for legacy reference only.

See [skills.md](./skills.md) and [artifacts.md](./artifacts.md) for full architecture details.

### `user_input` (participant: practitioner)

Unified message type for all user inputs. Replaces/generalizes `recording_upload` and `text_entry`.

```typescript
{
  participant_type: "practitioner",
  message_type: "user_input",
  content: null,  // For text: the text content; for others: null
  metadata: {
    user_input_id: "uuid",
    input_type: "audio" | "text" | "image" | "document",

    // For audio inputs
    recording_id?: "uuid",
    duration_seconds?: number,
    upload_progress?: number,  // 0-100 during upload

    // For image/document inputs
    storage_path?: string,
    file_name?: string,
    file_size_bytes?: number,
    mime_type?: string,
    thumbnail_url?: string,    // For images

    // Classification (from unified classifier)
    classification?: {
      skillId: "transcription" | "xray_analysis" | "vbg_analysis" | ...,
      intent: "new_artifact" | "enrich_existing" | "instruction" | "question",
      confidence: number,
      targetArtifactId?: string,  // For enrich_existing
    },

    // Status
    status: "received" | "uploading" | "classifying" | "processing" | "completed" | "failed",
    error_message?: string
  }
}
```

**UI Rendering:**
- Right-aligned bubble (practitioner side)
- Renders based on input_type:
  - `audio`: Waveform with play button
  - `text`: Text bubble
  - `image`: Thumbnail with expand
  - `document`: File icon with name
- Tick status below (same system as recording_upload)

### `artifact_created` (participant: skill_ai)

When a skill produces a new artifact. Generalizes `transcription_result` and `text_processed`.

```typescript
{
  participant_type: "skill_ai",  // Or specific: transcription_ai, xray_ai, etc.
  message_type: "artifact_created",
  content: "I've analyzed the chest X-ray...",  // Conversational intro
  metadata: {
    artifact_id: "uuid",
    artifact_type: "transcript" | "xray_analysis" | "vbg_analysis" | ...,
    skill_id: "transcription" | "xray_analysis" | ...,
    user_input_id: "uuid",         // The input that created this artifact
    summary: "CXR: Right lower lobe pneumonia",
    suggestions_count: 2,          // Number of suggestions generated

    // Artifact-specific preview data
    preview?: {
      // For transcript
      word_count?: number,
      confidence?: number,

      // For X-ray
      findings_count?: number,
      primary_finding?: string,
      image_thumbnail?: string,

      // For VBG
      primary_disorder?: string,
      ph?: number,
      pco2?: number,
    }
  }
}
```

**UI Rendering:**
- Left-aligned AI response
- Conversational acknowledgment text
- Suggestions listed as questions (if any)
- Artifact card with skill-specific preview

### `artifact_updated` (participant: skill_ai | assistant_ai)

When an existing artifact is modified (enriched, edited via instruction, etc.). Generalizes `fragment_merged`.

```typescript
{
  participant_type: "assistant_ai",
  message_type: "artifact_updated",
  content: "Added the X-ray findings to your consultation notes.",
  metadata: {
    artifact_id: "uuid",
    artifact_type: "transcript",
    update_type: "enriched" | "edited" | "reference_added",
    user_input_id?: "uuid",         // If triggered by user input
    source_artifact_id?: "uuid",    // If adding cross-reference (e.g., X-ray → transcript)

    changes: {
      description: "Added imaging findings section",
      added_content?: string,       // Preview of what was added
      suggestions_regenerated: true
    },

    new_version: 2
  }
}
```

**UI Rendering:**
- Left-aligned AI response
- Brief confirmation text
- "View changes" link for diff view
- Updated artifact card

---

## Routes & Navigation

### Web Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/auth` | Email OTP login | No |
| `/hello` | New conversation prompt (main entry after login) | Yes |
| `/c/[id]` | View specific conversation | Yes |
| `/settings` | User preferences | Yes |
| `/credits` | Buy credits | Yes |

**Web Layout:**
- Persistent side drawer with conversation history
- "New Chat" button at top of side drawer
- Main content area shows current route
- Side drawer shows: title (or "New Conversation"), last message preview, relative timestamp

**Responsive Drawer Behavior:**

The left drawer containing conversation history is responsive based on viewport width:

| Breakpoint | Width | Drawer State | Behavior |
|------------|-------|--------------|----------|
| `lg` and above | ≥1024px | Open by default | Always visible, pushes content |
| Below `lg` | <1024px | Closed by default | Overlay mode, toggle via hamburger |

- **Wide screens** (desktop, iPad landscape): Drawer is open by default and remains persistent. Content area adjusts width accordingly.
- **Narrow screens** (phones, iPad portrait): Drawer is closed by default. User taps hamburger menu (☰) to open as an overlay.
- Drawer state can be toggled by user at any breakpoint
- Drawer state preference is not persisted across sessions (always defaults based on viewport)

### Mobile Routes

| Route | Description |
|-------|-------------|
| `/(app)/` | Current/new conversation view |
| `/(app)/c/[id]` | Specific conversation (deep link) |
| `/(app)/settings` | User preferences |

**Mobile Layout:**
- Drawer navigation (swipe from left or tap hamburger)
- Drawer contains conversation history list
- Main screen shows conversation with floating record button
- Header: hamburger menu (☰), "Mabel" title (center), new chat button (⊕ orange, right)

**Mobile Drawer Contents:**

*See mockup: [Menu](mockups/mobile/Menu.png)*

```
┌────────────────────────────┐
│ Mabel                   ⊕  │  ← Logo + new chat button
├────────────────────────────┤
│ Recents                    │  ← Section header
│ ─────────────────────────  │
│ 25yo Female with appendic… │  ← Conversation title (truncated)
│ Follow-up hypertension ma… │
│ Knee injury assessment...  │
│                            │
│                            │
│                            │
├────────────────────────────┤
│ 👤 Dr Payne                │  ← User profile at bottom
└────────────────────────────┘
```

**New Conversation Welcome Screen:**

*See mockup: [New Conversation](mockups/mobile/New%20Conversation.png)*

When no conversation is active (fresh start or after creating new chat):

```
┌────────────────────────────────────┐
│ ☰         Mabel              ⊕     │
│                                    │
│                                    │
│                                    │
│      Good morning!                 │  ← Time-based greeting
│   Describe your consultation,      │
│   and I'll start transcribing it   │
│   for you.                         │
│                                    │
│                                    │
│                                    │
│   ┌────────────────────────┐       │
│   │ ▎▎▎▎▎▎▎▎▎▎▎▎▎▎      🎤 │       │  ← Recording bar
│   └────────────────────────┘       │
│                                    │
│ Mabel can make mistakes. Always    │  ← Disclaimer
│ review content and use your own    │
│ judgement.                         │
└────────────────────────────────────┘
```

**Time-based greetings:**
- 5am-12pm: "Good morning!"
- 12pm-5pm: "Good afternoon!"
- 5pm-9pm: "Good evening!"
- 9pm-5am: "Working late?"

## Realtime Subscriptions

Subscribe to new messages in the current conversation:

```typescript
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'conversation_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Add new message to local state
    addMessage(payload.new as ConversationMessage);
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'conversation_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Update existing message (e.g., upload progress, suggestion status)
    updateMessage(payload.new as ConversationMessage);
  })
  .subscribe();
```

Also subscribe to conversation updates (for title changes):

```typescript
supabase
  .channel(`conversation-meta:${conversationId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'conversations',
    filter: `id=eq.${conversationId}`
  }, (payload) => {
    updateConversationMeta(payload.new);
  })
  .subscribe();
```

## Server Actions / API

### Conversations

```typescript
// Create new conversation
async function createConversation(): Promise<{ id: string }>

// Get conversation with messages
async function getConversation(id: string): Promise<{
  conversation: Conversation;
  messages: ConversationMessage[];
}>

// List conversations for current user
async function getConversations(): Promise<{
  conversations: Array<Conversation & {
    last_message?: ConversationMessage;
    message_count: number;
  }>;
}>

// Archive conversation
async function archiveConversation(id: string): Promise<void>

// Unarchive conversation
async function unarchiveConversation(id: string): Promise<void>
```

### Messages

```typescript
// Add message (for practitioner messages: user_edit, accepted_suggestion)
async function addMessage(
  conversationId: string,
  message: {
    participant_type: ParticipantType;
    message_type: MessageType;
    content?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ConversationMessage>

// Update message metadata (for upload progress, suggestion status)
async function updateMessageMetadata(
  messageId: string,
  metadata: Record<string, unknown>
): Promise<void>
```

## Integration with Recording Flow

When a recording is created, it must be linked to a conversation:

```typescript
async function startRecording(conversationId?: string) {
  // 1. Create conversation if not provided
  const convId = conversationId ?? (await createConversation()).id;

  // 2. Create recording row linked to conversation
  const recording = await supabase.from('recordings').insert({
    practitioner_id: user.id,
    conversation_id: convId,
    audio_path: '', // Filled after upload
    status: 'recording'
  }).select().single();

  // 3. Insert recording_upload message
  await addMessage(convId, {
    participant_type: 'practitioner',
    message_type: 'recording_upload',
    metadata: {
      recording_id: recording.id,
      status: 'recording',
      duration_seconds: 0
    }
  });

  // 4. Start actual recording...
  return { conversationId: convId, recordingId: recording.id };
}
```

## Integration with process-recording Edge Function

After processing completes, add messages to conversation:

```typescript
// In process-recording edge function
async function addProcessingMessages(
  conversationId: string,
  recordingId: string,
  transcriptId: string,
  results: {
    enhanced_text: string;
    raw_text: string;
    summary: string;
    suggestions: Suggestion[];
    confidence: number;
  }
) {
  const messages = [];

  // 1. Transcription result
  messages.push({
    conversation_id: conversationId,
    participant_type: 'transcription_ai',
    message_type: 'transcription_result',
    content: results.enhanced_text,
    metadata: {
      recording_id: recordingId,
      transcript_id: transcriptId,
      raw_text: results.raw_text,
      word_count: results.enhanced_text.split(/\s+/).length,
      confidence: results.confidence
    }
  });

  // 2. Suggestions (if any)
  if (results.suggestions.length > 0) {
    messages.push({
      conversation_id: conversationId,
      participant_type: 'suggestions_ai',
      message_type: 'suggestion',
      content: 'I noticed some elements that may need attention:',
      metadata: {
        recording_id: recordingId,
        suggestions: results.suggestions.map(s => ({
          ...s,
          id: crypto.randomUUID(),
          status: 'pending'
        }))
      }
    });
  }

  // 3. Summary
  messages.push({
    conversation_id: conversationId,
    participant_type: 'summary_ai',
    message_type: 'summary',
    content: results.summary,
    metadata: { recording_id: recordingId }
  });

  // Insert all messages
  await supabase.from('conversation_messages').insert(messages);

  // Update conversation title if this is the first recording
  const { data: conv } = await supabase
    .from('conversations')
    .select('title')
    .eq('id', conversationId)
    .single();

  if (!conv.title) {
    await supabase
      .from('conversations')
      .update({ title: results.summary })
      .eq('id', conversationId);
  }

  // Update recording status
  await supabase
    .from('recordings')
    .update({ status: 'completed' })
    .eq('id', recordingId);
}
```

## Export Functionality

Compile final transcript from all recordings in conversation:

```typescript
async function exportTranscript(conversationId: string): Promise<string> {
  // Get all transcription results and user edits, ordered by creation
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .in('message_type', ['transcription_result', 'user_edit'])
    .order('created_at', { ascending: true });

  // Group by recording_id, take latest version of each
  const transcriptsByRecording = new Map<string, string>();

  for (const msg of messages) {
    const recordingId = msg.metadata.recording_id;
    // user_edit overwrites transcription_result for same recording
    transcriptsByRecording.set(recordingId, msg.content);
  }

  // Combine all transcripts
  return Array.from(transcriptsByRecording.values()).join('\n\n---\n\n');
}
```

## UI Components

### Shared Components (both platforms)

| Component | Description |
|-----------|-------------|
| `ConversationList` | List of conversations with title, preview, timestamp |
| `ConversationView` | Scrollable message list with input bar at bottom |
| `MessageBubble` | Renders message based on participant/type |
| `RecordingEntry` | Audio waveform with play button + tick status indicator |
| `TextEntry` | Text message bubble with tick status indicator |
| `TickStatus` | Renders 1-2 ticks (grey/blue) or error cross based on status |
| `ArtifactCard` | Collapsible card for transcript with Review/Review on web actions |
| `InputBar` | Combined text input + record button (see below) |
| `WelcomePrompt` | Time-based greeting + prompt text for new conversations |
| `Disclaimer` | "Mabel can make mistakes..." footer text |

### Input Bar Component

The input bar combines text entry and recording in a single component. The mic button transforms based on input state.

```
┌────────────────────────────────────────────────────────┐
│  Type or record your notes...              🎤 │       │
└────────────────────────────────────────────────────────┘
                                              ↑
                                        Record button
                                        (default state)

┌────────────────────────────────────────────────────────┐
│  Patient has chest pain for 3 days             │ ➤    │
└────────────────────────────────────────────────────────┘
                                                   ↑
                                              Send button
                                        (when text entered)
```

**Behavior:**
- Empty field: Show mic button (🎤) - tap to record
- Text entered: Show send button (➤) - tap to submit text
- Send button uses orange accent color when active
- Can switch freely between typing and recording
- Pressing send clears the input and creates a `text_entry` message

### Recording Entry Component

*See mockup: [Conversation Recording Entry](mockups/mobile/Conversation%20Recording%20Entry.png)*

The recording entry displays the audio recording with playback and status:

```
┌─────────────────────────────────┐
│ ▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎      ▶  │  ← Waveform + play button (green)
└─────────────────────────────────┘
                               ✓✓   ← Tick status (below, right-aligned)
```

- **Waveform**: Visual representation of audio amplitude
- **Play button**: Green circle with play icon, tapping plays recording
- **Tick status**: Appears below the bubble, right-aligned

### Message Bubble Styling

| Participant | Alignment | Background | Border |
|-------------|-----------|------------|--------|
| `practitioner` (recording) | Right | White/card background | Subtle shadow |
| `transcription_ai` | Left | Transparent | None |
| `suggestions_ai` | Left | Transparent | None |
| `summary_ai` | Left | Transparent | None |
| `system` | Center | Transparent | None |

**Note**: AI responses appear as plain text (no bubble), while practitioner recordings appear in a card-style bubble with the waveform.
