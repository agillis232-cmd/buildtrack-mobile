import { Tabs } from "expo-router"
import { View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import FloatingTabBar from "@/components/FloatingTabBar"

type IconName = keyof typeof Ionicons.glyphMap

// Filled icon for the selected tab, outline for the rest.
function tabIcon(selected: IconName, idle: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? selected : idle} size={size} color={color} />
  )
}

export default function ClientTabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={props => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: "Project", tabBarIcon: tabIcon("home", "home-outline") }} />
        <Tabs.Screen name="photos" options={{ title: "Photos", tabBarIcon: tabIcon("images", "images-outline") }} />
        <Tabs.Screen name="approvals" options={{ title: "Approvals", tabBarIcon: tabIcon("checkmark-circle", "checkmark-circle-outline") }} />
        <Tabs.Screen name="documents" options={{ title: "Docs", tabBarIcon: tabIcon("folder", "folder-outline") }} />
        <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: tabIcon("chatbubbles", "chatbubbles-outline") }} />
      </Tabs>
    </View>
  )
}
