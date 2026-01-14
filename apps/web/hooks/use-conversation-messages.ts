"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConversationMessage } from "@project/core";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseConversationMessagesOptions {
  conversationId: string;
  initialMessages?: ConversationMessage[];
}

interface UseConversationMessagesReturn {
  messages: ConversationMessage[];
  isSubscribed: boolean;
  addOptimisticMessage: (message: Partial<ConversationMessage>) => void;
  updateMessage: (messageId: string, updates: Partial<ConversationMessage>) => void;
}

export function useConversationMessages({
  conversationId,
  initialMessages = [],
}: UseConversationMessagesOptions): UseConversationMessagesReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Add a new message optimistically (before server confirms)
  const addOptimisticMessage = useCallback((message: Partial<ConversationMessage>) => {
    const optimisticMessage: ConversationMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      participant_type: message.participant_type || "practitioner",
      message_type: message.message_type || "recording_upload",
      content: message.content || null,
      metadata: message.metadata || {},
      created_at: new Date().toISOString(),
      ...message,
    } as ConversationMessage;

    setMessages((prev) => [...prev, optimisticMessage]);
  }, [conversationId]);

  // Update an existing message
  const updateMessage = useCallback((messageId: string, updates: Partial<ConversationMessage>) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      // Subscribe to new messages
      channel = supabase
        .channel(`conversation:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversation_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMessage = payload.new as ConversationMessage;
            setMessages((prev) => {
              // Check if we already have this message (e.g., optimistic update)
              const exists = prev.some(
                (msg) =>
                  msg.id === newMessage.id ||
                  (msg.id.startsWith("optimistic-") &&
                    msg.message_type === newMessage.message_type &&
                    msg.created_at === newMessage.created_at)
              );

              if (exists) {
                // Replace optimistic message with real one
                return prev.map((msg) =>
                  msg.id.startsWith("optimistic-") &&
                  msg.message_type === newMessage.message_type
                    ? newMessage
                    : msg.id === newMessage.id
                    ? newMessage
                    : msg
                );
              }

              return [...prev, newMessage];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversation_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const updatedMessage = payload.new as ConversationMessage;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
        )
        .subscribe((status) => {
          setIsSubscribed(status === "SUBSCRIBED");
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [conversationId]);

  return {
    messages,
    isSubscribed,
    addOptimisticMessage,
    updateMessage,
  };
}
