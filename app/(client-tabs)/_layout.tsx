import { Tabs } from "expo-router"
import { View, Text } from "react-native"

export default function ClientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1C1F26",
          borderTopColor: "#2E3340",
          height: 85,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#F97316",
        tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "My Project",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: "Photos",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 18, height: 14, borderRadius: 3, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: "#F97316",
              alignItems: "center", justifyContent: "center",
              marginBottom: 20,
              shadowColor: "#F97316",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>✓</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 14, height: 18, borderRadius: 2, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 18, height: 14, borderRadius: 3, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }} />
            </View>
          ),
        }}
      />
    </Tabs>
  )
}