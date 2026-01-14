import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useAuth } from "@/contexts/auth-context";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppDrawerContent } from "@/components/navigation/app-drawer";
import { useConversations } from "@/hooks/use-conversations";
import { DrawerProvider } from "@/contexts/drawer-context";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { conversations, isLoading } = useConversations();
  return (
    <AppDrawerContent
      conversations={conversations}
      isLoading={isLoading}
      drawerProps={props}
    />
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <DrawerProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer
          screenOptions={{
            headerShown: false,
            drawerType: "front",
            drawerStyle: {
              width: 280,
            },
            swipeEnabled: true,
            swipeEdgeWidth: 50,
          }}
          drawerContent={CustomDrawerContent}
        >
          <Drawer.Screen
            name="index"
            options={{
              drawerLabel: "Home",
            }}
          />
          <Drawer.Screen
            name="c/[id]"
            options={{
              drawerLabel: "Conversation",
              drawerItemStyle: { display: "none" },
            }}
          />
        </Drawer>
      </GestureHandlerRootView>
    </DrawerProvider>
  );
}
