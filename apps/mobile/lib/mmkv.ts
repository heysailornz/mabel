/**
 * MMKV Storage Instance
 *
 * High-performance key-value storage for offline queue persistence.
 * Used for storing recording upload queue that persists across app restarts.
 */

import { createMMKV, type MMKV } from "react-native-mmkv";

/**
 * Main MMKV storage instance for recording uploads.
 * Uses a separate storage ID to isolate from other app data.
 */
export const uploadQueueStorage: MMKV = createMMKV({
  id: "recording-upload-queue",
});

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  /** Array of QueuedRecording objects */
  QUEUE: "queue",
  /** Last processed timestamp */
  LAST_PROCESSED: "last_processed",
  /** Network status cache */
  NETWORK_STATUS: "network_status",
} as const;

/**
 * Helper to get typed JSON from storage
 */
export function getStorageJSON<T>(key: string): T | null {
  const value = uploadQueueStorage.getString(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Helper to set typed JSON to storage
 */
export function setStorageJSON<T>(key: string, value: T): void {
  uploadQueueStorage.set(key, JSON.stringify(value));
}
