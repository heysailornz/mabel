/**
 * Recording Types
 *
 * Types for audio recording, offline queue, and upload management.
 */

// =============================================================================
// Recording Upload Status
// =============================================================================

export const RECORDING_UPLOAD_STATUSES = [
  "recording", // Currently recording
  "paused", // Recording paused
  "local_saved", // Saved locally, not yet queued
  "queued", // In upload queue, waiting to process
  "creating_conversation", // Creating conversation (offline recovery)
  "uploading", // TUS upload in progress
  "uploaded", // File uploaded to storage
  "processing", // Server-side processing (transcription)
  "completed", // Fully processed
  "failed", // Upload or processing failed
] as const;

export type RecordingUploadStatus = (typeof RECORDING_UPLOAD_STATUSES)[number];

// =============================================================================
// Queued Recording (Offline Queue Item)
// =============================================================================

/**
 * A recording queued for upload. Persisted to MMKV (mobile) or IndexedDB (web).
 */
export interface QueuedRecording {
  /** Local UUID for this queue item */
  id: string;

  /** Local file path (mobile) or blob URL (web) */
  fileUri: string;

  /** Target filename in storage: {practitionerId}/{timestamp}.aac */
  fileName: string;

  /** User ID */
  practitionerId: string;

  /** Conversation ID, null if created offline and conversation pending */
  conversationId: string | null;

  /** Message ID in conversation_messages, null until message inserted */
  messageId: string | null;

  /** Recording duration in seconds */
  durationSeconds: number;

  /** ISO timestamp when recording was created */
  createdAt: string;

  /** Number of upload attempts */
  uploadAttempts: number;

  /** ISO timestamp of last upload attempt */
  lastAttemptAt?: string;

  /** TUS upload URL for resuming partial uploads */
  tusUploadUrl?: string;

  /** Upload progress 0-100 */
  uploadProgress?: number;

  /** Current status */
  status: "queued" | "creating_conversation" | "uploading" | "failed";

  /** Error message if failed */
  errorMessage?: string;
}

// =============================================================================
// Recording Result (from useRecording hook)
// =============================================================================

/**
 * Result returned when a recording is stopped/finalized.
 */
export interface RecordingResult {
  /** Local file URI */
  uri: string;

  /** Duration in seconds */
  duration: number;

  /** File size in bytes */
  fileSize: number;

  /** Spectrum history for waveform visualization (optional) */
  spectrumHistory?: number[][];
}

// =============================================================================
// Recording Hook State
// =============================================================================

export type RecordingStatus = "idle" | "recording" | "paused" | "stopped";

/**
 * State and controls from useRecording hook.
 */
export interface UseRecordingReturn {
  /** Current recording status */
  status: RecordingStatus;

  /** Current duration in seconds */
  duration: number;

  /** Current metering level (dB) for waveform visualization */
  metering: number | null;

  /** Error message if any */
  error: string | null;

  /** Start a new recording */
  startRecording: () => Promise<void>;

  /** Stop recording and get result */
  stopRecording: () => Promise<RecordingResult | null>;

  /** Pause recording */
  pauseRecording: () => Promise<void>;

  /** Resume paused recording */
  resumeRecording: () => Promise<void>;

  /** Cancel and discard recording */
  cancelRecording: () => Promise<void>;

  /** Play a recording by URI */
  playRecording: (uri: string) => Promise<void>;

  /** Stop playback */
  stopPlayback: () => Promise<void>;

  /** Whether currently playing */
  isPlaying: boolean;

  /** Playback progress 0-1 */
  playbackProgress: number;
}

// =============================================================================
// Upload Queue Manager Events
// =============================================================================

export interface UploadQueueEvents {
  /** Called when queue changes */
  onQueueChange: (queue: QueuedRecording[]) => void;

  /** Called when upload progress updates */
  onItemProgress: (id: string, progress: number) => void;

  /** Called when upload completes */
  onItemComplete: (id: string, storagePath: string) => void;

  /** Called when upload fails */
  onItemError: (id: string, error: string) => void;

  /** Called when conversation is created for offline recording */
  onConversationCreated: (id: string, conversationId: string) => void;
}

// =============================================================================
// Recording Upload Metadata (for message display)
// =============================================================================

/**
 * Metadata for recording upload messages in conversation UI.
 * Used by recording-bubble.tsx for display.
 */
export interface RecordingUploadMetadata {
  user_input_id: string;
  input_type: "audio";
  recording_id: string;
  duration_seconds: number;
  upload_progress?: number;
  storage_path?: string;
  status: RecordingUploadStatus;
  error_message?: string;
}

// =============================================================================
// TUS Upload Config
// =============================================================================

export interface TusUploadConfig {
  /** TUS endpoint URL */
  endpoint: string;

  /** Chunk size in bytes (default 6MB) */
  chunkSize: number;

  /** Retry delays in milliseconds */
  retryDelays: number[];

  /** Authorization token */
  accessToken: string;
}
