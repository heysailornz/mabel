# Payments & Credits

Credit-based system with Stripe Checkout integration.

## Credit System

- New users receive **5 free credits** on signup
- Each transcription costs **1 credit**
- Minimum purchase: **10 credits**
- Credits **never expire**
- Failed transcriptions are **automatically refunded**

## Payment Flow

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

## Stripe Setup

### Products and Prices

Create in Stripe Dashboard:

| Product | Credits | Price |
|---------|---------|-------|
| 10 Credits | 10 | $X.XX |
| 25 Credits | 25 | $X.XX |
| 50 Credits | 50 | $X.XX |
| 100 Credits | 100 | $X.XX |

Store price IDs in environment variables:

```env
STRIPE_PRICE_10_CREDITS=price_...
STRIPE_PRICE_25_CREDITS=price_...
STRIPE_PRICE_50_CREDITS=price_...
STRIPE_PRICE_100_CREDITS=price_...
```

## Stripe Checkout Integration

### Create Checkout Session

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
    success_url: `${process.env.NEXT_PUBLIC_WEB_URL}/credits?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_WEB_URL}/credits?payment=cancelled`,
  });

  return { url: session.url };
}
```

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const practitionerId = session.metadata?.practitioner_id;
    const creditAmount = parseInt(session.metadata?.credit_amount || "0");

    if (practitionerId && creditAmount > 0) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

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

## Database Functions

See [database.md](./database.md) for complete SQL, key functions:

- `add_credits(practitioner_id, amount, type, ...)` - Add credits atomically
- `use_credit(practitioner_id, recording_id)` - Deduct credit, returns boolean
- `refund_credit(practitioner_id, recording_id)` - Refund on failure

### Process Pending Recordings

```sql
create or replace function process_pending_credit_recordings(
  p_practitioner_id uuid
) returns void as $$
declare
  pending_recording record;
begin
  -- Get all pending_credits recordings for this practitioner
  for pending_recording in
    select id, conversation_id, audio_path
    from recordings
    where practitioner_id = p_practitioner_id
      and status = 'pending_credits'
    order by created_at asc
  loop
    -- Try to use a credit for each
    if use_credit(p_practitioner_id, pending_recording.id) then
      -- Update status to pending (will trigger processing)
      update recordings
      set status = 'pending'
      where id = pending_recording.id;

      -- Trigger processing (via pg_notify or webhook)
      perform pg_notify('process_recording', json_build_object(
        'recording_id', pending_recording.id,
        'practitioner_id', p_practitioner_id,
        'conversation_id', pending_recording.conversation_id,
        'audio_path', pending_recording.audio_path
      )::text);
    else
      -- No more credits, stop processing
      exit;
    end if;
  end loop;
end;
$$ language plpgsql security definer set search_path = '';
```

## UI Components

### Web: Credit Balance

```typescript
// In header/navbar
function CreditBalance() {
  const { data: practitioner } = usePractitioner();

  return (
    <div className="flex items-center gap-2">
      <CreditCardIcon className="h-4 w-4" />
      <span>{practitioner?.credits ?? 0} credits</span>
      {practitioner?.credits <= 2 && (
        <Badge variant="warning">Low</Badge>
      )}
    </div>
  );
}
```

### Web: Buy Credits Page

```typescript
// app/(app)/credits/page.tsx
const CREDIT_PACKAGES = [
  { id: "10", credits: 10, priceId: process.env.STRIPE_PRICE_10_CREDITS },
  { id: "25", credits: 25, priceId: process.env.STRIPE_PRICE_25_CREDITS },
  { id: "50", credits: 50, priceId: process.env.STRIPE_PRICE_50_CREDITS },
  { id: "100", credits: 100, priceId: process.env.STRIPE_PRICE_100_CREDITS },
];

export default function CreditsPage() {
  async function handlePurchase(priceId: string, credits: number) {
    const { url } = await createCheckoutSession(user.id, priceId, credits);
    window.location.href = url;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {CREDIT_PACKAGES.map((pkg) => (
        <Card key={pkg.id}>
          <CardHeader>
            <CardTitle>{pkg.credits} Credits</CardTitle>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => handlePurchase(pkg.priceId, pkg.credits)}>
              Buy Now
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

### Mobile: Credit Balance

```typescript
function CreditBadge() {
  const { data: practitioner } = usePractitioner();

  return (
    <View className="flex-row items-center gap-2">
      <Text>{practitioner?.credits ?? 0}</Text>
      {practitioner?.credits <= 2 && (
        <View className="bg-warning rounded px-2">
          <Text className="text-xs">Low</Text>
        </View>
      )}
    </View>
  );
}
```

### Mobile: Buy Credits

Use WebView or in-app browser to redirect to web credits page:

```typescript
import * as WebBrowser from 'expo-web-browser';

async function openBuyCredits() {
  await WebBrowser.openBrowserAsync(
    `${WEB_URL}/credits?mobile=true`
  );
}
```

### Pending Credits State

```typescript
// In conversation message list
function RecordingMessage({ message }: { message: ConversationMessage }) {
  const status = message.metadata.status;

  if (status === "pending_credits") {
    return (
      <Card className="border-warning">
        <CardContent>
          <Text>Recording waiting for credits</Text>
          <Button onPress={openBuyCredits}>
            Buy Credits to Process
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ... other statuses
}
```

## Low Balance Warnings

Show warning when credits ≤ 2:

```typescript
function LowBalanceWarning() {
  const { data: practitioner } = usePractitioner();

  if (!practitioner || practitioner.credits > 2) return null;

  return (
    <Alert variant="warning">
      <AlertTitle>Low Credits</AlertTitle>
      <AlertDescription>
        You have {practitioner.credits} credits remaining.
        <Link href="/credits">Buy more</Link>
      </AlertDescription>
    </Alert>
  );
}
```

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_10_CREDITS=price_...
STRIPE_PRICE_25_CREDITS=price_...
STRIPE_PRICE_50_CREDITS=price_...
STRIPE_PRICE_100_CREDITS=price_...
```

## Libraries

- `stripe` - Stripe API (server-side)
- `expo-web-browser` - In-app browser for mobile payments

## Related Specs

- [database.md](./database.md) - Credit tables and functions
- [transcription.md](./transcription.md) - Credit check in processing
