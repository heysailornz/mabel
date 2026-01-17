/**
 * Text Actions Component
 *
 * Action buttons for text input mode (send/mic).
 */

import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Mic } from "lucide-react-native";
import { COLORS } from "@project/core/theme";
import { SendButton } from "@/components/ui/send-button";

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
        <SendButton onPress={onSend} />
      ) : (
        <Pressable onPress={handleMicPress} className="p-2 active:opacity-80">
          <Mic size={28} color={COLORS.icon.default} strokeWidth={1.5} />
        </Pressable>
      )}
    </View>
  );
}
