import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "@/lib/auth"
import { useEffect } from "react"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { Platform } from "react-native"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

async function registerForPushNotifications() {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== "granted") return null

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: "65041af5-d938-4922-96e8-734b54a9ed8e"
  })

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  return token.data
}

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) console.log("Push token:", token)
    })
  }, [])

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  )
}