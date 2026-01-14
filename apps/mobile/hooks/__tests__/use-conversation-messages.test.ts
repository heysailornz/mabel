import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useConversationMessages } from "../use-conversation-messages";
import {
  simulateRealtimeEvent,
  resetRealtimeMocks,
} from "@/test/setup";
import * as conversationsService from "@/services/conversations";
import type { Conversation, ConversationMessage } from "@project/core";

// Mock the conversations service
vi.mock("@/services/conversations", () => ({
  getConversation: vi.fn(),
}));

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

// Helper to create a mock conversation
function createMockConversation(
  overrides: Partial<Conversation> = {}
): Conversation {
  return {
    id: "test-conversation-id",
    practitioner_id: "test-user-id",
    title: null,
    patient_context: null,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Conversation;
}

describe("useConversationMessages", () => {
  beforeEach(() => {
    resetRealtimeMocks();
    vi.clearAllMocks();
  });

  it("initializes with loading state", () => {
    vi.mocked(conversationsService.getConversation).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.conversation).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("fetches conversation and messages on mount", async () => {
    const mockConversation = createMockConversation();
    const mockMessages = [
      createMockMessage({ id: "msg-1" }),
      createMockMessage({ id: "msg-2" }),
    ];

    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: mockConversation,
      messages: mockMessages,
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.conversation).toEqual(mockConversation);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe("msg-1");
    expect(result.current.error).toBeNull();
  });

  it("sets error when conversation not found", async () => {
    vi.mocked(conversationsService.getConversation).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "non-existent" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Conversation not found");
    expect(result.current.conversation).toBeNull();
  });

  it("sets error state when fetch fails", async () => {
    vi.mocked(conversationsService.getConversation).mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("adds optimistic message with generated ID", async () => {
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [],
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

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

  it("updates existing message by ID", async () => {
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [createMockMessage({ id: "msg-1", content: "Original" })],
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateMessage("msg-1", { content: "Updated" });
    });

    expect(result.current.messages[0].content).toBe("Updated");
  });

  it("does not update non-existent message", async () => {
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [createMockMessage({ id: "msg-1", content: "Original" })],
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateMessage("non-existent", { content: "Updated" });
    });

    expect(result.current.messages[0].content).toBe("Original");
  });

  it("adds new message from realtime INSERT event", async () => {
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [],
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

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

    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [],
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    // Add optimistic message
    act(() => {
      result.current.addOptimisticMessage({
        message_type: "recording_upload",
        created_at: timestamp,
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toMatch(/^optimistic-/);

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
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [createMockMessage({ id: "msg-1", content: "Original content" })],
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

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
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [],
    });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    expect(result.current.isSubscribed).toBe(false);

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  it("refresh function fetches conversation again", async () => {
    const mockConversation = createMockConversation();

    vi.mocked(conversationsService.getConversation)
      .mockResolvedValueOnce({
        conversation: mockConversation,
        messages: [createMockMessage({ id: "msg-1" })],
      })
      .mockResolvedValueOnce({
        conversation: mockConversation,
        messages: [
          createMockMessage({ id: "msg-1" }),
          createMockMessage({ id: "msg-2" }),
        ],
      });

    const { result } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.messages).toHaveLength(2);
    expect(conversationsService.getConversation).toHaveBeenCalledTimes(2);
  });

  it("maintains stable callback references", async () => {
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [],
    });

    const { result, rerender } = renderHook(() =>
      useConversationMessages({ conversationId: "test-conversation-id" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstAddOptimistic = result.current.addOptimisticMessage;
    const firstUpdateMessage = result.current.updateMessage;
    const firstRefresh = result.current.refresh;

    rerender({});

    expect(result.current.addOptimisticMessage).toBe(firstAddOptimistic);
    expect(result.current.updateMessage).toBe(firstUpdateMessage);
    expect(result.current.refresh).toBe(firstRefresh);
  });

  it("refetches when conversationId changes", async () => {
    vi.mocked(conversationsService.getConversation).mockResolvedValue({
      conversation: createMockConversation(),
      messages: [],
    });

    const { result, rerender } = renderHook(
      ({ conversationId }) => useConversationMessages({ conversationId }),
      { initialProps: { conversationId: "conv-1" } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(conversationsService.getConversation).toHaveBeenCalledWith("conv-1");

    rerender({ conversationId: "conv-2" });

    await waitFor(() => {
      expect(conversationsService.getConversation).toHaveBeenCalledWith("conv-2");
    });
  });
});
