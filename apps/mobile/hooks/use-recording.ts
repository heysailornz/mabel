/**
 * useRecording Hook
 *
 * Audio recording hook using expo-audio with:
 * - Native pause/resume support
 * - Metering for waveform visualization
 * - AAC mono 128kbps format
 * - Playback support
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  useAudioPlayer,
  IOSOutputFormat,
  AudioQuality,
  type RecordingOptions,
} from "expo-audio";
import { File } from "expo-file-system/next";
import type {
  RecordingStatus,
  RecordingResult,
  UseRecordingReturn,
} from "@project/core";
import { MOBILE_AUDIO_FORMAT } from "@project/core";

/**
 * Custom recording options for AAC mono 128kbps
 */
const RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: MOBILE_AUDIO_FORMAT.extension,
  sampleRate: MOBILE_AUDIO_FORMAT.sampleRate,
  numberOfChannels: MOBILE_AUDIO_FORMAT.numberOfChannels,
  bitRate: MOBILE_AUDIO_FORMAT.bitRate,
  isMeteringEnabled: true,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MAX,
  },
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    outputFormat: "mpeg4",
    audioEncoder: "aac",
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: MOBILE_AUDIO_FORMAT.bitRate,
  },
};

export function useRecording(): UseRecordingReturn {
  // Recording state
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [metering, setMetering] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Refs
  const recordingStartTime = useRef<number>(0);
  const pausedDuration = useRef<number>(0);
  const durationTimer = useRef<NodeJS.Timeout | null>(null);
  const currentRecordingUri = useRef<string | null>(null);

  // Initialize recorder with options
  // Note: The callback receives RecorderState which includes metering when isMeteringEnabled is true
  const recorder = useAudioRecorder(RECORDING_OPTIONS, (state) => {
    // Update metering from recorder status
    // The metering property exists on RecorderState when isMeteringEnabled is true
    if ("metering" in state && typeof state.metering === "number") {
      setMetering(state.metering);
    }
  });

  // Initialize player for playback
  const player = useAudioPlayer(null);

  // Show alert prompting user to enable microphone in settings
  const showPermissionAlert = useCallback(() => {
    Alert.alert(
      "Microphone Access Required",
      "Please enable microphone access in Settings to record audio.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }, []);

  // Configure audio mode for recording (required on iOS)
  const configureAudioMode = useCallback(async () => {
    try {
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    } catch (err) {
      console.error("[useRecording] Failed to configure audio mode:", err);
      throw err;
    }
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await AudioModule.requestRecordingPermissionsAsync();
      if (!result.granted) {
        // Check if we can ask again or need to direct to settings
        if (!result.canAskAgain) {
          showPermissionAlert();
        }
        return false;
      }
      return true;
    } catch (err) {
      console.error("[useRecording] Failed to request permissions:", err);
      setError("Failed to request microphone permissions");
      return false;
    }
  }, [showPermissionAlert]);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    recordingStartTime.current = Date.now();
    durationTimer.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - recordingStartTime.current) / 1000
      );
      setDuration(pausedDuration.current + elapsed);
    }, 100);
  }, []);

  // Stop duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError("Microphone permission is required");
        return;
      }

      // Configure audio mode for recording (required on iOS)
      await configureAudioMode();

      // Prepare and start recording
      await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      recorder.record();

      // Reset state
      pausedDuration.current = 0;
      setDuration(0);
      setMetering(null);
      setStatus("recording");
      startDurationTimer();
    } catch (err) {
      console.error("[useRecording] Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setStatus("idle");
    }
  }, [recorder, requestPermissions, configureAudioMode, startDurationTimer]);

  // Pause recording
  const pauseRecording = useCallback(async () => {
    try {
      if (status !== "recording") return;

      recorder.pause();

      // Store accumulated duration
      pausedDuration.current = duration;
      stopDurationTimer();
      setMetering(null);
      setStatus("paused");
    } catch (err) {
      console.error("[useRecording] Failed to pause recording:", err);
      setError(err instanceof Error ? err.message : "Failed to pause recording");
    }
  }, [recorder, status, duration, stopDurationTimer]);

  // Resume recording
  const resumeRecording = useCallback(async () => {
    try {
      if (status !== "paused") return;

      recorder.record();

      setStatus("recording");
      startDurationTimer();
    } catch (err) {
      console.error("[useRecording] Failed to resume recording:", err);
      setError(err instanceof Error ? err.message : "Failed to resume recording");
    }
  }, [recorder, status, startDurationTimer]);

  // Stop recording and get result
  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    try {
      if (status !== "recording" && status !== "paused") return null;

      stopDurationTimer();
      await recorder.stop();

      const uri = recorder.uri;
      if (!uri) {
        setError("No recording URI available");
        setStatus("idle");
        return null;
      }

      // Get file size using the new File API
      const file = new File(uri);
      const fileSize = file.exists ? file.size ?? 0 : 0;

      // Store URI for playback
      currentRecordingUri.current = uri;

      setStatus("stopped");
      setMetering(null);

      return {
        uri,
        duration: duration,
        fileSize,
      };
    } catch (err) {
      console.error("[useRecording] Failed to stop recording:", err);
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      setStatus("idle");
      return null;
    }
  }, [recorder, status, duration, stopDurationTimer]);

  // Cancel recording (discard)
  const cancelRecording = useCallback(async () => {
    try {
      stopDurationTimer();

      if (status === "recording" || status === "paused") {
        await recorder.stop();
      }

      // Delete the file if it exists
      const uri = recorder.uri;
      if (uri) {
        try {
          const file = new File(uri);
          if (file.exists) {
            file.delete();
          }
        } catch {
          // Ignore deletion errors
        }
      }

      // Reset state
      currentRecordingUri.current = null;
      pausedDuration.current = 0;
      setDuration(0);
      setMetering(null);
      setError(null);
      setStatus("idle");
    } catch (err) {
      console.error("[useRecording] Failed to cancel recording:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel recording");
    }
  }, [recorder, status, stopDurationTimer]);

  // Play recording
  const playRecording = useCallback(
    async (uri: string) => {
      try {
        if (isPlaying) {
          await player.pause();
        }

        player.replace({ uri });
        player.play();
        setIsPlaying(true);
        setPlaybackProgress(0);
      } catch (err) {
        console.error("[useRecording] Failed to play recording:", err);
        setError(err instanceof Error ? err.message : "Failed to play recording");
      }
    },
    [player, isPlaying]
  );

  // Stop playback
  const stopPlayback = useCallback(async () => {
    try {
      await player.pause();
      player.seekTo(0);
      setIsPlaying(false);
      setPlaybackProgress(0);
    } catch (err) {
      console.error("[useRecording] Failed to stop playback:", err);
      setError(err instanceof Error ? err.message : "Failed to stop playback");
    }
  }, [player]);

  // Track playback progress
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const currentTime = player.currentTime || 0;
      const totalDuration = player.duration || 1;
      setPlaybackProgress(currentTime / totalDuration);

      // Check if playback finished
      if (currentTime >= totalDuration) {
        setIsPlaying(false);
        setPlaybackProgress(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, player]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationTimer();
      // Stop any active recording when component unmounts
      // Wrap in try/catch since accessing recorder properties can throw
      // if the native module is not properly initialized
      try {
        if (recorder.isRecording) {
          recorder.stop().catch(() => {
            // Ignore errors during cleanup
          });
        }
      } catch {
        // Ignore errors if native module is not available
      }
    };
  }, [stopDurationTimer, recorder]);

  return {
    status,
    duration,
    metering,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    playRecording,
    stopPlayback,
    isPlaying,
    playbackProgress,
  };
}
