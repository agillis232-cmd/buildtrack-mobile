import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { useState } from "react"
import * as ImagePicker from "expo-image-picker"
import { API_URL } from "@/lib/api"

export default function ProfileScreen() {
  const { user, signOut, token } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null)

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

  async function changeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true, quality: 0.8, allowsEditing: true, aspect: [1, 1],
    })
    if (result.canceled) return

    setUploadingAvatar(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/profile/avatar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: result.assets[0].base64 })
      })
      const data = await res.json()
      if (data.avatarUrl) setAvatarUrl(data.avatarUrl)
      else Alert.alert("Error", "Could not update avatar")
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setUploadingAvatar(false)
  }

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?"
console.log("User role:", user?.role)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={changeAvatar} disabled={uploadingAvatar} style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={styles.avatarEditText}>Edit</Text>
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || "ADMIN"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Row label="Full Name" value={user?.name || "-"} />
          <Row label="Email" value={user?.email || "-"} />
          <Row label="Role" value={user?.role || "ADMIN"} last />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <Row label="Version" value="1.0.0" />
          <Row label="Platform" value="BuildTrack Pro" last />
        </View>
      </View>
{user?.role === "ADMIN" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin</Text>
          <View style={styles.card}>
             <TouchableOpacity style={styles.adminRow} onPress={() => router.push("/team" as any)}>
              <Text style={styles.adminRowLabel}>Team Management</Text>
              <Text style={styles.adminRowArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut}>
        {signingOut
          ? <ActivityIndicator color="white" />
          : <Text style={styles.signOutText}>Sign Out</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

function Row({ label, value, last }: { label: string, value: string, last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 30, marginBottom: 24, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 16 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "white", marginBottom: 20, letterSpacing: -0.5 },
  avatarSection: { alignItems: "center" },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatarImage: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: "rgba(255,255,255,0.2)" },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#F97316", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.2)" },
  avatarText: { fontSize: 30, fontWeight: "700", color: "white" },
  avatarEditBadge: { position: "absolute", bottom: 0, right: -4, backgroundColor: "#1C1F26", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: "#F5F4F0" },
  avatarEditText: { fontSize: 10, color: "#F97316", fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700", color: "white", marginBottom: 4 },
  email: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 10 },
  roleBadge: { backgroundColor: "rgba(249,115,22,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: "rgba(249,115,22,0.3)" },
  roleText: { fontSize: 11, fontWeight: "700", color: "#F97316" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", maxWidth: "60%", textAlign: "right" },
 signOutBtn: { backgroundColor: "#DC2626", borderRadius: 14, padding: 16, alignItems: "center", marginHorizontal: 16 },
  adminRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  adminRowLabel: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  adminRowArrow: { fontSize: 20, color: "#D1D5DB" },
})