/**
 * useSpectrumRecording Hook
 *
 * Audio recording hook using react-native-audio-api with:
 * - Real-time spectrum analysis via AnalyserNode
 * - Native pause/resume support
 * - AAC file output
 * - Accumulated spectrum history for playback visualization
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";
import {
  AudioContext,
  AudioRecorder,
  AudioManager,
  FileFormat,
} from "react-native-audio-api";
import type { AudioBufferSourceNode } from "react-native-audio-api";
import type { RecordingStatus, RecordingResult } from "@project/core";
import { MOBILE_AUDIO_FORMAT } from "@project/core";

const SPECTRUM_BINS = 32; // Number of amplitude bins for visualization
const AUDIO_CALLBACK_BUFFER_SIZE = 1024;

export interface SpectrumData {
  /** Current spectrum values (0-255 for each frequency bin) */
  current: Uint8Array | null;
  /** History of spectrum snapshots for the full recording */
  history: number[][];
}

export interface UseSpectrumRecordingReturn {
  status: RecordingStatus;
  duration: number;
  spectrum: SpectrumData;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  playRecording: (uri: string) => Promise<void>;
  stopPlayback: () => Promise<void>;
  isPlaying: boolean;
}

export function useSpectrumRecording(): UseSpectrumRecordingReturn {
  // Recording state
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [spectrum, setSpectrum] = useState<SpectrumData>({
    current: null,
    history: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for audio nodes
  const recorderRef = useRef<AudioRecorder | null>(null);
  const spectrumHistoryRef = useRef<number[][]>([]);

  // Playback refs
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Timer refs
  const recordingStartTime = useRef<number>(0);
  const pausedDuration = useRef<number>(0);

  // Request microphone permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await AudioManager.requestRecordingPermissions();
      if (result !== "Granted") {
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
        return false;
      }
      return true;
    } catch (err) {
      console.error("[useSpectrumRecording] Permission error:", err);
      setError("Failed to request microphone permissions");
      return false;
    }
  }, []);

  // Compute amplitude levels from raw audio data
  const computeAmplitude = useCallback((audioData: Float32Array): number[] => {
    const binSize = Math.floor(audioData.length / SPECTRUM_BINS);
    const amplitudes: number[] = [];

    for (let i = 0; i < SPECTRUM_BINS; i++) {
      let sum = 0;
      const start = i * binSize;
      const end = Math.min(start + binSize, audioData.length);

      for (let j = start; j < end; j++) {
        sum += Math.abs(audioData[j]);
      }

      // Average amplitude for this bin
      const avg = sum / (end - start);

      // Apply aggressive scaling for visibility
      // Typical speech is 0.01-0.1, so multiply by large factor
      // Use sqrt to compress dynamic range (makes quiet sounds more visible)
      const boosted = Math.sqrt(avg) * 8;
      const scaled = Math.min(255, Math.floor(boosted * 255));
      amplitudes.push(scaled);
    }

    return amplitudes;
  }, []);

  // Handle incoming audio data from recorder
  const handleAudioData = useCallback((audioData: Float32Array) => {
    const amplitudes = computeAmplitude(audioData);
    spectrumHistoryRef.current.push(amplitudes);

    // Update duration while recording (piggyback on audio callbacks)
    if (recordingStartTime.current > 0) {
      const elapsed = Math.floor((Date.now() - recordingStartTime.current) / 1000);
      setDuration(pausedDuration.current + elapsed);
    }

    setSpectrum({
      current: new Uint8Array(amplitudes),
      history: spectrumHistoryRef.current,
    });
  }, [computeAmplitude]);

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

      // Configure iOS audio session for recording
      AudioManager.setAudioSessionOptions({
        iosCategory: "playAndRecord",
        iosMode: "default",
        iosOptions: ["defaultToSpeaker", "allowBluetooth"],
      });

      // Activate audio session
      await AudioManager.setAudioSessionActivity(true);

      // Create recorder
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      // Enable file output (M4A is AAC in M4A container)
      recorder.enableFileOutput({
        format: FileFormat.M4A,
        channelCount: MOBILE_AUDIO_FORMAT.numberOfChannels,
      });

      // Set up audio callback for visualization
      recorder.onAudioReady(
        {
          sampleRate: MOBILE_AUDIO_FORMAT.sampleRate,
          bufferLength: AUDIO_CALLBACK_BUFFER_SIZE,
          channelCount: MOBILE_AUDIO_FORMAT.numberOfChannels,
        },
        (event) => {
          // Get audio data from the first channel
          const audioData = event.buffer.getChannelData(0);
          handleAudioData(audioData);
        }
      );

      // Start recording
      const result = recorder.start();
      if (result.status === "error") {
        throw new Error(result.message || "Failed to start recording");
      }

      // Reset state and start timing
      pausedDuration.current = 0;
      recordingStartTime.current = Date.now();
      spectrumHistoryRef.current = [];
      setDuration(0);
      setSpectrum({ current: null, history: [] });
      setStatus("recording");
    } catch (err) {
      console.error("[useSpectrumRecording] Start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setStatus("idle");
    }
  }, [requestPermissions, handleAudioData]);

  // Pause recording
  const pauseRecording = useCallback(async () => {
    try {
      if (status !== "recording" || !recorderRef.current) return;

      recorderRef.current.pause();

      // Store accumulated duration for resume
      pausedDuration.current = duration;
      recordingStartTime.current = 0; // Stop timing
      setStatus("paused");
    } catch (err) {
      console.error("[useSpectrumRecording] Pause error:", err);
      setError(err instanceof Error ? err.message : "Failed to pause recording");
    }
  }, [status, duration]);

  // Resume recording
  const resumeRecording = useCallback(async () => {
    try {
      if (status !== "paused" || !recorderRef.current) return;

      recorderRef.current.resume();

      // Reset start time for the new segment
      recordingStartTime.current = Date.now();
      setStatus("recording");
    } catch (err) {
      console.error("[useSpectrumRecording] Resume error:", err);
      setError(err instanceof Error ? err.message : "Failed to resume recording");
    }
  }, [status]);

  // Stop recording and get result
  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    try {
      if ((status !== "recording" && status !== "paused") || !recorderRef.current) {
        return null;
      }

      // Clear the audio callback
      recorderRef.current.clearOnAudioReady();

      const result = recorderRef.current.stop();
      if (result.status === "error") {
        setError(result.message || "No recording available");
        setStatus("idle");
        return null;
      }

      // Result is success, extract file info
      const fileInfo = result;

      // Deactivate audio session
      await AudioManager.setAudioSessionActivity(false);

      setStatus("stopped");

      return {
        uri: fileInfo.path,
        duration: duration,
        fileSize: fileInfo.size || 0,
        spectrumHistory: spectrumHistoryRef.current,
      };
    } catch (err) {
      console.error("[useSpectrumRecording] Stop error:", err);
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      setStatus("idle");
      return null;
    }
  }, [status, duration]);

  // Cancel recording (discard)
  const cancelRecording = useCallback(async () => {
    try {

      if (recorderRef.current) {
        recorderRef.current.clearOnAudioReady();
        try {
          // Try to stop if recording is active
          recorderRef.current.stop();
        } catch {
          // Ignore if already stopped
        }
        recorderRef.current = null;
      }

      // Deactivate audio session
      await AudioManager.setAudioSessionActivity(false);

      // Reset state
      spectrumHistoryRef.current = [];
      pausedDuration.current = 0;
      recordingStartTime.current = 0;
      setDuration(0);
      setSpectrum({ current: null, history: [] });
      setError(null);
      setStatus("idle");
    } catch (err) {
      console.error("[useSpectrumRecording] Cancel error:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel recording");
    }
  }, []);

  // Play recording
  const playRecording = useCallback(async (uri: string) => {
    try {
      // Stop any existing playback
      if (playbackSourceRef.current) {
        playbackSourceRef.current.stop();
        playbackSourceRef.current = null;
      }

      // Create playback context if needed
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext();
      }

      const context = playbackContextRef.current;

      // Decode the audio file (pass URI string directly)
      const audioBuffer = await context.decodeAudioData(uri);

      // Create source node
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      playbackSourceRef.current = source;

      // Track when playback ends
      const audioDuration = audioBuffer.duration;
      setTimeout(() => {
        setIsPlaying(false);
        playbackSourceRef.current = null;
      }, audioDuration * 1000);

      // Start playback
      source.start();
      setIsPlaying(true);
    } catch (err) {
      console.error("[useSpectrumRecording] Playback error:", err);
      setError(err instanceof Error ? err.message : "Failed to play recording");
      setIsPlaying(false);
    }
  }, []);

  // Stop playback
  const stopPlayback = useCallback(async () => {
    try {
      if (playbackSourceRef.current) {
        playbackSourceRef.current.stop();
        playbackSourceRef.current = null;
      }
      setIsPlaying(false);
    } catch (err) {
      console.error("[useSpectrumRecording] Stop playback error:", err);
      setError(err instanceof Error ? err.message : "Failed to stop playback");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        try {
          recorderRef.current.clearOnAudioReady();
          recorderRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }

      if (playbackContextRef.current) {
        playbackContextRef.current.close().catch(() => {
          // Ignore cleanup errors
        });
      }

      // Deactivate audio session
      AudioManager.setAudioSessionActivity(false).catch(() => {
        // Ignore cleanup errors
      });
    };
  }, []);

  return {
    status,
    duration,
    spectrum,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    playRecording,
    stopPlayback,
    isPlaying,
  };
}
