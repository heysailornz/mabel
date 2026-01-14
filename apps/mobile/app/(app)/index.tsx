import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { AppHeader } from "@/components/navigation/app-header";
import { RecordingBar } from "@/components/conversation/recording-bar";
import { getTimeBasedGreeting } from "@project/core";

function Disclaimer() {
  return (
    <View className="px-8 pb-2">
      <Text className="text-xs text-muted-foreground text-center leading-4">
        Mabel can make mistakes. Always review content and use your own
        judgement.
      </Text>
    </View>
  );
}

export default function NewConversationScreen() {
  const greeting = getTimeBasedGreeting();

  const handleRecordPress = () => {
    // TODO: Start recording and create conversation
    console.log("Record pressed");
  };

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
      <RecordingBar onRecordPress={handleRecordPress} />
      <Disclaimer />
    </View>
  );
}
