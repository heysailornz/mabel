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

## Specification Files

| File | Description | When to Read |
|------|-------------|--------------|
| [CHECKLIST.md](./CHECKLIST.md) | Implementation phases with task checkboxes | Starting any implementation work |
| [conversations.md](./conversations.md) | Conversation/message system, routes, UI components, realtime | Building conversation UI, message handling |
| [database.md](./database.md) | Full schema, RLS policies, database functions | Any database work, migrations |
| [recording-upload.md](./recording-upload.md) | Audio recording, TUS uploads, offline queue | Mobile recording, upload functionality |
| [transcription.md](./transcription.md) | Deepgram integration, vocabulary corrections, AI summary/suggestions | Transcription pipeline, edge functions |
| [authentication.md](./authentication.md) | Email OTP flow, QR code login, session management | Auth implementation, login flows |
| [payments.md](./payments.md) | Credit system, Stripe checkout, webhooks | Payment integration, credit management |
| [learning-pipeline.md](./learning-pipeline.md) | Vocabulary dictionary, correction tracking | Learning system, vocabulary features |
| [security.md](./security.md) | HIPAA considerations, encryption, RLS | Security review, compliance |
| [environment.md](./environment.md) | All environment variables | Setup, deployment configuration |
| [theming.md](./theming.md) | CSS variables, color palette, shadcn/ui, NativeWind | Styling, dark mode, component theming |

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
├── spec/                     # This directory - specifications
│
└── package.json              # Monorepo root (pnpm workspaces + turborepo)
```

## Notes

- Start with Deepgram's medical model for best out-of-box accuracy
- TUS resumable uploads handle large files reliably on mobile networks
- Use direct storage URL (`project-id.storage.supabase.co`) for upload performance
- Audio recordings use AAC mono 128kbps (~1MB/min) for optimal size/quality balance
- Local queue ensures recordings are never lost, even offline
- Consider PWA for web app to allow offline viewing of past transcripts
- Plan for multi-tenant if selling to healthcare organizations
