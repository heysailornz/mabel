import { useCallback } from "react";
import { View, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Logo } from "@/components/Logo";
import { Text } from "@/components/ui/text";
import { NewConversationIcon } from "@/components/icons";
import { useAuth } from "@/contexts/auth-context";
import { useDrawer } from "@/contexts/drawer-context";
import type { ConversationWithPreview } from "@project/core";

function NotificationDot() {
  return (
    <View
      className="h-2 w-2 rounded-full bg-red-500"
      accessibilityLabel="New activity"
    />
  );
}

function UserAvatar({ initials }: { initials: string }) {
  return (
    <View
      className="h-8 w-8 rounded-full bg-muted items-center justify-center"
      accessibilityLabel={`User avatar: ${initials}`}
    >
      <Text className="text-xs text-muted-foreground font-medium">
        {initials}
      </Text>
    </View>
  );
}

interface ConversationItemProps {
  conversation: ConversationWithPreview;
  isActive: boolean;
  hasNotification: boolean;
  onNavigate: (id: string) => void;
}

function ConversationItem({
  conversation,
  isActive,
  hasNotification,
  onNavigate,
}: ConversationItemProps) {
  const title = conversation.title || "New Conversation";

  return (
    <Pressable
      onPress={() => onNavigate(conversation.id)}
      className={`flex-row items-center gap-2 px-3 py-2.5 rounded-md ${
        isActive ? "bg-muted" : "active:bg-muted/50"
      }`}
      accessibilityRole="button"
      accessibilityLabel={`${title}${hasNotification ? ", has new messages" : ""}`}
      accessibilityState={{ selected: isActive }}
    >
      {hasNotification && <NotificationDot />}
      <Text
        className={`text-sm flex-1 ${
          isActive ? "text-foreground" : "text-muted-foreground"
        }`}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

interface AppDrawerContentProps {
  conversations: ConversationWithPreview[];
  isLoading?: boolean;
  drawerProps: DrawerContentComponentProps;
}

export function AppDrawerContent({
  conversations,
  isLoading = false,
  drawerProps,
}: AppDrawerContentProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { notifiedConversationIds, clearNotification } = useDrawer();

  const navigateToConversation = useCallback(
    (id: string) => {
      // Clear notification when navigating to the conversation
      clearNotification(id);
      // Navigate directly - drawer will close automatically
      router.push(`/(app)/c/${id}`);
    },
    [clearNotification, router]
  );

  const navigateToNewChat = useCallback(() => {
    router.push("/(app)");
  }, [router]);

  const userInitials = user?.email ? user.email[0].toUpperCase() : "U";
  const userName = user?.email || "User";

  const renderConversationItem = useCallback(
    ({ item: conversation }: { item: ConversationWithPreview }) => {
      const isActive = pathname === `/c/${conversation.id}`;
      const hasNotification = notifiedConversationIds.has(conversation.id);
      return (
        <ConversationItem
          conversation={conversation}
          isActive={isActive}
          hasNotification={hasNotification}
          onNavigate={navigateToConversation}
        />
      );
    },
    [pathname, notifiedConversationIds, navigateToConversation]
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View className="px-2 py-4">
        <Text className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : "No conversations yet"}
        </Text>
      </View>
    ),
    [isLoading]
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 h-14">
        <Logo width={80} height={28} />
      </View>

      {/* New Task Menu Item */}
      <View className="px-2 py-3">
        <Pressable
          onPress={navigateToNewChat}
          className="flex-row items-center gap-3 px-2 py-2 rounded-md active:bg-muted/50"
          accessibilityRole="button"
          accessibilityLabel="Create new task"
        >
          <NewConversationIcon size={25} />
          <Text className="text-base font-semibold">New task</Text>
        </Pressable>
      </View>

      {/* Recents Section */}
      <View className="px-4 py-2">
        <Text className="text-xs font-medium text-foreground/70">Recents</Text>
      </View>

      {/* Conversation List */}
      <View className="flex-1 px-2">
        <FlashList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={ListEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* User Profile */}
      <View
        className="border-t border-border px-4 py-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        accessibilityRole="summary"
        accessibilityLabel={`Logged in as ${userName}`}
      >
        <View className="flex-row items-center gap-3">
          <UserAvatar initials={userInitials} />
          <Text className="text-sm font-medium flex-1" numberOfLines={1}>
            {userName}
          </Text>
        </View>
      </View>
    </View>
  );
}
