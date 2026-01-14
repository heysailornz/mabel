import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Static placeholder waveform heights
const WAVEFORM_HEIGHTS = [
  8, 12, 10, 16, 14, 12, 18, 10, 14, 16, 12, 8, 14, 10, 16, 12, 14, 10, 8, 12,
];

function MicrophoneIcon() {
  return (
    <View className="items-center justify-center">
      {/* Microphone body */}
      <View className="w-2.5 h-4 bg-white rounded-full" />
      {/* Microphone stand */}
      <View className="w-4 h-2 border-2 border-white border-t-0 rounded-b-full mt-0.5" />
      {/* Microphone base */}
      <View className="w-0.5 h-1.5 bg-white" />
    </View>
  );
}

interface RecordingBarProps {
  onRecordPress?: () => void;
  isRecording?: boolean;
}

export function RecordingBar({
  onRecordPress,
  isRecording = false,
}: RecordingBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="px-4 pb-4 bg-background"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View className="rounded-full border border-border bg-card px-4 py-3 shadow-sm">
        <View className="flex-row items-center justify-between gap-4">
          {/* Waveform visualization */}
          <View className="flex-1 flex-row items-center justify-center gap-0.5">
            {WAVEFORM_HEIGHTS.map((height, i) => (
              <View
                key={i}
                className={`w-1 rounded-full ${
                  isRecording ? "bg-red-500" : "bg-muted-foreground/30"
                }`}
                style={{ height }}
              />
            ))}
          </View>

          {/* Record button */}
          <Pressable
            onPress={onRecordPress}
            className={`h-11 w-11 items-center justify-center rounded-full shadow-md ${
              isRecording ? "bg-red-600" : "bg-red-500"
            } active:bg-red-600`}
          >
            <MicrophoneIcon />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
