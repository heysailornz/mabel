/**
 * Recording Constants
 *
 * Configuration for audio recording and TUS uploads.
 */

// =============================================================================
// TUS Upload Configuration
// =============================================================================

/** Default TUS chunk size (6MB) */
export const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

/** Retry delays for TUS uploads (in milliseconds) */
export const TUS_RETRY_DELAYS = [0, 1000, 3000, 5000, 10000];

/** Maximum upload attempts before giving up */
export const MAX_UPLOAD_ATTEMPTS = 10;

/** Exponential backoff base delay (ms) */
export const BACKOFF_BASE_DELAY = 1000;

/** Maximum backoff delay (ms) */
export const BACKOFF_MAX_DELAY = 60000;

// =============================================================================
// Audio Recording Configuration
// =============================================================================

/** Audio format for mobile (AAC) */
export const MOBILE_AUDIO_FORMAT = {
  extension: ".aac",
  mimeType: "audio/aac",
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000, // 128kbps
} as const;

/** Audio format for web (WebM/Opus) */
export const WEB_AUDIO_FORMAT = {
  mimeType: "audio/webm;codecs=opus",
  bitsPerSecond: 128000,
} as const;

/** Approximate file size per minute of recording (bytes) */
export const BYTES_PER_MINUTE = 1024 * 1024; // ~1MB per minute at 128kbps

// =============================================================================
// Storage Configuration
// =============================================================================

/** Storage bucket name for recordings */
export const RECORDINGS_BUCKET = "recordings";

/** Maximum file size for recordings (100MB) */
export const MAX_RECORDING_SIZE = 100 * 1024 * 1024;

/** Allowed MIME types for recordings */
export const ALLOWED_RECORDING_MIME_TYPES = [
  "audio/aac",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
];

// =============================================================================
// Metering Configuration
// =============================================================================

/** Minimum dB value for metering (silence) */
export const METERING_MIN_DB = -60;

/** Maximum dB value for metering (loud) */
export const METERING_MAX_DB = 0;

/**
 * Normalize a dB metering value to 0-1 range for visualization.
 * @param db The decibel value from the audio recorder
 * @returns Normalized value between 0 and 1
 */
export function normalizeMeteringValue(db: number | null | undefined): number {
  if (db === null || db === undefined) return 0;

  // Clamp to range
  const clamped = Math.max(METERING_MIN_DB, Math.min(METERING_MAX_DB, db));

  // Normalize to 0-1
  return (clamped - METERING_MIN_DB) / (METERING_MAX_DB - METERING_MIN_DB);
}

// =============================================================================
// Queue Storage Keys
// =============================================================================

/** MMKV/IndexedDB key for upload queue */
export const UPLOAD_QUEUE_STORAGE_KEY = "recording_upload_queue";

/** IndexedDB database name for web */
export const INDEXED_DB_NAME = "mabel-recordings";

/** IndexedDB store names */
export const INDEXED_DB_STORES = {
  queue: "upload_queue",
  blobs: "recording_blobs",
} as const;
