import { forwardRef, useCallback, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Easing, type WithTimingConfig } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { ConversationInput } from "./conversation-input";

export type InputMode = "text" | "recording";

interface ConversationInputSheetProps {
  initialMode: InputMode;
  onSubmitText: (text: string) => void;
  onSubmitRecording: (uri: string, duration: number, spectrumData?: number[][]) => void;
  onDismiss: () => void;
}

export const ConversationInputSheet = forwardRef<
  BottomSheetModal,
  ConversationInputSheetProps
>(function ConversationInputSheet(
  { initialMode, onSubmitText, onSubmitRecording, onDismiss },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);

  // Faster animation config
  const animationConfigs = useMemo<WithTimingConfig>(
    () => ({
      duration: 200,
      easing: Easing.out(Easing.quad),
    }),
    []
  );

  // Render backdrop with dimming
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleCancel = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleSheetChange = useCallback((index: number) => {
    setIsOpen(index >= 0);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    onDismiss();
  }, [onDismiss]);

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 16,
      }}
      handleComponent={null}
      animationConfigs={animationConfigs}
      onChange={handleSheetChange}
      onDismiss={handleDismiss}
    >
      <BottomSheetView>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Pressable onPress={handleCancel} className="py-1">
            <Text className="text-base">Cancel</Text>
          </Pressable>
          <Text className="text-base font-semibold">New entry</Text>
          {/* Spacer to center the title */}
          <View className="w-14" />
        </View>

        {/* Content */}
        <ConversationInput
          initialMode={initialMode}
          isOpen={isOpen}
          onSubmitText={onSubmitText}
          onSubmitRecording={onSubmitRecording}
          onCancel={handleCancel}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});
