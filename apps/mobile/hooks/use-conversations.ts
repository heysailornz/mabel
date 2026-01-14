import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getConversations } from "@/services/conversations";
import type { ConversationWithPreview } from "@project/core";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseConversationsReturn {
  conversations: ConversationWithPreview[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationWithPreview[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (isActive = true) => {
    try {
      if (isActive) setIsLoading(true);
      if (isActive) setError(null);
      const data = await getConversations();
      if (isActive) setConversations(data);
    } catch (err) {
      if (isActive) {
        setError(err instanceof Error ? err.message : "Failed to load conversations");
      }
    } finally {
      if (isActive) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    fetchConversations(isActive);

    // Subscribe to conversation updates
    let channel: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isActive) return;

      channel = supabase
        .channel("conversations-list")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversations",
            filter: `practitioner_id=eq.${user.id}`,
          },
          () => {
            // Refetch conversations when any change occurs
            if (isActive) fetchConversations(isActive);
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      isActive = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchConversations]);

  // Expose refresh without the isActive parameter for external use
  const refresh = useCallback(() => fetchConversations(true), [fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refresh,
  };
}
