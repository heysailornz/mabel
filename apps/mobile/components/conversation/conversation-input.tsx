/**
 * Conversation Input Component
 *
 * Main input component that manages text input and audio recording.
 * Uses sub-components for different states (text, recording, recorded).
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Keyboard, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSpectrumRecording } from "@/hooks/use-spectrum-recording";
import { toast } from "@/lib/toast";
import type { InputMode } from "./conversation-input-sheet";
import {
  TextInputArea,
  RecordingArea,
  RecordedArea,
  TextActions,
  RecordingActions,
  type InputState,
} from "./input";

interface ConversationInputProps {
  initialMode: InputMode;
  isOpen: boolean;
  onSubmitText: (text: string) => void;
  onSubmitRecording: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export function ConversationInput({
  initialMode,
  isOpen,
  onSubmitText,
  onSubmitRecording,
  onCancel,
}: ConversationInputProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [state, setState] = useState<InputState>("resting");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const recordedUriRef = useRef<string | null>(null);
  const recordedDurationRef = useRef<number>(0);
  const recordedSpectrumHistoryRef = useRef<number[][] | undefined>(undefined);
  const hasStartedRecording = useRef(false);

  // Recording hook with spectrum analysis
  const {
    status: recordingStatus,
    duration: recordingDuration,
    spectrum,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    playRecording,
    stopPlayback,
    isPlaying,
  } = useSpectrumRecording();

  // Determine effective state based on text content
  const effectiveState: InputState =
    text.length > 0 && state === "resting" ? "typing" : state;

  // Calculate bottom padding based on keyboard state
  const bottomPadding = keyboardVisible ? 16 : Math.max(insets.bottom, 24);

  // ==========================================================================
  // Keyboard tracking
  // ==========================================================================

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardVisible(false)
    );
    // Android fallback
    const showSubAndroid = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideSubAndroid = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
      showSubAndroid.remove();
      hideSubAndroid.remove();
    };
  }, []);

  // ==========================================================================
  // Recording handlers
  // ==========================================================================

  const handleStartRecording = useCallback(async () => {
    recordedUriRef.current = null;
    recordedDurationRef.current = 0;
    await startRecording();
    setState("recording");
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    const result = await stopRecording();
    if (result) {
      recordedUriRef.current = result.uri;
      recordedDurationRef.current = result.duration;
      recordedSpectrumHistoryRef.current = result.spectrumHistory;
      setState("recorded");
    }
  }, [stopRecording]);

  const handlePauseRecording = useCallback(async () => {
    await pauseRecording();
  }, [pauseRecording]);

  const handleResumeRecording = useCallback(async () => {
    await resumeRecording();
  }, [resumeRecording]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Auto-focus text input when sheet opens in text mode
  useEffect(() => {
    if (isOpen && initialMode === "text") {
      inputRef.current?.focus();
    }
  }, [isOpen, initialMode]);

  // Start recording when sheet opens in recording mode
  useEffect(() => {
    if (
      isOpen &&
      initialMode === "recording" &&
      state === "resting" &&
      !hasStartedRecording.current
    ) {
      hasStartedRecording.current = true;
      handleStartRecording();
    }
    if (!isOpen) {
      hasStartedRecording.current = false;
    }
  }, [isOpen, initialMode, state, handleStartRecording]);

  // Sync recording status with component state
  useEffect(() => {
    if (recordingStatus === "recording") {
      setState("recording");
    } else if (recordingStatus === "paused" || recordingStatus === "stopped") {
      if (recordedUriRef.current) {
        setState("recorded");
      }
    }
  }, [recordingStatus]);

  // Show recording errors
  useEffect(() => {
    if (recordingError) {
      console.error("[ConversationInput] Recording error:", recordingError);
      toast.error(recordingError);
    }
  }, [recordingError]);

  // ==========================================================================
  // Action handlers
  // ==========================================================================

  const handleSend = useCallback(() => {
    if (effectiveState === "typing" && text.trim()) {
      onSubmitText(text.trim());
      setText("");
      setState("resting");
    } else if (state === "recorded" && recordedUriRef.current) {
      onSubmitRecording(recordedUriRef.current, recordedDurationRef.current);
      recordedUriRef.current = null;
      recordedDurationRef.current = 0;
      setState("resting");
    }
  }, [effectiveState, text, state, onSubmitText, onSubmitRecording]);

  const handleMicPress = useCallback(async () => {
    if (state === "resting" || effectiveState === "typing") {
      setText("");
      await handleStartRecording();
    } else if (state === "recording") {
      if (recordingStatus === "recording") {
        await handlePauseRecording();
      } else if (recordingStatus === "paused") {
        await handleResumeRecording();
      }
    } else if (state === "recorded") {
      await handleStartRecording();
    }
  }, [
    state,
    effectiveState,
    recordingStatus,
    handleStartRecording,
    handlePauseRecording,
    handleResumeRecording,
  ]);

  const handleFinalizeRecording = useCallback(async () => {
    if (recordingStatus === "recording" || recordingStatus === "paused") {
      await handleStopRecording();
    }
  }, [recordingStatus, handleStopRecording]);

  const handleDelete = useCallback(async () => {
    await cancelRecording();
    recordedUriRef.current = null;
    recordedDurationRef.current = 0;
    recordedSpectrumHistoryRef.current = undefined;
    setState("resting");
  }, [cancelRecording]);

  const handlePlayback = useCallback(async () => {
    if (isPlaying) {
      await stopPlayback();
    } else if (recordedUriRef.current) {
      await playRecording(recordedUriRef.current);
    }
  }, [isPlaying, playRecording, stopPlayback]);

  // ==========================================================================
  // Render
  // ==========================================================================

  const isTextMode = effectiveState === "resting" || effectiveState === "typing";
  const isRecordingMode = state === "recording";
  const isRecordedMode = state === "recorded";

  return (
    <View>
      {/* Content area */}
      {isTextMode && (
        <TextInputArea
          ref={inputRef}
          value={text}
          onChangeText={setText}
        />
      )}
      {isRecordingMode && (
        <RecordingArea
          duration={recordingDuration}
          spectrum={spectrum.current}
          isPaused={recordingStatus === "paused"}
        />
      )}
      {isRecordedMode && (
        <RecordedArea
          duration={recordedDurationRef.current || recordingDuration}
          spectrumHistory={recordedSpectrumHistoryRef.current}
          isPlaying={isPlaying}
          onPlayback={handlePlayback}
        />
      )}

      {/* Action buttons */}
      {isTextMode && (
        <TextActions
          hasText={text.trim().length > 0}
          paddingBottom={bottomPadding}
          onSend={handleSend}
          onMicPress={handleMicPress}
        />
      )}
      {(isRecordingMode || isRecordedMode) && (
        <RecordingActions
          state={state}
          recordingStatus={recordingStatus}
          paddingBottom={bottomPadding}
          onDelete={handleDelete}
          onMicPress={handleMicPress}
          onFinalizeRecording={handleFinalizeRecording}
          onSend={handleSend}
        />
      )}
    </View>
  );
}
