import { useEffect, useRef, useState } from "react";
import { View, Pressable, Keyboard, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Mic, Trash2, Send, Play } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { COLORS } from "@project/core/theme";
import type { InputMode } from "./conversation-input-sheet";

// Static placeholder waveform heights
const WAVEFORM_HEIGHTS = [
  6, 10, 8, 14, 12, 10, 16, 8, 12, 14, 10, 6, 12, 8, 14, 10, 12, 8, 6, 10,
];

type InputState = "resting" | "typing" | "recording" | "recorded";

interface ConversationInputProps {
  initialMode: InputMode;
  isOpen: boolean;
  onSubmitText: (text: string) => void;
  onSubmitRecording: (uri: string, duration: number) => void;
  onCancel: () => void;
}

export function ConversationInput({
  initialMode,
  isOpen,
  onSubmitText,
  onSubmitRecording,
  onCancel,
}: ConversationInputProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [state, setState] = useState<InputState>(
    initialMode === "recording" ? "recording" : "resting"
  );
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Track keyboard visibility (use "Will" events for immediate response on iOS)
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", () => {
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardVisible(false);
    });
    // Android fallback (doesn't support "Will" events)
    const showSubAndroid = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubAndroid = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      showSubAndroid.remove();
      hideSubAndroid.remove();
    };
  }, []);

  // Determine effective state based on text content
  const effectiveState =
    text.length > 0 && state === "resting" ? "typing" : state;

  // Auto-focus text input when sheet opens in text mode
  useEffect(() => {
    if (isOpen && initialMode === "text") {
      // Small delay to ensure the sheet animation is complete
      // const timer = setTimeout(() => {
      inputRef.current?.focus();
      // }, 30);
      // return () => clearTimeout(timer);
    }
  }, [isOpen, initialMode]);

  // Recording timer simulation (actual recording will be implemented later)
  useEffect(() => {
    if (state === "recording") {
      const interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTextChange = (value: string) => {
    setText(value);
  };

  const handleSend = () => {
    if (effectiveState === "typing" && text.trim()) {
      onSubmitText(text.trim());
      setText("");
      setState("resting");
    } else if (state === "recorded") {
      // TODO: Submit actual recording
      onSubmitRecording("placeholder-uri", recordingDuration);
    }
  };

  const handleMicPress = () => {
    if (state === "resting" || effectiveState === "typing") {
      setState("recording");
      setRecordingDuration(0);
      setText("");
    } else if (state === "recording") {
      // Stop recording
      setState("recorded");
    } else if (state === "recorded") {
      // Start new recording
      setState("recording");
      setRecordingDuration(0);
    }
  };

  const handleDelete = () => {
    setState("resting");
    setRecordingDuration(0);
  };

  const handlePlayback = () => {
    // TODO: Implement playback
    console.log("Play recording");
  };

  // Render text input area (for resting/typing states)
  const renderTextInput = () => (
    <View className="px-4 py-4">
      <BottomSheetTextInput
        ref={inputRef}
        value={text}
        onChangeText={handleTextChange}
        placeholder="Dictate or enter a consultation note ..."
        placeholderTextColor={COLORS.mutedForeground}
        multiline
        className="text-base text-foreground min-h-[80px]"
        style={{ textAlignVertical: "top" }}
      />
    </View>
  );

  // Render recording state (timer + waveform)
  const renderRecording = () => (
    <View className="px-4 py-4">
      <View className="flex-row items-center gap-4">
        {/* Timer */}
        <Text className="text-lg font-medium text-foreground w-14">
          {formatDuration(recordingDuration)}
        </Text>

        {/* Waveform */}
        <View className="flex-1 flex-row items-center justify-center gap-0.5">
          {WAVEFORM_HEIGHTS.map((height, i) => (
            <View
              key={i}
              className="w-1 rounded-full bg-muted-foreground/40"
              style={{ height }}
            />
          ))}
        </View>
      </View>
    </View>
  );

  // Render recorded state (playback pill)
  const renderRecorded = () => (
    <View className="px-4 py-4">
      <Card className="flex-row items-center gap-3 rounded-full px-4 py-3 border-border">
        {/* Play button */}
        <Pressable
          onPress={handlePlayback}
          className="h-10 w-10 items-center justify-center rounded-full bg-green-600"
        >
          <Play size={18} fill={COLORS.icon.white} color={COLORS.icon.white} />
        </Pressable>

        {/* Waveform */}
        <View className="flex-1 flex-row items-center justify-center gap-0.5">
          {WAVEFORM_HEIGHTS.map((height, i) => (
            <View
              key={i}
              className="w-1 rounded-full bg-muted-foreground/40"
              style={{ height }}
            />
          ))}
        </View>

        {/* Duration */}
        <Text className="text-base text-muted-foreground">
          {formatDuration(recordingDuration)}
        </Text>
      </Card>
    </View>
  );

  // Render action buttons for resting/typing states (right-aligned)
  const renderTextActions = () => {
    const hasText = text.trim().length > 0;

    return (
      <View
        className="flex-row items-center justify-end px-4 pt-2"
        style={{ paddingBottom: keyboardVisible ? 16 : Math.max(insets.bottom, 24) }}
      >
        {hasText ? (
          <Pressable
            onPress={handleSend}
            className="h-12 w-12 items-center justify-center rounded-full bg-accent active:opacity-90"
          >
            <Send size={22} color={COLORS.icon.white} />
          </Pressable>
        ) : (
          <Pressable onPress={handleMicPress} className="p-2 active:opacity-80">
            <Mic size={28} color={COLORS.icon.default} strokeWidth={1.5} />
          </Pressable>
        )}
      </View>
    );
  };

  // Render action buttons for recording/recorded states (spread layout)
  const renderRecordingActions = () => {
    const isRecording = state === "recording";

    return (
      <View
        className="flex-row items-center justify-between px-4 pt-2"
        style={{ paddingBottom: keyboardVisible ? 16 : Math.max(insets.bottom, 24) }}
      >
        {/* Delete button */}
        <Pressable onPress={handleDelete} className="p-2 active:opacity-70">
          <Trash2 size={28} color={COLORS.icon.default} />
        </Pressable>

        {/* Mic button */}
        <Pressable onPress={handleMicPress} className="active:opacity-80">
          <Mic
            size={28}
            color={isRecording ? COLORS.icon.destructive : COLORS.icon.default}
            strokeWidth={1.5}
          />
        </Pressable>

        {/* Send button */}
        <Pressable
          onPress={handleSend}
          className="h-12 w-12 items-center justify-center rounded-full bg-accent active:opacity-90"
        >
          <Send size={22} color={COLORS.icon.white} />
        </Pressable>
      </View>
    );
  };

  return (
    <View>
      {/* Main content area based on state */}
      {(effectiveState === "resting" || effectiveState === "typing") &&
        renderTextInput()}
      {state === "recording" && renderRecording()}
      {state === "recorded" && renderRecorded()}

      {/* Action buttons - different layout based on state */}
      {(effectiveState === "resting" || effectiveState === "typing") &&
        renderTextActions()}
      {(state === "recording" || state === "recorded") &&
        renderRecordingActions()}
    </View>
  );
}
