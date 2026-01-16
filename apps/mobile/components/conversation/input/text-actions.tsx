/**
 * Text Actions Component
 *
 * Action buttons for text input mode (send/mic).
 */

import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Mic, Send } from "lucide-react-native";
import { COLORS } from "@project/core/theme";

interface TextActionsProps {
  hasText: boolean;
  paddingBottom: number;
  onSend: () => void;
  onMicPress: () => void;
}

export function TextActions({
  hasText,
  paddingBottom,
  onSend,
  onMicPress,
}: TextActionsProps) {
  const handleSend = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSend();
  }, [onSend]);

  const handleMicPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMicPress();
  }, [onMicPress]);

  return (
    <View
      className="flex-row items-center justify-end px-4 pt-2"
      style={{ paddingBottom }}
    >
      {hasText ? (
        <Pressable
          onPress={handleSend}
          className="h-12 w-12 items-center justify-center rounded-full bg-accent active:opacity-90"
          style={{ borderCurve: "continuous" }}
        >
          <Send size={22} color={COLORS.icon.white} />
        </Pressable>
      ) : (
        <Pressable onPress={handleMicPress} className="p-2 active:opacity-80">
          <Mic size={28} color={COLORS.icon.default} strokeWidth={1.5} />
        </Pressable>
      )}
    </View>
  );
}
