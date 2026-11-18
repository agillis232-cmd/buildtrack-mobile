import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { AuthProvider, useAuth } from "@/lib/auth"
import { useEffect } from "react"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { Platform } from "react-native"

// Debug logging is for development. In the App Store build it only slows the app down.
if (!__DEV__) {
  console.log = () => {}
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
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

// Screens anyone can see without being signed in.
const PUBLIC_SCREENS = ["login", "signup"]

// Whenever the sign-in goes away (sign out, account deleted, expired session),
// send the person back to the login screen from wherever they are.
function SessionGate() {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const navigationReady = !!useRootNavigationState()?.key

  useEffect(() => {
    if (loading || !navigationReady) return
    const first = segments[0] as string | undefined
    const onPublicScreen = !first || PUBLIC_SCREENS.includes(first)
    if (!user && !onPublicScreen) router.replace("/login")
  }, [user, loading, segments, navigationReady])

  return null
}

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications()
  }, [])

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <SessionGate />
      <Stack screenOptions={{ headerShown: false }}>
        {/* The photo viewer fades in over the grid, which shows through as you pull a photo down to close it. */}
        <Stack.Screen
          name="project/[id]/photo-viewer"
          options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }}
        />
      </Stack>
    </AuthProvider>
  )
}
