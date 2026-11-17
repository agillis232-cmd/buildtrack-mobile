import { Tabs } from "expo-router"
import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import OfflineBanner from "../components/OfflineBanner"
import FloatingTabBar from "@/components/FloatingTabBar"

type IconName = keyof typeof Ionicons.glyphMap

// Filled icon for the selected tab, outline for the rest.
function tabIcon(selected: IconName, idle: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? selected : idle} size={size} color={color} />
  )
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={props => <FloatingTabBar {...props} quickAddRoute="camera" />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home", "home-outline") }} />
        <Tabs.Screen name="projects" options={{ title: "Schedule", tabBarIcon: tabIcon("calendar", "calendar-outline") }} />
        {/* Quick Add is the separate "+" button next to the bar. */}
        <Tabs.Screen name="camera" options={{ title: "Quick Add" }} />
        <Tabs.Screen name="expenses" options={{ title: "Expenses", tabBarIcon: tabIcon("wallet", "wallet-outline") }} />
        <Tabs.Screen name="documents" options={{ title: "Documents", tabBarIcon: tabIcon("folder", "folder-outline") }} />
      </Tabs>
      <OfflineBanner />
    </View>
  )
}
