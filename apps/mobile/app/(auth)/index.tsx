import React from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthCard } from "@/components/auth/auth-card";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/ui/text";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1">
        {/* Branding area */}
        <View className="flex-1 items-center justify-center px-6">
          <Logo width={160} height={48} />
          <Text className="mt-6 text-center text-xl font-noto">
            Let me log you in, so I can write your medical notes.
          </Text>
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
