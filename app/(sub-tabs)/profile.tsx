import { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, StyleSheet } from "react-native"
import { useAuth } from "@/lib/auth"
import { colors } from "@/lib/theme"

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://buildtrackpro.app"

export default function SubProfileScreen() {
  const { user, signOut, token } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try { await signOut() } catch (e) { console.error(e) }
    setSigningOut(false)
  }

  function handleDeleteAccount() {
    Alert.alert("Delete Account", "This will permanently delete your account and all data. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const res = await fetch(`${API_URL}/api/account/delete`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } })
          if (res.ok) { await signOut(); Alert.alert("Deleted", "Your account has been deleted.") }
          else Alert.alert("Error", "Could not delete account")
        } catch (e) { Alert.alert("Error", "Connection error") }
      }}
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>{user?.name || "Subcontractor"}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>
        <View style={styles.card}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.charcoal, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>{(user?.name || "S")[0]}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>{user?.name}</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{user?.email}</Text>
            <View style={{ backgroundColor: colors.tintSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginTop: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.tint }}>Subcontractor</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
          {signingOut ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }}>Sign Out</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDeleteAccount}
          style={{ marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FEE2E2", alignItems: "center" }}>
          <Text style={{ color: colors.danger, fontSize: 14, fontWeight: "600" }}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 20 }}>
          <TouchableOpacity onPress={() => Linking.openURL("https://buildtrackpro.app/legal/privacy")}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://buildtrackpro.app/legal/terms")}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://buildtrackpro.app/legal/eula")}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>EULA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "800", color: colors.text, marginBottom: 4, letterSpacing: -0.6 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  card: { backgroundColor: "white", borderRadius: 14, padding: 20, marginBottom: 12 },
  signOutBtn: { backgroundColor: "#DC2626", borderRadius: 14, padding: 16, alignItems: "center" },
})
