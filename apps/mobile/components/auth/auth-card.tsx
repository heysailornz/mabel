import React, { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { requestOTPSchema, verifyOTPSchema } from "@project/core/auth";
import { getShadow } from "@/lib/shadows";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export function AuthCard() {
  const router = useRouter();
  const { requestOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    const validation = requestOTPSchema.safeParse({ email });
    if (!validation.success) {
      Alert.alert("Validation Error", validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await requestOTP(email);
    setLoading(false);

    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      setStep("otp");
      // Alert.alert("Code Sent", "Check your email for the verification code.");
    }
  };

  const handleVerifyOTP = async () => {
    const validation = verifyOTPSchema.safeParse({ email, token });
    if (!validation.success) {
      Alert.alert("Validation Error", validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const result = await verifyOTP(email, token);
    setLoading(false);

    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      router.replace("/(app)");
    }
  };

  return (
    <Card style={getShadow("md")}>
      <CardContent className="gap-4 p-4">
        {step === "otp" ? (
          <>
            <Text className="text-center text-sm text-muted-foreground">
              Mabel sent a code to {email}
            </Text>
            <Input
              placeholder="123456"
              value={token}
              onChangeText={setToken}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              className="h-12 text-center text-lg"
            />
            <Button
              onPress={handleVerifyOTP}
              disabled={loading}
              className="h-12"
            >
              <Text>{loading ? "Verifying..." : "Continue"}</Text>
            </Button>
            <Button
              variant="ghost"
              onPress={() => {
                setStep("email");
                setToken("");
              }}
            >
              <Text>Use a different email</Text>
            </Button>
          </>
        ) : (
          <>
            <Input
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              className="h-12 text-center"
            />
            <Button
              onPress={handleRequestOTP}
              disabled={loading}
              className="h-12"
            >
              <Text>{loading ? "Sending code..." : "Continue"}</Text>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
