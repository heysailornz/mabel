import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/ui/text";
import { NewConversationIcon } from "@/components/icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";

function MenuIcon() {
  return (
    <View className="h-6 w-6 justify-center gap-1.5">
      <View className="h-0.5 w-5 bg-foreground rounded-full" />
      <View className="h-0.5 w-5 bg-foreground rounded-full" />
      <View className="h-0.5 w-3.5 bg-foreground rounded-full" />
    </View>
  );
}

interface AppHeaderProps {
  showNewChat?: boolean;
  title?: string;
}

export function AppHeader({ showNewChat = true, title }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View
      className="flex-row items-center justify-between px-4 h-14 bg-background"
      style={{ marginTop: insets.top }}
    >
      <Pressable onPress={openDrawer} className="active:opacity-70 p-1">
        <MenuIcon />
      </Pressable>

      {title ? (
        <Text
          className="text-base font-medium text-foreground flex-1 text-center mx-4"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      ) : (
        <Logo width={80} height={28} />
      )}

      {showNewChat ? (
        <Link href="/(app)" asChild>
          <Pressable className="active:opacity-70 p-1">
            <NewConversationIcon size={28} />
          </Pressable>
        </Link>
      ) : (
        <View className="w-6" />
      )}
    </View>
  );
}
