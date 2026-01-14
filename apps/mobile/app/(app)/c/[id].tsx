import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import { AppHeader } from "@/components/navigation/app-header";
import { RecordingBar, ConversationMessages } from "@/components/conversation";
import { useConversationMessages } from "@/hooks/use-conversation-messages";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { conversation, messages, isLoading, error } = useConversationMessages({
    conversationId: id,
  });

  const handleRecordPress = () => {
    console.log("Record pressed in conversation:", id);
    // TODO: Start recording
  };

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

      {/* Recording bar */}
      <RecordingBar onRecordPress={handleRecordPress} />
    </View>
  );
}
