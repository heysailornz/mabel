"use client";

import { useRouter } from "next/navigation";
import { requestSignInOTP, verifySignInOTP } from "@/server/actions/auth";
import { useAuthFlow } from "@project/hooks/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function AuthCard() {
  const router = useRouter();
  const { toast } = useToast();

  const auth = useAuthFlow({
    onRequestOTP: async (email) => {
      const result = await requestSignInOTP(email);
      return result ?? { success: false };
    },
    onVerifyOTP: async (email, token) => {
      const result = await verifySignInOTP(email, token);
      return result ?? { success: false };
    },
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
    onError: (message) =>
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      }),
  });

  return (
    <Card className="w-full max-w-md min-w-sm shadow-md">
      <CardContent className="flex flex-col gap-4 px-4">
        {auth.step === "otp" ? (
          <form onSubmit={(e) => { e.preventDefault(); auth.handleVerifyOTP(); }} className="flex flex-col gap-4">
            <p className="text-center text-sm text-foreground">
              Mabel sent a code to{" "}
              <span className="font-semibold">{auth.email}</span>
            </p>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={auth.otpPlaceholder}
              value={auth.token}
              onChange={(e) => auth.setToken(e.target.value)}
              onFocus={() => auth.setOtpFocused(true)}
              onBlur={() => auth.setOtpFocused(false)}
              autoComplete="one-time-code"
              className="h-12 text-center text-lg"
              autoFocus
            />
            <Button type="submit" size="lg" disabled={auth.loading}>
              {auth.loading ? "Verifying..." : "Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={auth.handleBackToEmail}
            >
              Use a different email
            </Button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); auth.handleRequestOTP(); }} className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder={auth.emailPlaceholder}
              value={auth.email}
              onChange={(e) => auth.setEmail(e.target.value)}
              onFocus={() => auth.setEmailFocused(true)}
              onBlur={() => auth.setEmailFocused(false)}
              autoComplete="email"
              className="h-12 text-center"
            />
            <Button type="submit" size="lg" disabled={auth.loading}>
              {auth.loading ? "Sending code..." : "Continue"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
