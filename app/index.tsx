import { Redirect } from "expo-router"
import { View, ActivityIndicator } from "react-native"
import { useAuth, homeRouteFor } from "@/lib/auth"

export default function Index() {
  const { user, loading } = useAuth()

  // Still reading the saved sign-in from the keychain.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1C1F26", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#F97316" />
      </View>
    )
  }

  return <Redirect href={user ? homeRouteFor(user.role) : "/login"} />
}
