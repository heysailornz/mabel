"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Conversation,
  ConversationWithPreview,
  ConversationMessage,
  ParticipantType,
  MessageType,
} from "@project/core";
import type { Json } from "@project/db/types";

export async function createConversation(): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ practitioner_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message || "Failed to create conversation" };
  }

  revalidatePath("/hello", "page");
  return { id: data.id };
}

export async function getConversations(): Promise<ConversationWithPreview[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get conversations with last message
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      conversation_messages (
        id,
        content,
        message_type,
        created_at
      )
    `
    )
    .eq("practitioner_id", user.id)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || !conversations) {
    return [];
  }

  return conversations.map((conv) => {
    const messages = conv.conversation_messages || [];
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
    return {
      ...conv,
      last_message: lastMessage as ConversationMessage | undefined,
      message_count: messages.length,
      conversation_messages: undefined,
    } as ConversationWithPreview;
  });
}

export async function getConversation(
  id: string
): Promise<{ conversation: Conversation; messages: ConversationMessage[] } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("practitioner_id", user.id)
    .single();

  if (convError || !conversation) {
    return null;
  }

  const { data: messages, error: msgError } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    return null;
  }

  return {
    conversation: conversation as Conversation,
    messages: (messages || []) as ConversationMessage[],
  };
}

export async function archiveConversation(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("conversations")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("practitioner_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/hello", "page");
  return { success: true };
}

export async function addMessage(
  conversationId: string,
  message: {
    participant_type: ParticipantType;
    message_type: MessageType;
    content?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ConversationMessage | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify user owns the conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("practitioner_id", user.id)
    .single();

  if (!conv) {
    return { error: "Conversation not found" };
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      participant_type: message.participant_type,
      message_type: message.message_type,
      content: message.content,
      metadata: (message.metadata || {}) as Json,
    })
    .select()
    .single();

  if (error || !data) {
    return { error: error?.message || "Failed to add message" };
  }

  // Update conversation's updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  revalidatePath(`/c/${conversationId}`, "page");
  return data as ConversationMessage;
}

export async function updateMessageMetadata(
  messageId: string,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get the message and verify ownership via conversation
  const { data: message } = await supabase
    .from("conversation_messages")
    .select("conversation_id, metadata")
    .eq("id", messageId)
    .single();

  if (!message) {
    return { success: false, error: "Message not found" };
  }

  // Verify user owns the conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", message.conversation_id)
    .eq("practitioner_id", user.id)
    .single();

  if (!conv) {
    return { success: false, error: "Not authorized" };
  }

  // Merge metadata
  const currentMetadata = (message.metadata as Record<string, unknown>) || {};
  const newMetadata = { ...currentMetadata, ...metadata } as Json;

  const { error } = await supabase
    .from("conversation_messages")
    .update({ metadata: newMetadata })
    .eq("id", messageId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
