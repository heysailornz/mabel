/**
 * useUploadQueue Hook
 *
 * React hook for accessing the upload queue state and operations.
 */

import { useState, useEffect, useCallback } from "react";
import type { QueuedRecording } from "@project/core";
import { uploadQueue } from "@/services/upload-queue";

interface UseUploadQueueReturn {
  /** Current queue items */
  queue: QueuedRecording[];

  /** Add a recording to the queue */
  addToQueue: (recording: {
    fileUri: string;
    practitionerId: string;
    conversationId: string | null;
    durationSeconds: number;
    spectrumData?: number[][];
  }) => Promise<string>;

  /** Retry a failed upload */
  retryItem: (id: string) => void;

  /** Remove an item from the queue */
  removeItem: (id: string) => void;

  /** Get a specific item by ID */
  getItem: (id: string) => QueuedRecording | undefined;

  /** Whether any items are currently uploading */
  isUploading: boolean;

  /** Get items for a specific conversation */
  getItemsForConversation: (conversationId: string) => QueuedRecording[];
}

export function useUploadQueue(): UseUploadQueueReturn {
  const [queue, setQueue] = useState<QueuedRecording[]>([]);

  // Subscribe to queue changes
  useEffect(() => {
    // Get initial state
    setQueue(uploadQueue.getQueue());

    // Subscribe to changes
    const unsubscribe = uploadQueue.on("queueChange", (newQueue) => {
      setQueue(newQueue);
    });

    return unsubscribe;
  }, []);

  const addToQueue = useCallback(
    async (recording: {
      fileUri: string;
      practitionerId: string;
      conversationId: string | null;
      durationSeconds: number;
      spectrumData?: number[][];
    }) => {
      return uploadQueue.addToQueue(recording);
    },
    []
  );

  const retryItem = useCallback((id: string) => {
    uploadQueue.retryItem(id);
  }, []);

  const removeItem = useCallback((id: string) => {
    uploadQueue.removeFromQueue(id);
  }, []);

  const getItem = useCallback(
    (id: string) => {
      return queue.find((item) => item.id === id);
    },
    [queue]
  );

  const isUploading = queue.some(
    (item) => item.status === "uploading" || item.status === "creating_conversation"
  );

  const getItemsForConversation = useCallback(
    (conversationId: string) => {
      return queue.filter((item) => item.conversationId === conversationId);
    },
    [queue]
  );

  return {
    queue,
    addToQueue,
    retryItem,
    removeItem,
    getItem,
    isUploading,
    getItemsForConversation,
  };
}

/**
 * Hook to track upload progress for a specific queue item
 */
export function useUploadProgress(itemId: string | null): {
  progress: number;
  status: QueuedRecording["status"] | null;
  error: string | null;
} {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<QueuedRecording["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setProgress(0);
      setStatus(null);
      setError(null);
      return;
    }

    // Get initial state
    const item = uploadQueue.getQueueItem(itemId);
    if (item) {
      setProgress(item.uploadProgress || 0);
      setStatus(item.status);
      setError(item.errorMessage || null);
    }

    // Subscribe to progress updates
    const unsubProgress = uploadQueue.on("itemProgress", (data) => {
      if (data.id === itemId) {
        setProgress(data.progress);
      }
    });

    // Subscribe to queue changes for status
    const unsubQueue = uploadQueue.on("queueChange", (queue) => {
      const item = queue.find((i) => i.id === itemId);
      if (item) {
        setStatus(item.status);
        setError(item.errorMessage || null);
      } else {
        // Item was removed (completed)
        setProgress(100);
        setStatus(null);
      }
    });

    return () => {
      unsubProgress();
      unsubQueue();
    };
  }, [itemId]);

  return { progress, status, error };
}
