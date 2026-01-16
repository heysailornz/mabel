/**
 * Recording Actions Component
 *
 * Action buttons for recording/recorded modes (delete, mic/stop, send).
 */

import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Mic, Trash2, Send, Square } from "lucide-react-native";
import { COLORS } from "@project/core/theme";
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

  const handleSend = useCallback(() => {
    if (canSend) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSend();
    }
  }, [canSend, onSend]);

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

      {/* Send button */}
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        className={`h-12 w-12 items-center justify-center rounded-full bg-accent active:opacity-90 ${
          !canSend ? "opacity-50" : ""
        }`}
        style={{ borderCurve: "continuous" }}
      >
        <Send size={22} color={COLORS.icon.white} />
      </Pressable>
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

  if (isActivelyRecording) {
    // When recording, show stop button to finalize
    return (
      <Pressable onPress={handleFinalizeRecording} className="active:opacity-80">
        <Square size={28} color={COLORS.icon.destructive} fill={COLORS.icon.destructive} />
      </Pressable>
    );
  }

  if (isPaused) {
    // When paused, show mic button to resume
    return (
      <Pressable onPress={handleMicPress} className="active:opacity-80">
        <Mic size={28} color={COLORS.icon.destructive} strokeWidth={1.5} />
      </Pressable>
    );
  }

  // Default mic button
  return (
    <Pressable onPress={handleMicPress} className="active:opacity-80">
      <Mic size={28} color={COLORS.icon.default} strokeWidth={1.5} />
    </Pressable>
  );
}
