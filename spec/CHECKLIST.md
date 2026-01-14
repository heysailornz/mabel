# Implementation Checklist

This checklist tracks implementation progress. Each task references the relevant spec files to read.

## Phase 1: Core Infrastructure

| Status | Task                                                                     | Specs                                        |
| ------ | ------------------------------------------------------------------------ | -------------------------------------------- |
| [x]    | Update database schema (rename profiles → practitioners, add new tables) | [database.md](./database.md)                 |
| [x]    | Set up email OTP authentication (replace password auth)                  | [authentication.md](./authentication.md)     |
| [x]    | Create storage bucket for recordings                                     | [recording-upload.md](./recording-upload.md) |
| [x]    | Set up Edge Functions directory structure                                | [transcription.md](./transcription.md)       |
| [x]    | Make branded auth UI for web                                             | [authentication.md](./authentication.md)     |
| [x]    | Make branded auth UI for mobile                                          | [authentication.md](./authentication.md)     |
| [x]    | Transactional email styling                                              | [authentication.md](./authentication.md)     |

## Phase 1.5: Conversations

| Status | Task                                                                 | Specs                                                                |
| ------ | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [x]    | Database: Add conversations and conversation_messages tables         | [database.md](./database.md), [conversations.md](./conversations.md) |
| [x]    | Database: Add conversation_id to recordings table                    | [database.md](./database.md)                                         |
| [x]    | Database: RLS policies for conversation access                       | [database.md](./database.md), [security.md](./security.md)           |
| [x]    | Types: Add conversation types to @project/core                       | [conversations.md](./conversations.md)                               |
| [x]    | Hooks: Platform-specific conversation hooks (web + mobile)           | [conversations.md](./conversations.md)                               |
| [x]    | Web: Rename (dashboard) to (app) route group                         | [conversations.md](./conversations.md)                               |
| [x]    | Web: Add side menu component with conversation history               | [conversations.md](./conversations.md)                               |
| [x]    | Web: /hello page - new conversation prompt                           | [conversations.md](./conversations.md)                               |
| [x]    | Web: /c/[id] page - conversation view with messages                  | [conversations.md](./conversations.md)                               |
| [x]    | Mobile: Drawer layout for conversation history                       | [conversations.md](./conversations.md)                               |
| [x]    | Mobile: Conversation view with message list                          | [conversations.md](./conversations.md)                               |
| [x]    | Realtime: Subscribe to conversation messages for live updates        | [conversations.md](./conversations.md)                               |
| [x]    | Mobile: Notification dots for new messages (feature parity with web) | [conversations.md](./conversations.md)                               |

## Phase 2: Recording & Upload

| Status | Task                                                              | Specs                                                                                |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [ ]    | Mobile: Recording controls integration                            | [conversations.md](./conversations.md), [recording-upload.md](./recording-upload.md) |
| [ ]    | Mobile: Audio recording interface with expo-av (AAC mono 128kbps) | [recording-upload.md](./recording-upload.md)                                         |
| [ ]    | Mobile: Local file storage with expo-file-system                  | [recording-upload.md](./recording-upload.md)                                         |
| [ ]    | Mobile: Offline queue persistence with MMKV                       | [recording-upload.md](./recording-upload.md)                                         |
| [ ]    | Mobile: TUS resumable uploads with tus-js-client                  | [recording-upload.md](./recording-upload.md)                                         |
| [ ]    | Mobile: Upload progress UI and retry handling                     | [recording-upload.md](./recording-upload.md)                                         |
| [ ]    | Backend: Storage bucket configuration with RLS                    | [recording-upload.md](./recording-upload.md), [security.md](./security.md)           |
| [ ]    | Backend: Storage trigger for processing pipeline                  | [recording-upload.md](./recording-upload.md), [transcription.md](./transcription.md) |

## Phase 3: Transcription Integration

