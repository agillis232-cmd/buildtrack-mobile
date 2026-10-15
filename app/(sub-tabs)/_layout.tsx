import { Tabs } from "expo-router"
import { View } from "react-native"
import OfflineBanner from "../components/OfflineBanner"

export default function SubTabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
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
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
        }}
      >
        <Tabs.Screen name="index" options={{
          title: "Projects",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }}>
                <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)", margin: 2 }} />
              </View>
            </View>
          ),
        }} />
        <Tabs.Screen name="camera" options={{
          title: "Camera",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: focused ? "#F97316" : "#2E3340", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <View style={{ width: 20, height: 16, borderRadius: 4, borderWidth: 2, borderColor: "white" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: "white", alignSelf: "center", marginTop: 1 }} />
              </View>
            </View>
          ),
        }} />
        <Tabs.Screen name="rfis" options={{
          title: "RFIs",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 16, height: 20, borderRadius: 3, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }}>
                <View style={{ width: 8, height: 1.5, backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)", marginTop: 3, marginLeft: 2 }} />
                <View style={{ width: 6, height: 1.5, backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)", marginTop: 2, marginLeft: 2 }} />
              </View>
            </View>
          ),
        }} />
        <Tabs.Screen name="daily-log" options={{
          title: "Daily Log",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 18, height: 18, borderRadius: 3, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }}>
                <View style={{ width: 10, height: 1.5, backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)", marginTop: 3, marginLeft: 2 }} />
                <View style={{ width: 7, height: 1.5, backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)", marginTop: 2, marginLeft: 2 }} />
              </View>
            </View>
          ),
        }} />
        <Tabs.Screen name="profile" options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)" }} />
              <View style={{ width: 16, height: 6, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 2, borderBottomWidth: 0, borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)", marginTop: 1 }} />
            </View>
          ),
        }} />
      </Tabs>
    </View>
  )
}
