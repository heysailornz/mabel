import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useConversations } from "../use-conversations";
import {
  simulateRealtimeEvent,
  resetRealtimeMocks,
  mockSupabase,
} from "@/test/setup";
import * as conversationsService from "@/services/conversations";
import type { ConversationWithPreview } from "@project/core";

// Mock the conversations service
vi.mock("@/services/conversations", () => ({
  getConversations: vi.fn(),
}));

// Helper to create a mock conversation
function createMockConversation(
  overrides: Partial<ConversationWithPreview> = {}
): ConversationWithPreview {
  return {
    id: `conv-${Date.now()}`,
    practitioner_id: "test-user-id",
    title: null,
    patient_context: null,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_message: undefined,
    message_count: 0,
    ...overrides,
  } as ConversationWithPreview;
}

describe("useConversations", () => {
  beforeEach(() => {
    resetRealtimeMocks();
    vi.clearAllMocks();
  });

  it("initializes with loading state", () => {
    vi.mocked(conversationsService.getConversations).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useConversations());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("fetches conversations on mount", async () => {
    const mockConversations = [
      createMockConversation({ id: "conv-1" }),
      createMockConversation({ id: "conv-2" }),
    ];

    vi.mocked(conversationsService.getConversations).mockResolvedValue(
      mockConversations
    );

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.conversations[0].id).toBe("conv-1");
    expect(result.current.conversations[1].id).toBe("conv-2");
    expect(result.current.error).toBeNull();
  });

  it("sets error state when fetch fails", async () => {
    vi.mocked(conversationsService.getConversations).mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.conversations).toEqual([]);
  });

  it("sets generic error message for non-Error exceptions", async () => {
    vi.mocked(conversationsService.getConversations).mockRejectedValue(
      "Unknown error"
    );

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load conversations");
  });

  it("refresh function fetches conversations again", async () => {
    const initialConversations = [createMockConversation({ id: "conv-1" })];
    const updatedConversations = [
      createMockConversation({ id: "conv-1" }),
      createMockConversation({ id: "conv-2" }),
    ];

    vi.mocked(conversationsService.getConversations)
      .mockResolvedValueOnce(initialConversations)
      .mockResolvedValueOnce(updatedConversations);

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversations).toHaveLength(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.conversations).toHaveLength(2);
    expect(conversationsService.getConversations).toHaveBeenCalledTimes(2);
  });

  it("refetches on realtime conversation change", async () => {
    const mockConversations = [createMockConversation({ id: "conv-1" })];

    vi.mocked(conversationsService.getConversations).mockResolvedValue(
      mockConversations
    );

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initial fetch
    expect(conversationsService.getConversations).toHaveBeenCalledTimes(1);

    // Wait for subscription to be established (it happens async after user check)
    await act(async () => {
      // Give time for the async setupSubscription to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Simulate realtime update - hook uses "*" for event type
    act(() => {
      simulateRealtimeEvent(
        "conversations-list",
        "*",
        "conversations",
        { id: "conv-2", practitioner_id: "test-user-id" }
      );
    });

    await waitFor(() => {
      expect(conversationsService.getConversations).toHaveBeenCalledTimes(2);
    });
  });

  it("clears error on successful refresh", async () => {
    vi.mocked(conversationsService.getConversations)
      .mockRejectedValueOnce(new Error("First error"))
      .mockResolvedValueOnce([createMockConversation({ id: "conv-1" })]);

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.error).toBe("First error");
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.conversations).toHaveLength(1);
  });

  it("maintains stable refresh function reference", async () => {
    vi.mocked(conversationsService.getConversations).mockResolvedValue([]);

    const { result, rerender } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstRefresh = result.current.refresh;

    rerender({});

    expect(result.current.refresh).toBe(firstRefresh);
  });
});
