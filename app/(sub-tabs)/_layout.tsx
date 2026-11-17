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

export default function SubTabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={props => <FloatingTabBar {...props} quickAddRoute="camera" />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: "Projects", tabBarIcon: tabIcon("briefcase", "briefcase-outline") }} />
        {/* Site photos is the separate "+" button next to the bar. */}
        <Tabs.Screen name="camera" options={{ title: "Photo" }} />
        <Tabs.Screen name="rfis" options={{ title: "RFIs", tabBarIcon: tabIcon("help-circle", "help-circle-outline") }} />
        <Tabs.Screen name="daily-log" options={{ title: "Daily log", tabBarIcon: tabIcon("document-text", "document-text-outline") }} />
        <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person-circle", "person-circle-outline") }} />
      </Tabs>
      <OfflineBanner />
    </View>
  )
}
