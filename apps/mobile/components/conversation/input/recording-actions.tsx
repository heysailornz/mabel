/**
 * Recording Actions Component
 *
 * Action buttons for recording/recorded modes (delete, mic/pause, send).
 */

import React, { useCallback, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Mic, Trash2, Check } from "lucide-react-native";
import { COLORS } from "@project/core/theme";
import { SendButton } from "@/components/ui/send-button";
import type { InputState } from "./types";
import type { RecordingStatus } from "@project/core";

interface RecordingActionsProps {
  state: InputState;
  recordingStatus: RecordingStatus;
  paddingBottom: number;
  onDelete: () => void;
  onMicPress: () => void;
  onFinalizeRecording: () => void;
  onSend: () => void;
}

export function RecordingActions({
  state,
  recordingStatus,
  paddingBottom,
  onDelete,
  onMicPress,
  onFinalizeRecording,
  onSend,
}: RecordingActionsProps) {
  const isActivelyRecording = recordingStatus === "recording";
  const isPaused = recordingStatus === "paused";
  const isRecordedState = state === "recorded";
  const canSend = state !== "recording" || recordingStatus === "paused";

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  }, [onDelete]);

  return (
    <View
      className="flex-row items-center justify-between px-4 pt-2"
      style={{ paddingBottom }}
    >
      {/* Delete button */}
      <Pressable onPress={handleDelete} className="p-2 active:opacity-70">
        <Trash2 size={28} color={COLORS.icon.default} />
      </Pressable>

      {/* Center button: context-dependent */}
      <CenterButton
        isRecordedState={isRecordedState}
        isActivelyRecording={isActivelyRecording}
        isPaused={isPaused}
        onMicPress={onMicPress}
        onFinalizeRecording={onFinalizeRecording}
      />

      {/* Send button (shows Check when paused to indicate "finish recording") */}
      <SendButton
        onPress={onSend}
        disabled={!canSend}
        icon={isPaused ? Check : undefined}
      />
    </View>
  );
}

interface CenterButtonProps {
  isRecordedState: boolean;
  isActivelyRecording: boolean;
  isPaused: boolean;
  onMicPress: () => void;
  onFinalizeRecording: () => void;
}

/**
 * Pulsing circle animation component for active recording state
 */
function PulsingCircle({ isActive }: { isActive: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (isActive) {
      // Start pulsing animation
      scale.value = withRepeat(
        withTiming(1.8, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1, // infinite
        false // don't reverse, restart from beginning
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 0.4;
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [isActive, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!isActive) return null;

  return (
    <Animated.View
      style={[styles.pulsingCircle, animatedStyle]}
      pointerEvents="none"
    />
  );
}

function CenterButton({
  isRecordedState,
  isActivelyRecording,
  isPaused,
  onMicPress,
  onFinalizeRecording,
}: CenterButtonProps) {
  const handleMicPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMicPress();
  }, [onMicPress]);

  const handleFinalizeRecording = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onFinalizeRecording();
  }, [onFinalizeRecording]);

  if (isRecordedState) {
    // In recorded state, mic button starts new recording
    return (
      <Pressable onPress={handleMicPress} className="active:opacity-80">
        <Mic size={28} color={COLORS.icon.default} strokeWidth={1.5} />
      </Pressable>
    );
  }

  if (isActivelyRecording || isPaused) {
    // When recording or paused, show mic button with pulsing circle (only when active)
    // Tap to pause (if recording) or resume (if paused)
    // Red when actively recording, black when paused
    const micColor = isActivelyRecording ? COLORS.icon.destructive : COLORS.icon.default;
    return (
      <View style={styles.centerButtonContainer}>
        <PulsingCircle isActive={isActivelyRecording} />
        <Pressable onPress={handleMicPress} className="active:opacity-80">
          <View style={styles.micButtonInner}>
            <Mic size={28} color={micColor} strokeWidth={1.5} />
          </View>
        </Pressable>
      </View>
    );
  }

  // Default mic button
  return (
    <Pressable onPress={handleMicPress} className="active:opacity-80">
      <Mic size={28} color={COLORS.icon.default} strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
  },
  pulsingCircle: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.destructive,
  },
  micButtonInner: {
    alignItems: "center",
    justifyContent: "center",
  },
});
