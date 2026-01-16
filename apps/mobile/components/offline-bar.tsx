/**
 * OfflineBar Component
 *
 * Displays a centered "OFFLINE" indicator when the device is offline.
 */

import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function OfflineBar() {
  return (
    <View className="bg-muted py-2 px-4">
      <Text className="text-sm text-muted-foreground text-center font-medium">
        OFFLINE
      </Text>
    </View>
  );
}
