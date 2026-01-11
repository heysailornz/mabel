import React from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthCard } from "@/components/auth/auth-card";
import { Logo } from "@/components/Logo";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1">
        {/* Branding area */}
        <View className="flex-1 items-center justify-center">
          <Logo width={160} height={48} />
        </View>

        {/* Auth card at bottom */}
        <View
          style={{
            paddingBottom: Math.max(insets.bottom, 24) + 24,
            paddingHorizontal: 24,
          }}
        >
          <AuthCard />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
