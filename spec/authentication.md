# Authentication

Email OTP (primary) and QR code (secondary) authentication flows.

## Overview

| Method | Platform | Use Case |
|--------|----------|----------|
| Email OTP | Both | Primary authentication method |
| QR Code | Web (scan from mobile) | Quick login when already authenticated on mobile |

## Email OTP (Primary)

### Request OTP

```typescript
async function requestOTP(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  return { error };
}
```

### Verify OTP

```typescript
async function verifyOTP(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  return { data, error };
}
```

### Web Implementation

```typescript
// server/actions/auth.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithOTP(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function verifyOTP(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/hello");
}
```

### Mobile Implementation

```typescript
// Using shared hook from @project/hooks
import { useAuthFlow } from "@project/hooks";

function AuthScreen() {
  const { email, setEmail, otp, setOtp, step, sendOTP, verifyOTP, loading, error } = useAuthFlow();

  if (step === "email") {
    return (
      <View>
        <Input value={email} onChangeText={setEmail} placeholder="Email" />
        <Button onPress={sendOTP} disabled={loading}>
          <Text>Send Code</Text>
        </Button>
      </View>
    );
  }

  return (
    <View>
      <OTPInput value={otp} onChange={setOtp} />
      <Button onPress={verifyOTP} disabled={loading}>
        <Text>Verify</Text>
      </Button>
    </View>
  );
}
```

## QR Code Login (Secondary)

For quick web login when already authenticated on mobile.

### Flow

```
1. Web shows QR code with session token
2. Mobile scans QR code
3. Mobile authenticates the session
4. Web receives realtime update and logs in
```

### Web: Generate QR Session

```typescript
// server/actions/auth.ts
export async function createQRSession() {
  const supabase = await createClient();
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

### Web: QR Code Display

```typescript
import QRCode from "qrcode.react";

function QRLogin() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    createQRSession().then(({ token }) => setToken(token));
  }, []);

  useEffect(() => {
    if (!token) return;

    const channel = supabase
      .channel(`web_session:${token}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "web_sessions",
          filter: `token=eq.${token}`,
        },
        async (payload) => {
          if (payload.new.status === "authenticated") {
            await createSessionFromQR(payload.new.practitioner_id);
            router.push("/hello");
          }
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [token]);

  const qrData = JSON.stringify({
    token,
    url: process.env.NEXT_PUBLIC_WEB_URL,
  });

  return (
    <div>
      {token && <QRCode value={qrData} size={200} />}
      <p>Scan with your phone to log in</p>
    </div>
  );
}
```

### Mobile: QR Scanner

```typescript
import { Camera } from "expo-camera";

async function authenticateWebSession(qrData: { token: string }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  await supabase
    .from("web_sessions")
    .update({
      practitioner_id: user.id,
      status: "authenticated",
    })
    .eq("token", qrData.token)
    .eq("status", "pending");
}

function QRScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    try {
      const qrData = JSON.parse(data);
      await authenticateWebSession(qrData);
      Alert.alert("Success", "Web session authenticated");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to authenticate");
      setScanned(false);
    }
  }

  return (
    <Camera
      style={{ flex: 1 }}
      onBarCodeScanned={handleBarCodeScanned}
      barCodeScannerSettings={{
        barCodeTypes: ["qr"],
      }}
    />
  );
}
```

## Session Management

### Web Auto-Logout

```typescript
// Inactivity timeout: 15-30 minutes
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

### QR Token Expiry

- QR tokens expire after 5 minutes if not scanned
- Single-use: token invalidated after successful authentication
- Background job to clean expired sessions

```sql
-- Clean expired sessions (run periodically)
DELETE FROM web_sessions
WHERE status = 'pending' AND expires_at < now();
```

## Mobile Libraries

- `expo-camera` - QR scanning
- `expo-secure-store` - Token storage
- `@supabase/supabase-js` - Auth client

## Web Libraries

- `@supabase/ssr` - SSR auth (supports OTP natively)
- `qrcode.react` - QR generation

## Routes

### Web

| Route | Description |
|-------|-------------|
| `/auth` | Email OTP + QR code display |

### Mobile

| Screen | Description |
|--------|-------------|
| Auth | Email OTP flow |
| Scan QR | QR scanner for web authentication |

## Related Specs

- [database.md](./database.md) - web_sessions table
- [security.md](./security.md) - Session security requirements
