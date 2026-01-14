import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useConversationMessages } from "../use-conversation-messages";
import {
  simulateRealtimeEvent,
  resetRealtimeMocks,
} from "@/test/setup";
import type { ConversationMessage } from "@project/core";

// Helper to create a mock message
function createMockMessage(
  overrides: Partial<ConversationMessage> = {}
): ConversationMessage {
  return {
    id: `msg-${Date.now()}`,
    conversation_id: "test-conversation-id",
    participant_type: "practitioner",
    message_type: "recording_upload",
    content: null,
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  } as ConversationMessage;
}

describe("useConversationMessages", () => {
  beforeEach(() => {
    resetRealtimeMocks();
    vi.clearAllMocks();
  });

  it("initializes with provided messages", () => {
    const initialMessages = [
      createMockMessage({ id: "msg-1" }),
      createMockMessage({ id: "msg-2" }),
    ];

    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
        initialMessages,
      })
    );

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe("msg-1");
    expect(result.current.messages[1].id).toBe("msg-2");
  });

  it("initializes with empty array when no initial messages provided", () => {
    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
      })
    );

    expect(result.current.messages).toHaveLength(0);
  });

  it("adds optimistic message with generated ID", () => {
    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
      })
    );

    act(() => {
      result.current.addOptimisticMessage({
        content: "Test message content",
        message_type: "recording_upload",
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toMatch(/^optimistic-/);
    expect(result.current.messages[0].content).toBe("Test message content");
    expect(result.current.messages[0].conversation_id).toBe(
      "test-conversation-id"
    );
  });

  it("updates existing message by ID", () => {
    const initialMessages = [createMockMessage({ id: "msg-1", content: "Original" })];

    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
        initialMessages,
      })
    );

    act(() => {
      result.current.updateMessage("msg-1", { content: "Updated" });
    });

    expect(result.current.messages[0].content).toBe("Updated");
  });

  it("does not update non-existent message", () => {
    const initialMessages = [createMockMessage({ id: "msg-1", content: "Original" })];

    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
        initialMessages,
      })
    );

    act(() => {
      result.current.updateMessage("non-existent", { content: "Updated" });
    });

    expect(result.current.messages[0].content).toBe("Original");
  });

  it("adds new message from realtime INSERT event", async () => {
    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
      })
    );

    // Wait for subscription to be set up
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    // Simulate realtime event
    act(() => {
      simulateRealtimeEvent(
        "conversation:test-conversation-id",
        "INSERT",
        "conversation_messages",
        {
          id: "realtime-msg-1",
          conversation_id: "test-conversation-id",
          participant_type: "transcription_ai",
          message_type: "transcription_result",
          content: "Transcribed text",
          metadata: {},
          created_at: new Date().toISOString(),
        }
      );
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe("realtime-msg-1");
  });

  it("replaces optimistic message with real message on INSERT", async () => {
    const timestamp = new Date().toISOString();

    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
      })
    );

    // Add optimistic message
    act(() => {
      result.current.addOptimisticMessage({
        message_type: "recording_upload",
        created_at: timestamp,
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toMatch(/^optimistic-/);

    // Wait for subscription
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    // Simulate server confirming the message
    act(() => {
      simulateRealtimeEvent(
        "conversation:test-conversation-id",
        "INSERT",
        "conversation_messages",
        {
          id: "real-msg-id",
          conversation_id: "test-conversation-id",
          participant_type: "practitioner",
          message_type: "recording_upload",
          content: null,
          metadata: {},
          created_at: timestamp,
        }
      );
    });

    // Should still have 1 message, but now with real ID
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe("real-msg-id");
  });

  it("updates message from realtime UPDATE event", async () => {
    const initialMessages = [
      createMockMessage({ id: "msg-1", content: "Original content" }),
    ];

    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
        initialMessages,
      })
    );

    // Wait for subscription
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    // Simulate realtime update
    act(() => {
      simulateRealtimeEvent(
        "conversation:test-conversation-id",
        "UPDATE",
        "conversation_messages",
        {
          id: "msg-1",
          conversation_id: "test-conversation-id",
          participant_type: "practitioner",
          message_type: "recording_upload",
          content: "Updated content",
          metadata: {},
          created_at: new Date().toISOString(),
        }
      );
    });

    expect(result.current.messages[0].content).toBe("Updated content");
  });

  it("sets isSubscribed to true when subscription is active", async () => {
    const { result } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
      })
    );

    // Initially not subscribed
    expect(result.current.isSubscribed).toBe(false);

    // Wait for subscription
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  it("maintains stable callback references", () => {
    const { result, rerender } = renderHook(() =>
      useConversationMessages({
        conversationId: "test-conversation-id",
      })
    );

    const firstAddOptimistic = result.current.addOptimisticMessage;
    const firstUpdateMessage = result.current.updateMessage;

    rerender();

    expect(result.current.addOptimisticMessage).toBe(firstAddOptimistic);
    expect(result.current.updateMessage).toBe(firstUpdateMessage);
  });
});
