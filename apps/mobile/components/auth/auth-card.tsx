import React from "react";
import { Alert, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { useAuthFlow } from "@project/hooks/auth";
import { getShadow } from "@/lib/shadows";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export function AuthCard() {
  const router = useRouter();
  const { requestOTP, verifyOTP } = useAuth();

  const auth = useAuthFlow({
    onRequestOTP: async (email) => {
      const result = await requestOTP(email);
      return result;
    },
    onVerifyOTP: async (email, token) => {
      const result = await verifyOTP(email, token);
      return result;
    },
    onSuccess: () => {
      Keyboard.dismiss();
      router.replace("/(app)");
    },
    onError: (message) => Alert.alert("Error", message),
  });

  return (
    <Card style={getShadow("md")}>
      <CardContent className="gap-4 p-4">
        {auth.step === "otp" ? (
          <>
            <Text className="text-center text-sm text-foreground">
              Mabel sent a code to{" "}
              <Text className="text-accent-foreground text-sm font-semibold">
                {auth.email}
              </Text>
            </Text>
            <Input
              placeholder={auth.otpPlaceholder}
              value={auth.token}
              onChangeText={auth.setToken}
              onFocus={() => auth.setOtpFocused(true)}
              onBlur={() => auth.setOtpFocused(false)}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              className="text-center text-lg"
            />
            <Button onPress={auth.handleVerifyOTP} disabled={auth.loading} size="lg">
              <Text>{auth.loading ? "Verifying..." : "Continue"}</Text>
            </Button>
            <Button
              variant="ghost"
              onPress={auth.handleBackToEmail}
              size="lg"
            >
              <Text>Use a different email</Text>
            </Button>
          </>
        ) : (
          <>
            <Input
              placeholder={auth.emailPlaceholder}
              value={auth.email}
              onChangeText={auth.setEmail}
              onFocus={() => auth.setEmailFocused(true)}
              onBlur={() => auth.setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              className="text-center"
            />
            <Button
              onPress={auth.handleRequestOTP}
              disabled={auth.loading}
              size="lg"
            >
              <Text>{auth.loading ? "Sending code..." : "Continue"}</Text>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
