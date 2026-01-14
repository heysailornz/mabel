# Environment Variables

All environment variables required for the application.

## Supabase

```env
# Public (exposed to client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Mobile (Expo)

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Transcription API

```env
# Deepgram
DEEPGRAM_API_KEY=...
```

## AI / LLM

```env
# Anthropic Claude
ANTHROPIC_API_KEY=...
```

## Stripe Payments

```env
# API Keys
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for development
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_10_CREDITS=price_...
STRIPE_PRICE_25_CREDITS=price_...
STRIPE_PRICE_50_CREDITS=price_...
STRIPE_PRICE_100_CREDITS=price_...
```

## Application URLs

```env
# Web app URL (for redirects, webhooks, etc.)
NEXT_PUBLIC_WEB_URL=https://app.example.com

# For local development
# NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

## Local Development

### Web (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...local-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...local-service-key...

# APIs (use test keys)
DEEPGRAM_API_KEY=...
ANTHROPIC_API_KEY=...

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe test prices
STRIPE_PRICE_10_CREDITS=price_test_...
STRIPE_PRICE_25_CREDITS=price_test_...
STRIPE_PRICE_50_CREDITS=price_test_...
STRIPE_PRICE_100_CREDITS=price_test_...

# URLs
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

### Mobile (.env)

```env
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...local-anon-key...
```

Note: For mobile, use your machine's IP address instead of localhost when testing on physical devices.

## Edge Functions

Edge functions access secrets via `Deno.env.get()`:

```typescript
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const deepgramKey = Deno.env.get("DEEPGRAM_API_KEY");
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
```

Set edge function secrets via CLI:

```bash
supabase secrets set DEEPGRAM_API_KEY=...
supabase secrets set ANTHROPIC_API_KEY=...
```

## Validation

Validate required environment variables at startup:

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

## Security Notes

- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate keys periodically
- Service role key should only be used server-side

## Related Specs

- [security.md](./security.md) - Security considerations for secrets
