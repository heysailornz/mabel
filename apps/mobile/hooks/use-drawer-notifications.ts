import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getConversationIdFromPath } from "@/lib/navigation-utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseDrawerNotificationsReturn {
  notifiedConversationIds: Set<string>;
  clearNotification: (conversationId: string) => void;
  isSubscribed: boolean;
}

export function useDrawerNotifications(): UseDrawerNotificationsReturn {
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Keep pathname ref in sync for use in callbacks
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Clear notification for a conversation
  const clearNotification = useCallback((conversationId: string) => {
    setNotifiedIds((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  // Get current conversation ID from pathname
  const currentConversationId = useMemo(
    () => getConversationIdFromPath(pathname),
    [pathname]
  );

  // Filter out the current conversation from notified IDs
  const filteredNotifiedIds = useMemo(() => {
    if (!currentConversationId || !notifiedIds.has(currentConversationId)) {
      return notifiedIds;
    }
    const filtered = new Set(notifiedIds);
    filtered.delete(currentConversationId);
    return filtered;
  }, [notifiedIds, currentConversationId]);

  useEffect(() => {
    let conversationsChannel: RealtimeChannel | null = null;
    let messagesChannel: RealtimeChannel | null = null;
    let isActive = true;

    const setupSubscriptions = async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !isActive) return;

      // Subscribe to new conversations
      conversationsChannel = supabase
        .channel("drawer:conversations")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversations",
            filter: `practitioner_id=eq.${user.id}`,
          },
          (payload) => {
            if (!isActive) return;
            const newConversation = payload.new as { id: string };
            // Don't notify if we're currently viewing this conversation
            const currentId = getConversationIdFromPath(pathnameRef.current);
            if (currentId === newConversation.id) return;

            setNotifiedIds((prev) => new Set(prev).add(newConversation.id));
          }
        )
        .subscribe();

      // Subscribe to new messages across all conversations
      messagesChannel = supabase
        .channel("drawer:messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversation_messages",
          },
          (payload) => {
            if (!isActive) return;
            const newMessage = payload.new as {
              conversation_id: string;
              participant_type: string;
            };

            // Only notify for AI/system messages, not user's own messages
            if (newMessage.participant_type === "practitioner") return;

            // Don't notify if we're currently viewing this conversation
            const currentId = getConversationIdFromPath(pathnameRef.current);
            if (currentId === newMessage.conversation_id) return;

            setNotifiedIds((prev) =>
              new Set(prev).add(newMessage.conversation_id)
            );
          }
        )
        .subscribe((status) => {
          if (isActive) {
            setIsSubscribed(status === "SUBSCRIBED");
          }
        });
    };

    setupSubscriptions();

    return () => {
      isActive = false;
      if (conversationsChannel) {
        supabase.removeChannel(conversationsChannel);
      }
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
    };
  }, []);

  return {
    notifiedConversationIds: filteredNotifiedIds,
    clearNotification,
    isSubscribed,
  };
}
