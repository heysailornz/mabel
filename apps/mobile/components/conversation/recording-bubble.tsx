import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import type {
  ConversationMessage,
  RecordingUploadMetadata,
  RecordingUploadStatus,
} from "@project/core";

// Static placeholder waveform heights for recording bubbles
const RECORDING_WAVEFORM_HEIGHTS = [
  10, 14, 12, 18, 16, 14, 20, 12, 16, 18, 14, 10, 16, 12, 18,
];

function PlayIcon() {
  return (
    <View className="items-center justify-center ml-0.5">
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 10,
          borderTopWidth: 6,
          borderBottomWidth: 6,
          borderLeftColor: "white",
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
        }}
      />
    </View>
  );
}

function SingleTick({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <View style={{ width: 14, height: 14 }}>
      <View
        style={{
          position: "absolute",
          left: 3,
          top: 4,
          width: 4,
          height: 8,
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

function DoubleTick({ color = "#9CA3AF" }: { color?: string }) {
  return (
    <View className="flex-row" style={{ width: 20, height: 14 }}>
      <View style={{ width: 14, height: 14 }}>
        <View
          style={{
            position: "absolute",
            left: 2,
            top: 4,
            width: 4,
            height: 8,
            borderRightWidth: 2,
            borderBottomWidth: 2,
            borderColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
      <View style={{ width: 14, height: 14, marginLeft: -8 }}>
        <View
          style={{
            position: "absolute",
            left: 2,
            top: 4,
            width: 4,
            height: 8,
            borderRightWidth: 2,
            borderBottomWidth: 2,
            borderColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
    </View>
  );
}

function FailedIcon() {
  return (
    <View className="flex-row items-center gap-1">
      <View className="w-4 h-4 items-center justify-center">
        <View className="absolute w-2.5 h-0.5 bg-red-500 rotate-45" />
        <View className="absolute w-2.5 h-0.5 bg-red-500 -rotate-45" />
      </View>
      <Text className="text-xs text-red-500">Retry</Text>
    </View>
  );
}

function TickStatus({ status }: { status: RecordingUploadStatus }) {
  const isDoubleTick =
    status === "uploaded" || status === "processing" || status === "completed";
  const isBlue = status === "completed";
  const isFailed = status === "failed";
  const isRecording = status === "recording";

  if (isRecording) {
    return (
      <View className="flex-row items-center">
        <View className="h-2 w-2 rounded-full bg-red-500" />
      </View>
    );
  }

  if (isFailed) {
    return <FailedIcon />;
  }

  if (isDoubleTick) {
    return <DoubleTick color={isBlue ? "#3B82F6" : "#9CA3AF"} />;
  }

  return <SingleTick />;
}

interface RecordingBubbleProps {
  message: ConversationMessage;
  onPlay?: () => void;
}

export function RecordingBubble({ message, onPlay }: RecordingBubbleProps) {
  const metadata = message.metadata as unknown as RecordingUploadMetadata;
  const status = metadata?.status || "pending";
  const durationSeconds = metadata?.duration_seconds || 0;

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const durationText = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <View className="flex-col items-end gap-1">
      <View className="rounded-2xl bg-card p-4 shadow-sm max-w-[280px]">
        <View className="flex-row items-center gap-3">
          {/* Waveform visualization */}
          <View className="flex-1 flex-row items-center gap-0.5">
            {RECORDING_WAVEFORM_HEIGHTS.map((height, i) => (
              <View
                key={i}
                className="w-1 bg-muted-foreground/40 rounded-full"
                style={{ height }}
              />
            ))}
          </View>

          {/* Play button */}
          <Pressable
            onPress={onPlay}
            className="h-10 w-10 items-center justify-center rounded-full bg-green-500 active:bg-green-600"
          >
            <PlayIcon />
          </Pressable>
        </View>

        {/* Duration */}
        {durationSeconds > 0 && (
          <Text className="mt-2 text-xs text-muted-foreground">
            {durationText}
          </Text>
        )}
      </View>

      {/* Tick status */}
      <TickStatus status={status} />
    </View>
  );
}
