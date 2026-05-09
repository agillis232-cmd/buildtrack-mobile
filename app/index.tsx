import { useEffect } from "react"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"
import { View, ActivityIndicator } from "react-native"

export default function Index() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) router.replace("/(tabs)")
      else router.replace("/login")
    }
  }, [user, loading])

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1C1F26" }}>
      <ActivityIndicator color="#F97316" size="large" />
    </View>
  )
}