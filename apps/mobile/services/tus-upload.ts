/**
 * TUS Resumable Upload Service
 *
 * Handles TUS protocol uploads to Supabase Storage.
 * Supports resumable uploads for large files and network interruptions.
 */

import * as tus from "tus-js-client";
import * as FileSystem from "expo-file-system";
import type { QueuedRecording } from "@project/core";
import {
  TUS_CHUNK_SIZE,
  TUS_RETRY_DELAYS,
  RECORDINGS_BUCKET,
  MOBILE_AUDIO_FORMAT,
} from "@project/core";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

/**
 * Get the TUS endpoint URL for Supabase Storage
 */
function getTusEndpoint(): string {
  // Transform project URL to storage URL
  // https://xxx.supabase.co -> https://xxx.supabase.co/storage/v1/upload/resumable
  return `${SUPABASE_URL}/storage/v1/upload/resumable`;
}

/**
 * Read file as blob for upload
 */
async function readFileAsBlob(fileUri: string): Promise<Blob> {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: "base64",
  });

  // Convert base64 to blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  // Create blob from the Uint8Array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Blob([byteArray as any], { type: MOBILE_AUDIO_FORMAT.mimeType } as any);
}

interface TusUploadOptions {
  /** Access token for authentication */
  accessToken: string;
  /** Callback for progress updates (0-100) */
  onProgress?: (percent: number) => void;
  /** Callback when upload URL is established (for resume) */
  onUploadUrl?: (url: string) => void;
  /** Existing TUS upload URL to resume */
  resumeUrl?: string;
}

/**
 * Upload a recording using TUS resumable upload protocol
 *
 * @param item The queued recording item
 * @param options Upload options
 * @returns The storage path on success
 */
export async function tusUpload(
  item: QueuedRecording,
  options: TusUploadOptions
): Promise<string> {
  const { accessToken, onProgress, onUploadUrl, resumeUrl } = options;
  const endpoint = getTusEndpoint();

  // Read file as blob
  const blob = await readFileAsBlob(item.fileUri);

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint,
      retryDelays: TUS_RETRY_DELAYS,
      chunkSize: TUS_CHUNK_SIZE,
      uploadUrl: resumeUrl || item.tusUploadUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-upsert": "true", // Overwrite if exists
      },
      metadata: {
        bucketName: RECORDINGS_BUCKET,
        objectName: item.fileName,
        contentType: MOBILE_AUDIO_FORMAT.mimeType,
        cacheControl: "3600", // 1 hour cache
      },

      onError: (error) => {
        console.error("[TUS] Upload error:", error);
        reject(error);
      },

      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100);
        onProgress?.(percent);
      },

      onSuccess: () => {
        console.log("[TUS] Upload complete:", item.fileName);
        resolve(item.fileName);
      },

      onAfterResponse: (req, res) => {
        // Store upload URL for resumption
        const uploadUrl = res.getHeader("Location");
        if (uploadUrl) {
          onUploadUrl?.(uploadUrl);
        }
      },
    });

    // Check for previous uploads to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        console.log("[TUS] Resuming previous upload");
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}

/**
 * Abort an in-progress TUS upload
 */
export function abortTusUpload(upload: tus.Upload): void {
  try {
    upload.abort();
  } catch (err) {
    console.error("[TUS] Error aborting upload:", err);
  }
}

/**
 * Generate a storage file name for a recording
 *
 * @param practitionerId The user's ID
 * @returns File name in format: {practitionerId}/{timestamp}.aac
 */
export function generateRecordingFileName(practitionerId: string): string {
  const timestamp = Date.now();
  return `${practitionerId}/${timestamp}${MOBILE_AUDIO_FORMAT.extension}`;
}
