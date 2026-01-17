/**
 * Upload Queue Manager
 *
 * Manages recording uploads with:
 * - MMKV persistence for in-progress uploads
 * - Network state monitoring for automatic retry
 * - Automatic retry with exponential backoff
 * - TUS resumable uploads for large files/network hiccups
 *
 * Note: Recording requires online connection. This queue handles
 * long uploads and network interruptions during upload, not full
 * offline recording support.
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import type { QueuedRecording, UploadQueueEvents } from "@project/core";
import {
  MAX_UPLOAD_ATTEMPTS,
  BACKOFF_BASE_DELAY,
  BACKOFF_MAX_DELAY,
} from "@project/core";
import {
  uploadQueueStorage,
  STORAGE_KEYS,
  getStorageJSON,
  setStorageJSON,
} from "@/lib/mmkv";
import { tusUpload, generateRecordingFileName } from "./tus-upload";
import { addMessage } from "./conversations";
import { supabase } from "@/lib/supabase";

type EventCallback<T> = (data: T) => void;

class UploadQueueManager {
  private queue: QueuedRecording[] = [];
  private isProcessing = false;
  private networkUnsubscribe: (() => void) | null = null;

  // Event listeners
  private listeners: {
    queueChange: Set<EventCallback<QueuedRecording[]>>;
    itemProgress: Set<EventCallback<{ id: string; progress: number }>>;
    itemComplete: Set<EventCallback<{ id: string; storagePath: string }>>;
    itemError: Set<EventCallback<{ id: string; error: string }>>;
    conversationCreated: Set<EventCallback<{ id: string; conversationId: string }>>;
  } = {
    queueChange: new Set(),
    itemProgress: new Set(),
    itemComplete: new Set(),
    itemError: new Set(),
    conversationCreated: new Set(),
  };

  constructor() {
    this.loadQueue();
    this.setupNetworkListener();
  }

  // ==========================================================================
  // Queue Management
  // ==========================================================================

  /**
   * Load queue from MMKV storage
   */
  private loadQueue(): void {
    const saved = getStorageJSON<QueuedRecording[]>(STORAGE_KEYS.QUEUE);
    if (saved) {
      this.queue = saved;
      // Reset any "uploading" items to "queued" (app may have crashed)
      this.queue = this.queue.map((item) =>
        item.status === "uploading" ? { ...item, status: "queued" } : item
      );
      this.persistQueue();
    }
  }

  /**
   * Persist queue to MMKV storage
   */
  private persistQueue(): void {
    setStorageJSON(STORAGE_KEYS.QUEUE, this.queue);
    this.emit("queueChange", this.queue);
  }

  /**
   * Add a recording to the upload queue
   */
  async addToQueue(recording: {
    fileUri: string;
    practitionerId: string;
    conversationId: string | null;
    durationSeconds: number;
    spectrumData?: number[][];
  }): Promise<string> {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fileName = generateRecordingFileName(recording.practitionerId);

    const item: QueuedRecording = {
      id,
      fileUri: recording.fileUri,
      fileName,
      practitionerId: recording.practitionerId,
      conversationId: recording.conversationId,
      messageId: null,
      durationSeconds: recording.durationSeconds,
      spectrumData: recording.spectrumData,
      createdAt: new Date().toISOString(),
      uploadAttempts: 0,
      status: "queued",
    };

    this.queue.push(item);
    this.persistQueue();

    // Start processing if online
    this.processQueue();

    return id;
  }

  /**
   * Remove an item from the queue
   */
  removeFromQueue(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.persistQueue();
  }

  /**
   * Get the current queue
   */
  getQueue(): QueuedRecording[] {
    return [...this.queue];
  }

  /**
   * Get a specific queue item
   */
  getQueueItem(id: string): QueuedRecording | undefined {
    return this.queue.find((item) => item.id === id);
  }

  /**
   * Update a queue item
   */
  private updateItem(id: string, updates: Partial<QueuedRecording>): void {
    this.queue = this.queue.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.persistQueue();
  }

  /**
   * Retry a failed item
   */
  retryItem(id: string): void {
    const item = this.getQueueItem(id);
    if (item && item.status === "failed") {
      this.updateItem(id, { status: "queued", errorMessage: undefined });
      this.processQueue();
    }
  }

  // ==========================================================================
  // Queue Processing
  // ==========================================================================

  /**
   * Process the upload queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    // Check network
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log("[Queue] Offline, skipping processing");
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending items
      const pendingItems = this.queue.filter(
        (item) => item.status === "queued" && !this.shouldBackoff(item)
      );

      for (const item of pendingItems) {
        try {
          await this.processItem(item);
        } catch (error) {
          // Error handling done in processItem
          console.error("[Queue] Error processing item:", error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if we should backoff based on previous failures
   */
  private shouldBackoff(item: QueuedRecording): boolean {
    if (item.uploadAttempts === 0) return false;
    if (!item.lastAttemptAt) return false;

    const delay = Math.min(
      BACKOFF_BASE_DELAY * Math.pow(2, item.uploadAttempts - 1),
      BACKOFF_MAX_DELAY
    );
    const lastAttempt = new Date(item.lastAttemptAt).getTime();
    return Date.now() - lastAttempt < delay;
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueuedRecording): Promise<void> {
    try {
      // Conversation must already exist (we require online for recording)
      if (!item.conversationId) {
        throw new Error("No conversation ID - recording requires online connection");
      }

      // Step 1: Insert message if needed
      if (!item.messageId) {
        const message = await addMessage(item.conversationId, {
          participant_type: "practitioner",
          message_type: "user_input",
          content: null,
          metadata: {
            user_input_id: item.id,
            input_type: "audio",
            recording_id: item.id,
            duration_seconds: item.durationSeconds,
            spectrum_data: item.spectrumData,
            upload_progress: 0,
            status: "uploading",
          },
        });

        if ("error" in message) {
          throw new Error(message.error);
        }

        item.messageId = message.id;
        this.updateItem(item.id, { messageId: message.id });
      }

      // Step 3: Upload file
      this.updateItem(item.id, { status: "uploading" });

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const storagePath = await tusUpload(item, {
        accessToken,
        onProgress: (progress) => {
          this.updateItem(item.id, { uploadProgress: progress });
          this.emit("itemProgress", { id: item.id, progress });

          // Update message metadata with progress
          if (item.messageId) {
            this.updateMessageProgress(item.messageId, progress);
          }
        },
        onUploadUrl: (url) => {
          this.updateItem(item.id, { tusUploadUrl: url });
        },
        resumeUrl: item.tusUploadUrl,
      });

      // Success - update message and remove from queue
      if (item.messageId) {
        await this.updateMessageComplete(item.messageId, storagePath);
      }

      this.removeFromQueue(item.id);
      this.emit("itemComplete", { id: item.id, storagePath });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      this.updateItem(item.id, {
        status: "failed",
        uploadAttempts: item.uploadAttempts + 1,
        lastAttemptAt: new Date().toISOString(),
        errorMessage,
      });

      // Update message with error
      if (item.messageId) {
        this.updateMessageError(item.messageId, errorMessage);
      }

      this.emit("itemError", { id: item.id, error: errorMessage });

      // Max attempts reached?
      if (item.uploadAttempts >= MAX_UPLOAD_ATTEMPTS) {
        console.error("[Queue] Max attempts reached for item:", item.id);
      }
    }
  }

  // ==========================================================================
  // Message Updates
  // ==========================================================================

  /**
   * Update message metadata with upload progress
   */
  private async updateMessageProgress(
    messageId: string,
    progress: number
  ): Promise<void> {
    try {
      // Fetch current metadata and update progress
      const { data: message } = await supabase
        .from("conversation_messages")
        .select("metadata")
        .eq("id", messageId)
        .single();

      if (message) {
        const metadata = {
          ...(message.metadata as object),
          upload_progress: progress,
        };

        await supabase
          .from("conversation_messages")
          .update({ metadata })
          .eq("id", messageId);
      }
    } catch (err) {
      // Ignore - non-critical progress update
    }
  }

  /**
   * Update message metadata when upload completes
   */
  private async updateMessageComplete(
    messageId: string,
    storagePath: string
  ): Promise<void> {
    try {
      const { data: message } = await supabase
        .from("conversation_messages")
        .select("metadata")
        .eq("id", messageId)
        .single();

      if (message) {
        const metadata = {
          ...(message.metadata as object),
          status: "uploaded",
          upload_progress: 100,
          storage_path: storagePath,
        };

        await supabase
          .from("conversation_messages")
          .update({ metadata })
          .eq("id", messageId);
      }
    } catch (err) {
      console.error("[Queue] Error updating message complete:", err);
    }
  }

  /**
   * Update message metadata when upload fails
   */
  private async updateMessageError(
    messageId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const { data: message } = await supabase
        .from("conversation_messages")
        .select("metadata")
        .eq("id", messageId)
        .single();

      if (message) {
        const metadata = {
          ...(message.metadata as object),
          status: "failed",
          error_message: errorMessage,
        };

        await supabase
          .from("conversation_messages")
          .update({ metadata })
          .eq("id", messageId);
      }
    } catch (err) {
      console.error("[Queue] Error updating message error:", err);
    }
  }

  // ==========================================================================
  // Network Monitoring
  // ==========================================================================

  /**
   * Set up network state listener
   */
  private setupNetworkListener(): void {
    this.networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && this.queue.length > 0) {
        console.log("[Queue] Network restored, processing queue");
        this.processQueue();
      }
    });
  }

  /**
   * Clean up network listener
   */
  cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
  }

  // ==========================================================================
  // Event Emitter
  // ==========================================================================

  /**
   * Subscribe to queue events
   */
  on<K extends keyof typeof this.listeners>(
    event: K,
    callback: EventCallback<
      K extends "queueChange"
        ? QueuedRecording[]
        : K extends "itemProgress"
          ? { id: string; progress: number }
          : K extends "itemComplete"
            ? { id: string; storagePath: string }
            : K extends "itemError"
              ? { id: string; error: string }
              : { id: string; conversationId: string }
    >
  ): () => void {
    (this.listeners[event] as Set<any>).add(callback);
    return () => {
      (this.listeners[event] as Set<any>).delete(callback);
    };
  }

  /**
   * Emit an event
   */
  private emit<T>(event: keyof typeof this.listeners, data: T): void {
    (this.listeners[event] as Set<EventCallback<T>>).forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[Queue] Error in ${event} listener:`, err);
      }
    });
  }
}

// Lazy singleton instance
let _instance: UploadQueueManager | null = null;

/**
 * Get the upload queue singleton instance.
 * Lazily initialized on first access to avoid side effects during imports.
 */
function getUploadQueue(): UploadQueueManager {
  if (!_instance) {
    _instance = new UploadQueueManager();
  }
  return _instance;
}

// Export a proxy object that lazily initializes the singleton
export const uploadQueue: UploadQueueManager = new Proxy({} as UploadQueueManager, {
  get(_target, prop: keyof UploadQueueManager) {
    const instance = getUploadQueue();
    const value = instance[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
