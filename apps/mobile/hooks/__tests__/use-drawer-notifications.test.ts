import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDrawerNotifications } from "../use-drawer-notifications";
import {
  simulateRealtimeEvent,
  resetRealtimeMocks,
} from "@/test/setup";

// Mock expo-router
const mockPathname = vi.fn(() => "/");
vi.mock("expo-router", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

describe("useDrawerNotifications", () => {
  beforeEach(() => {
    resetRealtimeMocks();
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/");
  });

  it("initializes with empty notification set", async () => {
    const { result } = renderHook(() => useDrawerNotifications());

    expect(result.current.notifiedConversationIds.size).toBe(0);
    expect(result.current.isSubscribed).toBe(false);
  });

  it("sets isSubscribed to true when subscription is active", async () => {
    const { result } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  it("adds notification on new conversation INSERT", async () => {
    const { result } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    act(() => {
      simulateRealtimeEvent(
        "drawer:conversations",
        "INSERT",
        "conversations",
        { id: "new-conv-1", practitioner_id: "test-user-id" }
      );
    });

    expect(result.current.notifiedConversationIds.has("new-conv-1")).toBe(true);
  });

  it("adds notification on new message from AI", async () => {
    const { result } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    act(() => {
      simulateRealtimeEvent(
        "drawer:messages",
        "INSERT",
        "conversation_messages",
        {
          id: "msg-1",
          conversation_id: "conv-1",
          participant_type: "transcription_ai",
        }
      );
    });

    expect(result.current.notifiedConversationIds.has("conv-1")).toBe(true);
  });

  it("does not add notification for practitioner's own messages", async () => {
    const { result } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    act(() => {
      simulateRealtimeEvent(
        "drawer:messages",
        "INSERT",
        "conversation_messages",
        {
          id: "msg-1",
          conversation_id: "conv-1",
          participant_type: "practitioner",
        }
      );
    });

    expect(result.current.notifiedConversationIds.has("conv-1")).toBe(false);
  });

  it("does not notify for current conversation", async () => {
    mockPathname.mockReturnValue("/c/current-conv");

    const { result } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    act(() => {
      simulateRealtimeEvent(
        "drawer:messages",
        "INSERT",
        "conversation_messages",
        {
          id: "msg-1",
          conversation_id: "current-conv",
          participant_type: "transcription_ai",
        }
      );
    });

    expect(result.current.notifiedConversationIds.has("current-conv")).toBe(
      false
    );
  });

  it("filters out current conversation from notified IDs", async () => {
    const { result, rerender } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    // Add notification for a conversation
    act(() => {
      simulateRealtimeEvent(
        "drawer:messages",
        "INSERT",
        "conversation_messages",
        {
          id: "msg-1",
          conversation_id: "conv-1",
          participant_type: "transcription_ai",
        }
      );
    });

    expect(result.current.notifiedConversationIds.has("conv-1")).toBe(true);

    // Navigate to that conversation
    mockPathname.mockReturnValue("/c/conv-1");
    rerender();

    // Should be filtered out
    expect(result.current.notifiedConversationIds.has("conv-1")).toBe(false);
  });

  it("clears notification when clearNotification is called", async () => {
    const { result } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    // Add notification
    act(() => {
      simulateRealtimeEvent(
        "drawer:conversations",
        "INSERT",
        "conversations",
        { id: "conv-1", practitioner_id: "test-user-id" }
      );
    });

    expect(result.current.notifiedConversationIds.has("conv-1")).toBe(true);

    // Clear notification
    act(() => {
      result.current.clearNotification("conv-1");
    });

    expect(result.current.notifiedConversationIds.has("conv-1")).toBe(false);
  });

  it("maintains stable clearNotification reference", async () => {
    const { result, rerender } = renderHook(() => useDrawerNotifications());

    const firstClearNotification = result.current.clearNotification;

    rerender();

    expect(result.current.clearNotification).toBe(firstClearNotification);
  });

  it("accumulates multiple notifications", async () => {
    const { result } = renderHook(() => useDrawerNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    act(() => {
      simulateRealtimeEvent(
        "drawer:conversations",
        "INSERT",
        "conversations",
        { id: "conv-1", practitioner_id: "test-user-id" }
      );
    });

    act(() => {
      simulateRealtimeEvent(
        "drawer:messages",
        "INSERT",
        "conversation_messages",
        {
          id: "msg-1",
          conversation_id: "conv-2",
          participant_type: "transcription_ai",
        }
      );
    });

    expect(result.current.notifiedConversationIds.has("conv-1")).toBe(true);
    expect(result.current.notifiedConversationIds.has("conv-2")).toBe(true);
    expect(result.current.notifiedConversationIds.size).toBe(2);
  });
});
