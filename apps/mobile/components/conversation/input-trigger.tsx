import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mic } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

interface InputTriggerProps {
  onOpenText: () => void;
  onOpenRecording: () => void;
}

export function InputTrigger({ onOpenText, onOpenRecording }: InputTriggerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="px-4 bg-background"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <Card className="flex-row items-center gap-3 rounded-2xl border border-border py-3 px-4">
        {/* Text input area - tap to open in text mode */}
        <Pressable
          onPress={onOpenText}
          className="flex-1 py-1 active:opacity-70"
        >
          <Text className="text-muted-foreground text-base">
            Dictate or enter a consultation note ...
          </Text>
        </Pressable>

        {/* Mic button - tap to open in recording mode */}
        <Pressable
          onPress={onOpenRecording}
          className="p-2 active:opacity-70"
        >
          <Mic size={22} className="text-foreground" strokeWidth={1.5} />
        </Pressable>
      </Card>
    </View>
  );
}
