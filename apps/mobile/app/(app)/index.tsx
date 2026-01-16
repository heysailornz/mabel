import { useRef, useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { AppHeader } from "@/components/navigation/app-header";
import { InputTrigger } from "@/components/conversation/input-trigger";
import {
  ConversationInputSheet,
  type InputMode,
} from "@/components/conversation/conversation-input-sheet";
import { OfflineBar } from "@/components/offline-bar";
import { getTimeBasedGreeting } from "@project/core";
import { createConversation, addMessage } from "@/services/conversations";
import { useUploadQueue } from "@/hooks/use-upload-queue";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

function Disclaimer() {
  const insets = useSafeAreaInsets();
  return (
    <View className="px-8" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      <Text className="text-xs text-muted-foreground text-center leading-4">
        Mabel can make mistakes. Always review content and use your own
        judgement.
      </Text>
    </View>
  );
}

export default function NewConversationScreen() {
  const greeting = getTimeBasedGreeting();
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
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

  const handleSubmitText = useCallback(async (text: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Create conversation
      const result = await createConversation();
      if ("error" in result) {
        console.error("[NewConversationScreen] Failed to create conversation:", result.error);
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      // Add text message
      await addMessage(result.id, {
        participant_type: "practitioner",
        message_type: "user_input",
        content: text,
        metadata: {
          user_input_id: `text_${Date.now()}`,
          input_type: "text",
          status: "received",
        },
      });

      bottomSheetRef.current?.dismiss();

      // Navigate to conversation
      router.push(`/c/${result.id}`);
    } catch (err) {
      console.error("[NewConversationScreen] Failed to create conversation:", err);
      toast.error("Failed to create conversation");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, router]);

  const handleSubmitRecording = useCallback(async (uri: string, duration: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("[NewConversationScreen] Not authenticated - no user found");
        toast.error("Not authenticated");
        setIsSubmitting(false);
        return;
      }

      // Create conversation first
      const result = await createConversation();
      if ("error" in result) {
        console.error("[NewConversationScreen] Failed to create conversation for recording:", result.error);
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      // Add recording to upload queue with conversation ID
      await addToQueue({
        fileUri: uri,
        practitionerId: user.id,
        conversationId: result.id,
        durationSeconds: duration,
      });

      bottomSheetRef.current?.dismiss();

      // Navigate to conversation
      router.push(`/c/${result.id}`);
    } catch (err) {
      console.error("[NewConversationScreen] Failed to create conversation with recording:", err);
      toast.error("Failed to create conversation");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, addToQueue, router]);

  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      {/* Offline indicator */}
      {isOffline && <OfflineBar />}

      {/* Welcome content - centered */}
      <View className="flex-1 justify-center items-center px-8">
        <Text className="font-noto text-2xl text-foreground text-center mb-2">
          {greeting}
        </Text>
        <Text className="font-noto text-lg text-foreground text-center leading-7">
          Describe your consultation,{"\n"}and I'll start transcribing it{"\n"}
          for you.
        </Text>
      </View>

      {/* Bottom section - disabled when offline */}
      <InputTrigger
        onOpenText={handleOpenText}
        onOpenRecording={handleOpenRecording}
        disabled={isOffline}
      />
      <Disclaimer />

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
