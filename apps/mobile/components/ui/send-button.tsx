/**
 * SendButton Component
 *
 * App-wide send button with arrow-up icon and orange theme color.
 * Used across all input components for consistent send action styling.
 */

import React, { useCallback } from "react";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { ArrowUp, Check, LucideIcon } from "lucide-react-native";
import { COLORS } from "@project/core/theme";

interface SendButtonProps {
  onPress: () => void;
  disabled?: boolean;
  /** Override the default ArrowUp icon */
  icon?: LucideIcon;
}

export function SendButton({ onPress, disabled = false, icon }: SendButtonProps) {
  const handlePress = useCallback(() => {
    if (!disabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPress();
    }
  }, [disabled, onPress]);

  const IconComponent = icon ?? ArrowUp;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`h-12 w-12 items-center justify-center rounded-full bg-accent active:opacity-90 ${
        disabled ? "opacity-50" : ""
      }`}
      style={{ borderCurve: "continuous" }}
    >
      <IconComponent size={22} color={COLORS.icon.white} strokeWidth={2.5} />
    </Pressable>
  );
}

// Re-export Check icon for convenience when needed as alternate icon
export { Check as CheckIcon } from "lucide-react-native";
