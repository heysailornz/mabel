/**
 * Shared types for conversation input components
 */

import type { RecordingStatus } from "@project/core";

export type InputState = "resting" | "typing" | "recording" | "recorded";

export interface RecordingState {
  status: RecordingStatus;
  duration: number;
  metering: number | null;
  isPlaying: boolean;
}

export interface InputActions {
  onSend: () => void;
  onMicPress: () => void;
  onDelete: () => void;
  onFinalizeRecording: () => void;
  onPlayback: () => void;
}
