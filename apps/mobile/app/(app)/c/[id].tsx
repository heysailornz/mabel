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
import { useConversationMessages } from "@/hooks/use-conversation-messages";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversation, messages, isLoading, error } = useConversationMessages({
    conversationId: id,
  });
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [initialMode, setInitialMode] = useState<InputMode>("text");

  const handleOpenText = useCallback(() => {
    setInitialMode("text");
    bottomSheetRef.current?.present();
  }, []);

  const handleOpenRecording = useCallback(() => {
    setInitialMode("recording");
    bottomSheetRef.current?.present();
  }, []);

  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleSubmitText = useCallback(
    (text: string) => {
      // TODO: Submit text to conversation
      console.log("Submit text to conversation:", id, text);
      bottomSheetRef.current?.dismiss();
    },
    [id]
  );

  const handleSubmitRecording = useCallback(
    (uri: string, duration: number) => {
      // TODO: Submit recording to conversation
      console.log("Submit recording to conversation:", id, uri, duration);
      bottomSheetRef.current?.dismiss();
    },
    [id]
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

      {/* Messages */}
      <ConversationMessages messages={messages} />

      {/* Input trigger */}
      <InputTrigger
        onOpenText={handleOpenText}
        onOpenRecording={handleOpenRecording}
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
