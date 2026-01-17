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
import type { AudioBufferSourceNode, AnalyserNode } from "react-native-audio-api";
import type { RecordingStatus, RecordingResult } from "@project/core";
import { MOBILE_AUDIO_FORMAT } from "@project/core";

const FFT_SIZE = 64; // 32 frequency bins
const SPECTRUM_UPDATE_INTERVAL = 50; // ms between spectrum updates
const SPECTRUM_BINS = FFT_SIZE / 2; // Number of frequency bins

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const spectrumHistoryRef = useRef<number[][]>([]);

  // Playback refs
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Timer refs
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spectrumTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Start spectrum analysis loop
  const startSpectrumAnalysis = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    spectrumTimerRef.current = setInterval(() => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);

        // Store a copy of current spectrum
        const snapshot = Array.from(dataArray);
        spectrumHistoryRef.current.push(snapshot);

        setSpectrum({
          current: new Uint8Array(dataArray),
          history: spectrumHistoryRef.current,
        });
      }
    }, SPECTRUM_UPDATE_INTERVAL);
  }, []);

  // Stop spectrum analysis
  const stopSpectrumAnalysis = useCallback(() => {
    if (spectrumTimerRef.current) {
      clearInterval(spectrumTimerRef.current);
      spectrumTimerRef.current = null;
    }
  }, []);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    recordingStartTime.current = Date.now();
    durationTimerRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - recordingStartTime.current) / 1000
      );
      setDuration(pausedDuration.current + elapsed);
    }, 100);
  }, []);

  // Stop duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
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

      // Create audio context and nodes
      const audioContext = new AudioContext({ sampleRate: MOBILE_AUDIO_FORMAT.sampleRate });
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      // Create recorder
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      // Enable file output (M4A is AAC in M4A container)
      recorder.enableFileOutput({
        format: FileFormat.M4A,
        channelCount: MOBILE_AUDIO_FORMAT.numberOfChannels,
      });

      // Create recorder adapter and connect to analyser
      const recorderAdapter = audioContext.createRecorderAdapter();
      recorder.connect(recorderAdapter);
      recorderAdapter.connect(analyser);

      // Start recording
      const result = recorder.start();
      if (result.status === "error") {
        throw new Error(result.message || "Failed to start recording");
      }

      // Reset state
      pausedDuration.current = 0;
      spectrumHistoryRef.current = [];
      setDuration(0);
      setSpectrum({ current: null, history: [] });
      setStatus("recording");

      // Start timers
      startDurationTimer();
      startSpectrumAnalysis();
    } catch (err) {
      console.error("[useSpectrumRecording] Start error:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setStatus("idle");
    }
  }, [requestPermissions, startDurationTimer, startSpectrumAnalysis]);

  // Pause recording
  const pauseRecording = useCallback(async () => {
    try {
      if (status !== "recording" || !recorderRef.current) return;

      recorderRef.current.pause();

      // Store accumulated duration
      pausedDuration.current = duration;
      stopDurationTimer();
      stopSpectrumAnalysis();
      setStatus("paused");
    } catch (err) {
      console.error("[useSpectrumRecording] Pause error:", err);
      setError(err instanceof Error ? err.message : "Failed to pause recording");
    }
  }, [status, duration, stopDurationTimer, stopSpectrumAnalysis]);

  // Resume recording
  const resumeRecording = useCallback(async () => {
    try {
      if (status !== "paused" || !recorderRef.current) return;

      recorderRef.current.resume();

      setStatus("recording");
      startDurationTimer();
      startSpectrumAnalysis();
    } catch (err) {
      console.error("[useSpectrumRecording] Resume error:", err);
      setError(err instanceof Error ? err.message : "Failed to resume recording");
    }
  }, [status, startDurationTimer, startSpectrumAnalysis]);

  // Stop recording and get result
  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    try {
      if ((status !== "recording" && status !== "paused") || !recorderRef.current) {
        return null;
      }

      stopDurationTimer();
      stopSpectrumAnalysis();

      const result = recorderRef.current.stop();
      if (result.status === "error") {
        setError(result.message || "No recording available");
        setStatus("idle");
        return null;
      }

      // Result is success, extract file info
      const fileInfo = result;

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

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
  }, [status, duration, stopDurationTimer, stopSpectrumAnalysis]);

  // Cancel recording (discard)
  const cancelRecording = useCallback(async () => {
    try {
      stopDurationTimer();
      stopSpectrumAnalysis();

      if (recorderRef.current) {
        if (recorderRef.current.isRecording() || recorderRef.current.isPaused()) {
          recorderRef.current.stop();
        }
        recorderRef.current = null;
      }

      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      analyserRef.current = null;

      // Reset state
      spectrumHistoryRef.current = [];
      pausedDuration.current = 0;
      setDuration(0);
      setSpectrum({ current: null, history: [] });
      setError(null);
      setStatus("idle");
    } catch (err) {
      console.error("[useSpectrumRecording] Cancel error:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel recording");
    }
  }, [stopDurationTimer, stopSpectrumAnalysis]);

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
      stopDurationTimer();
      stopSpectrumAnalysis();

      if (recorderRef.current) {
        try {
          if (recorderRef.current.isRecording() || recorderRef.current.isPaused()) {
            recorderRef.current.stop();
          }
        } catch {
          // Ignore cleanup errors
        }
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Ignore cleanup errors
        });
      }

      if (playbackContextRef.current) {
        playbackContextRef.current.close().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [stopDurationTimer, stopSpectrumAnalysis]);

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