| Status | Task                                                           | Specs                                                                                  |
| ------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [ ]    | Edge function: process-recording                               | [transcription.md](./transcription.md)                                                 |
| [ ]    | Integrate Deepgram API                                         | [transcription.md](./transcription.md)                                                 |
| [ ]    | Vocabulary corrections layer                                   | [transcription.md](./transcription.md), [learning-pipeline.md](./learning-pipeline.md) |
| [ ]    | Summary generation (Claude)                                    | [transcription.md](./transcription.md)                                                 |
| [ ]    | Suggestions generation (Claude)                                | [transcription.md](./transcription.md)                                                 |
| [ ]    | Backend: Update process-recording to add conversation messages | [transcription.md](./transcription.md), [conversations.md](./conversations.md)         |
| [ ]    | Export: Add transcript export/copy functionality               | [conversations.md](./conversations.md)                                                 |

## Phase 4: Web Transcript Interface

| Status | Task                                               | Specs                                  |
| ------ | -------------------------------------------------- | -------------------------------------- |
| [ ]    | Dashboard with transcript list (showing summaries) | [conversations.md](./conversations.md) |
| [ ]    | Transcript viewer with inline editing              | [conversations.md](./conversations.md) |
| [ ]    | AI suggestions sidebar                             | [conversations.md](./conversations.md) |
| [ ]    | Copy/export functionality                          | [conversations.md](./conversations.md) |

## Phase 5: QR Authentication

| Status | Task                                                | Specs                                                                  |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| [ ]    | Web: Generate QR code on login page                 | [authentication.md](./authentication.md)                               |
| [ ]    | Mobile: QR scanner screen                           | [authentication.md](./authentication.md)                               |
| [ ]    | Backend: web_sessions table + Realtime subscription | [authentication.md](./authentication.md), [database.md](./database.md) |
| [ ]    | Web: Instant login on QR scan                       | [authentication.md](./authentication.md)                               |

## Phase 6: Learning Pipeline

| Status | Task                                         | Specs                                                                                  |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| [ ]    | Track corrections when saving edits          | [learning-pipeline.md](./learning-pipeline.md)                                         |
| [ ]    | Build vocabulary dictionary from corrections | [learning-pipeline.md](./learning-pipeline.md)                                         |
| [ ]    | Apply learned vocabulary to new transcripts  | [learning-pipeline.md](./learning-pipeline.md), [transcription.md](./transcription.md) |

## Phase 7: Payments

| Status | Task                                                                                  | Specs                                                                |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [ ]    | Database: Add credits column and credit_transactions table                            | [database.md](./database.md), [payments.md](./payments.md)           |
| [ ]    | Database: Create credit management functions (add_credits, use_credit, refund_credit) | [database.md](./database.md), [payments.md](./payments.md)           |
| [ ]    | Stripe: Create products and prices in Stripe Dashboard                                | [payments.md](./payments.md)                                         |
| [ ]    | Backend: Stripe Checkout session creation endpoint                                    | [payments.md](./payments.md)                                         |
| [ ]    | Backend: Stripe webhook handler (/api/webhooks/stripe)                                | [payments.md](./payments.md)                                         |
| [ ]    | Backend: Update process-recording to check/use credits                                | [payments.md](./payments.md), [transcription.md](./transcription.md) |
| [ ]    | Web: Credit balance display in header                                                 | [payments.md](./payments.md)                                         |
| [ ]    | Web: Buy credits page with Stripe Checkout redirect                                   | [payments.md](./payments.md)                                         |
| [ ]    | Mobile: Credit balance display                                                        | [payments.md](./payments.md)                                         |
| [ ]    | Mobile: Buy credits flow (WebView or in-app browser)                                  | [payments.md](./payments.md)                                         |
| [ ]    | Both: Low balance warnings (credits ≤ 2)                                              | [payments.md](./payments.md)                                         |
| [ ]    | Both: Pending credits state UI for queued recordings                                  | [payments.md](./payments.md)                                         |

## Phase 8: Polish & Compliance

| Status | Task                            | Specs                        |
| ------ | ------------------------------- | ---------------------------- |
| [ ]    | Security review                 | [security.md](./security.md) |
| [ ]    | Performance optimization        | All relevant specs           |
| [ ]    | User testing with practitioners | -                            |
| [ ]    | Documentation                   | -                            |
