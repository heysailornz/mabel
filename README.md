# Monorepo Boilerplate

A production-ready monorepo boilerplate built with Turborepo, featuring a Next.js web app and Expo React Native mobile app with shared packages.

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Web**: Next.js 16.1
- **Mobile**: Expo (managed workflow, SDK 54)
- **Database**: Supabase
- **Auth**: Supabase Auth
- **Web Components**: shadcn/ui
- **Mobile Components**: React Native

## Project Structure

```
project/
├── apps/
│   ├── web/               # Next.js 16.1 web app
│   └── mobile/            # Expo React Native app
├── packages/
│   └── @project/
│       ├── core/          # Shared business logic
│       ├── db/            # Supabase types + clients
│       ├── config/        # Environment validation
│       ├── tsconfig/      # Shared TypeScript configs
│       └── eslint-config/ # Shared ESLint configs
├── supabase/              # Database migrations (shared)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- Node.js 18+
- pnpm 9+
- Supabase CLI (`brew install supabase/tap/supabase`)
- Expo CLI (`npm install -g expo-cli`) - for mobile development

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Supabase

Start local Supabase:

```bash
pnpm db:start
```

Create `.env.local` files for each app:

**apps/web/.env.local:**

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**apps/mobile/.env:**

```env
EXPO_PUBLIC_SUPABASE_URL=http://YOUR_LOCAL_IP:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Note: Mobile requires your machine's local IP, not localhost:

For WiFi:

```bash
ipconfig getifaddr en0
```

or for Ethernet:

```bash
ipconfig getifaddr en1
```

### 3. Build Shared Packages

```bash
pnpm build
```

### 4. Start Development

**Web app:**

```bash
pnpm dev:web
```

**Mobile app:**

```bash
pnpm dev:mobile
```

**Both (parallel):**

```bash
pnpm dev
```

## Available Scripts

### Root

```bash
pnpm dev              # Run all apps in dev mode
pnpm dev:web          # Run web app only
pnpm dev:mobile       # Run mobile app only
pnpm build            # Build all packages and apps
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm typecheck        # Type check all packages
pnpm clean            # Clean all build artifacts
```

### Database

```bash
pnpm db:start         # Start local Supabase
pnpm db:stop          # Stop local Supabase
pnpm db:reset         # Reset database (apply all migrations)
pnpm db:types         # Regenerate TypeScript types
pnpm db:push          # Push migrations to remote
```

## Development Workflow

### Database Changes

1. Create a migration:

```bash
supabase migration new create_your_table
```

2. Apply locally and regenerate types:

```bash
pnpm db:reset
pnpm db:types
```

### Adding Shared Business Logic

Add code to `packages/@project/core/src/`. Both web and mobile apps can import:

```typescript
import { someFunction } from "@project/core";
```

### Adding Web UI Components

```bash
cd apps/web
npx shadcn@latest add button card dialog
```

### Building a Single Package

```bash
pnpm --filter @project/core build
pnpm --filter @project/web build
```

## Architecture

### Shared Packages

- **@project/core**: Platform-agnostic business logic (auth, etc.)
- **@project/db**: Supabase types and platform-specific clients
- **@project/config**: Environment variable validation with Zod
- **@project/tsconfig**: Shared TypeScript configurations
- **@project/eslint-config**: Shared ESLint configurations

### Auth Flow

**Web (Server Actions):**

```
User → Server Action → @project/core → Supabase
```

**Mobile (Direct):**

```
User → Auth Context → @project/core → Supabase
```

The `@project/core` auth functions accept a Supabase client as a parameter, making them platform-agnostic.

### Database Types

Both apps import types from the shared package:

```typescript
import type { Database, TableRow } from "@project/db/types";
```

## Environment Variables

### Web (apps/web/.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Optional, server-side only
```

### Mobile (apps/mobile/.env)

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## License

MIT
