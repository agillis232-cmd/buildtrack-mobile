import { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, StyleSheet } from "react-native"
import { useAuth } from "@/lib/auth"

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
        <View style={styles.headerCircle} />
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>{user?.name || "Subcontractor"}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.card}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#F97316", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>{(user?.name || "S")[0]}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1A1A1A" }}>{user?.name}</Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF" }}>{user?.email}</Text>
            <View style={{ backgroundColor: "#FFF7ED", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginTop: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#F97316" }}>Subcontractor</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
          {signingOut ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }}>Sign Out</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDeleteAccount}
          style={{ marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FEE2E2", alignItems: "center" }}>
          <Text style={{ color: "#DC2626", fontSize: 14, fontWeight: "600" }}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 20 }}>
          <TouchableOpacity onPress={() => Linking.openURL("https://buildtrackpro.app/legal/privacy")}>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://buildtrackpro.app/legal/terms")}>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL("https://buildtrackpro.app/legal/eula")}>
            <Text style={{ color: "#9CA3AF", fontSize: 12 }}>EULA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  header: { backgroundColor: "#1C1F26", paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, overflow: "hidden" },
  headerCircle: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(249,115,22,0.08)" },
  title: { fontSize: 22, fontWeight: "800", color: "white", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  card: { backgroundColor: "white", borderRadius: 14, padding: 20, borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 12 },
  signOutBtn: { backgroundColor: "#DC2626", borderRadius: 14, padding: 16, alignItems: "center" },
})
