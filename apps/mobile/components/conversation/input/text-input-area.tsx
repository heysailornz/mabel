/**
 * Text Input Area Component
 *
 * Renders the text input for typing messages.
 */

import React, { forwardRef } from "react";
import { TextInput } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { COLORS } from "@project/core/theme";

interface TextInputAreaProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const TextInputArea = forwardRef<TextInput, TextInputAreaProps>(
  function TextInputArea({ value, onChangeText }, ref) {
    return (
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
        className="px-4 py-4"
      >
        <BottomSheetTextInput
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={ref as any}
          value={value}
          onChangeText={onChangeText}
          placeholder="Dictate or enter a consultation note ..."
          placeholderTextColor={COLORS.mutedForeground}
          multiline
          className="text-base text-foreground min-h-[80px]"
          style={{ textAlignVertical: "top" }}
        />
      </Animated.View>
    );
  }
);
