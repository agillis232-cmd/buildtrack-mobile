import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { useState } from "react"

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive", onPress: async () => {
          setSigningOut(true)
          await signOut()
          router.replace("/login")
        }
      }
    ])
  }

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?"

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Profile</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || "ADMIN"}</Text>
        </View>
      </View>

      {/* Info cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.card}>
          <Row label="Full Name" value={user?.name || "-"} />
          <Row label="Email" value={user?.email || "-"} />
          <Row label="Role" value={user?.role || "ADMIN"} />
        </View>
      </View>

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <Row label="Version" value="1.0.0" />
          <Row label="Build" value="BuildTrack Pro" />
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
        {signingOut
          ? <ActivityIndicator color="white" />
          : <Text style={styles.signOutText}>Sign Out</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

function Row({ label, value }: { label: string, value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 60, paddingTop: 60 },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "#1A1A1A", marginBottom: 24 },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F97316", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: "700", color: "white" },
  name: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  email: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  roleBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  roleText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E8E6E1" },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", maxWidth: "60%", textAlign: "right" },
  signOutBtn: { backgroundColor: "#DC2626", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  signOutText: { color: "white", fontSize: 16, fontWeight: "700" },
})