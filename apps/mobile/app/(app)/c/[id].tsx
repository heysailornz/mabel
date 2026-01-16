import { useRef, useCallback, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { AppHeader } from "@/components/navigation/app-header";
import { ConversationMessages } from "@/components/conversation";
import { InputTrigger } from "@/components/conversation/input-trigger";
import {
  ConversationInputSheet,
  type InputMode,
} from "@/components/conversation/conversation-input-sheet";
import { OfflineBar } from "@/components/offline-bar";
import { useConversationMessages } from "@/hooks/use-conversation-messages";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { addMessage } from "@/services/conversations";
import { useUploadQueue } from "@/hooks/use-upload-queue";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isOffline } = useNetworkStatus();
  const { conversation, messages, isLoading, error, refresh } = useConversationMessages({
    conversationId: id,
  });
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [initialMode, setInitialMode] = useState<InputMode>("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToQueue } = useUploadQueue();

  const handleOpenText = useCallback(() => {
    if (isOffline) return;
    setInitialMode("text");
    bottomSheetRef.current?.present();
  }, [isOffline]);

  const handleOpenRecording = useCallback(() => {
    if (isOffline) return;
    setInitialMode("recording");
    bottomSheetRef.current?.present();
  }, [isOffline]);

  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleSubmitText = useCallback(
    async (text: string) => {
      if (!id || isSubmitting) return;
      setIsSubmitting(true);

      try {
        const result = await addMessage(id, {
          participant_type: "practitioner",
          message_type: "user_input",
          content: text,
          metadata: {
            user_input_id: `text_${Date.now()}`,
            input_type: "text",
            status: "received",
          },
        });

        if ("error" in result) {
          console.error("[ConversationScreen] Failed to add message:", result.error);
          toast.error(result.error);
        } else {
          // Refresh messages
          refresh();
        }

        bottomSheetRef.current?.dismiss();
      } catch (err) {
        console.error("[ConversationScreen] Failed to send message:", err);
        toast.error("Failed to send message");
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, isSubmitting, refresh]
  );

  const handleSubmitRecording = useCallback(
    async (uri: string, duration: number) => {
      if (!id || isSubmitting) return;
      setIsSubmitting(true);

      try {
        // Get user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("[ConversationScreen] Not authenticated - no user found");
          toast.error("Not authenticated");
          setIsSubmitting(false);
          return;
        }

        // Add to upload queue with existing conversation ID
        await addToQueue({
          fileUri: uri,
          practitionerId: user.id,
          conversationId: id,
          durationSeconds: duration,
        });

        // Refresh messages (will show the pending upload)
        refresh();

        bottomSheetRef.current?.dismiss();
      } catch (err) {
        console.error("[ConversationScreen] Failed to queue recording:", err);
        toast.error("Failed to queue recording");
      } finally {
        setIsSubmitting(false);
      }
    },
    [id, isSubmitting, addToQueue, refresh]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (error || !conversation) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-muted-foreground text-center">
            {error || "Conversation not found"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader title={conversation.title || undefined} />

      {/* Offline indicator */}
      {isOffline && <OfflineBar />}

      {/* Messages */}
      <ConversationMessages messages={messages} />

      {/* Input trigger - disabled when offline */}
      <InputTrigger
        onOpenText={handleOpenText}
        onOpenRecording={handleOpenRecording}
        disabled={isOffline}
      />

      {/* Bottom Sheet */}
      <ConversationInputSheet
        ref={bottomSheetRef}
        initialMode={initialMode}
        onSubmitText={handleSubmitText}
        onSubmitRecording={handleSubmitRecording}
        onDismiss={handleDismiss}
      />
    </View>
  );
}
