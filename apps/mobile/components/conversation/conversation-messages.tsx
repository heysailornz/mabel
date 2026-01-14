import { useCallback } from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Text } from "@/components/ui/text";
import { RecordingBubble } from "./recording-bubble";
import { TranscriptionBubble, SystemMessage } from "./transcription-bubble";
import type { ConversationMessage } from "@project/core";

interface ConversationMessagesProps {
  messages: ConversationMessage[];
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isPractitioner = message.participant_type === "practitioner";
  const isSystem = message.participant_type === "system";

  // System messages
  if (isSystem) {
    return <SystemMessage message={message} />;
  }

  // Recording upload from practitioner
  if (isPractitioner && message.message_type === "recording_upload") {
    return (
      <View className="flex-row justify-end">
        <RecordingBubble message={message} />
      </View>
    );
  }

  // Transcription result from AI
  if (message.message_type === "transcription_result") {
    return (
      <View className="flex-row justify-start">
        <TranscriptionBubble message={message} />
      </View>
    );
  }

  // Suggestion message from AI (usually rendered with transcription)
  if (message.message_type === "suggestion") {
    // Suggestions are typically shown inline with transcription results
    // Return null here as they'll be combined
    return null;
  }

  // Summary message
  if (message.message_type === "summary") {
    return (
      <View className="flex-row justify-start">
        <Text className="font-noto text-base text-foreground">
          {message.content}
        </Text>
      </View>
    );
  }

  // User edit message
  if (message.message_type === "user_edit") {
    return (
      <View className="items-center">
        <View className="rounded-full bg-muted px-4 py-2">
          <Text className="text-xs text-muted-foreground">
            Transcript edited
          </Text>
        </View>
      </View>
    );
  }

  // Accepted suggestion message
  if (message.message_type === "accepted_suggestion") {
    return (
      <View className="items-center">
        <View className="rounded-full bg-green-100 px-4 py-2">
          <Text className="text-xs text-green-700">Suggestion applied</Text>
        </View>
      </View>
    );
  }

  // Generic message fallback
  return (
    <View
      className={`flex-row ${isPractitioner ? "justify-end" : "justify-start"}`}
    >
      <View
        className={`max-w-[280px] rounded-2xl px-4 py-2 ${
          isPractitioner ? "bg-primary" : "bg-transparent"
        }`}
      >
        <Text
          className={`text-sm ${
            isPractitioner ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export function ConversationMessages({ messages }: ConversationMessagesProps) {
  const renderItem = useCallback(
    ({ item }: { item: ConversationMessage }) => (
      <View className="py-2">
        <MessageBubble message={item} />
      </View>
    ),
    []
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-muted-foreground">No messages yet</Text>
      </View>
    ),
    []
  );

  return (
    <View className="flex-1">
      <FlashList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          startRenderingFromBottom: true,
          autoscrollToBottomThreshold: 100,
        }}
      />
    </View>
  );
}
