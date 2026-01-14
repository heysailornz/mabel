import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import type { ConversationMessage, SuggestionMetadata } from "@project/core";

// Document icon for artifact card
function DocumentIcon() {
  return (
    <View className="w-5 h-5 items-center justify-center">
      <View className="w-4 h-5 border border-muted-foreground/60 rounded-sm">
        <View className="w-2 h-0.5 bg-muted-foreground/40 mt-1.5 ml-0.5" />
        <View className="w-3 h-0.5 bg-muted-foreground/40 mt-0.5 ml-0.5" />
        <View className="w-2.5 h-0.5 bg-muted-foreground/40 mt-0.5 ml-0.5" />
      </View>
    </View>
  );
}

// Arrow icon for review button
function ArrowRightIcon() {
  return (
    <View className="w-5 h-5 items-center justify-center">
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderTopWidth: 4,
          borderBottomWidth: 4,
          borderLeftColor: "#6B7280",
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
        }}
      />
    </View>
  );
}

// QR code icon for review on web
function QRCodeIcon() {
  return (
    <View className="w-5 h-5 flex-row flex-wrap gap-0.5">
      <View className="w-2 h-2 bg-muted-foreground/60" />
      <View className="w-2 h-2 border border-muted-foreground/60" />
      <View className="w-2 h-2 border border-muted-foreground/60" />
      <View className="w-2 h-2 bg-muted-foreground/60" />
    </View>
  );
}

interface ArtifactCardProps {
  title: string;
  onReview?: () => void;
  onReviewOnWeb?: () => void;
}

function ArtifactCard({ title, onReview, onReviewOnWeb }: ArtifactCardProps) {
  return (
    <View className="bg-card rounded-xl border border-border overflow-hidden mt-4">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <DocumentIcon />
        <Text className="text-base font-medium text-foreground">{title}</Text>
      </View>

      {/* Review button */}
      <Pressable
        onPress={onReview}
        className="flex-row items-center justify-between px-4 py-3 border-b border-border active:bg-muted/50"
      >
        <Text className="text-base text-foreground">Review</Text>
        <ArrowRightIcon />
      </Pressable>

      {/* Review on web button */}
      <Pressable
        onPress={onReviewOnWeb}
        className="flex-row items-center justify-between px-4 py-3 active:bg-muted/50"
      >
        <Text className="text-base text-foreground">Review on web</Text>
        <QRCodeIcon />
      </Pressable>
    </View>
  );
}

interface TranscriptionBubbleProps {
  message: ConversationMessage;
  suggestionMessage?: ConversationMessage;
  onReview?: () => void;
  onReviewOnWeb?: () => void;
}

export function TranscriptionBubble({
  message,
  suggestionMessage,
  onReview,
  onReviewOnWeb,
}: TranscriptionBubbleProps) {
  const suggestions = suggestionMessage?.metadata
    ? (suggestionMessage.metadata as unknown as SuggestionMetadata).suggestions
    : [];

  return (
    <View className="max-w-[320px]">
      {/* Main transcription acknowledgement */}
      <Text className="font-noto text-base text-foreground leading-6">
        Got it, thanks. This looks like a consultation about a patient with
        appendicitis.
      </Text>

      <Text className="font-noto text-base text-foreground leading-6 mt-3">
        I've made a draft transcription for you to review.
      </Text>

      {/* Suggestions section */}
      {suggestions.length > 0 && (
        <View className="mt-3">
          <Text className="font-noto text-base text-foreground leading-6">
            I have a couple of suggestions for you to consider:
          </Text>
          <View className="mt-2 gap-1">
            {suggestions.map((suggestion, index) => (
              <View key={suggestion.id || index} className="flex-row">
                <Text className="font-noto text-base text-foreground">
                  {"\u2022 "}
                </Text>
                <Text className="font-noto text-base text-foreground flex-1 leading-6">
                  {suggestion.message.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Call to action */}
      <Text className="font-noto text-base text-foreground leading-6 mt-3">
        Record below to add more detail, or review the transcript.
      </Text>

      {/* Artifact card */}
      <ArtifactCard
        title="Draft Transcript"
        onReview={onReview}
        onReviewOnWeb={onReviewOnWeb}
      />
    </View>
  );
}

interface SystemMessageProps {
  message: ConversationMessage;
}

export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <View className="items-center">
      <View className="rounded-full bg-muted px-4 py-2">
        <Text className="text-xs text-muted-foreground">{message.content}</Text>
      </View>
    </View>
  );
}
