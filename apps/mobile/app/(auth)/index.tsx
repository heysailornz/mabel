import React, { useState } from "react";
import { View, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import { requestOTPSchema, verifyOTPSchema } from "@project/core/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      Alert.alert("Code Sent", "Check your email for the verification code.");
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1">
        {/* Branding area */}
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl font-bold text-foreground">MyApp</Text>
        </View>

        {/* Auth card at bottom */}
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 24) + 24,
            paddingHorizontal: 24,
          }}
        >
          <Card
            className="border-0 shadow-2xl"
            style={{
              borderRadius: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <CardContent className="gap-4 p-6">
              {step === "otp" ? (
                <>
                  <Text className="text-center text-sm text-muted-foreground">
                    We sent a code to {email}
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
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    className="h-12"
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
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
