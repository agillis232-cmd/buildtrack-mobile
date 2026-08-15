import { Tabs } from "expo-router"
import { View, Text, Image } from "react-native"
import OfflineBanner from "../../components/OfflineBanner"

export default function TabsLayout() {
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
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{
                width: 18, height: 18, borderRadius: 4,
                borderWidth: 2,
                borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
              }}>
                <View style={{
                  width: 6, height: 6, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  margin: 2
                }} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Schedule",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{
                width: 18, height: 16, borderRadius: 3,
                borderWidth: 2,
                borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
              }}>
                <View style={{
                  height: 2, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  margin: 2, marginTop: 3
                }} />
                <View style={{
                  height: 2, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  marginHorizontal: 2
                }} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Quick Add",
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
              <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 16, height: 12, borderRadius: 3, borderWidth: 2, borderColor: "white" }} />
                <View style={{ position: "absolute", top: 0, width: 6, height: 6, borderRadius: 3, borderWidth: 2, borderColor: "white" }} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ focused }) => (
            <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
              <View style={{
                width: 14, height: 18, borderRadius: 2,
                borderWidth: 2,
                borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
              }}>
                <View style={{
                  height: 2, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  margin: 2, marginTop: 3
                }} />
                <View style={{
                  height: 2, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  marginHorizontal: 2
                }} />
              </View>
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
              <View style={{
                width: 14, height: 18, borderRadius: 2,
                borderWidth: 2,
                borderColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
              }}>
                <View style={{
                  height: 2, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  margin: 2, marginTop: 3
                }} />
                <View style={{
                  height: 2, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  marginHorizontal: 2
                }} />
                <View style={{
                  height: 2, borderRadius: 1,
                  backgroundColor: focused ? "#F97316" : "rgba(255,255,255,0.35)",
                  marginHorizontal: 2, marginTop: 2
                }} />
              </View>
            </View>
          ),
        }}
      />
    </Tabs>
    </View>
  )
}