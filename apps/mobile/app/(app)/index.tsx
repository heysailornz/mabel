import { useRef, useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { AppHeader } from "@/components/navigation/app-header";
import { InputTrigger } from "@/components/conversation/input-trigger";
import {
  ConversationInputSheet,
  type InputMode,
} from "@/components/conversation/conversation-input-sheet";
import { getTimeBasedGreeting } from "@project/core";

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

  const handleSubmitText = useCallback((text: string) => {
    // TODO: Create conversation and submit text
    console.log("Submit text:", text);
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleSubmitRecording = useCallback((uri: string, duration: number) => {
    // TODO: Create conversation and submit recording
    console.log("Submit recording:", uri, duration);
    bottomSheetRef.current?.dismiss();
  }, []);

  return (
    <View className="flex-1 bg-background">
      <AppHeader />

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

      {/* Bottom section */}
      <InputTrigger
        onOpenText={handleOpenText}
        onOpenRecording={handleOpenRecording}
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
