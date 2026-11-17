import { View, Text, Linking, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { useState } from "react"
import * as ImagePicker from "expo-image-picker"
import { API_URL } from "@/lib/api"
import Constants from "expo-constants"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

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
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBanner}>
        <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
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
                ? <ActivityIndicator color={colors.text} size="small" />
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
          <Row label="Version" value={Constants.expoConfig?.version || "-"} />
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
            <TouchableOpacity style={styles.adminRow} onPress={() => router.push("/financials" as any)}>
              <Text style={styles.adminRowLabel}>Company Financials</Text>
              <Text style={styles.adminRowArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminRow} onPress={() => router.push("/organization" as any)}>
              <Text style={styles.adminRowLabel}>Company Profile</Text>
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

      {/* Delete Account */}
      <TouchableOpacity onPress={() => {
        Alert.alert("Delete Account", "This will permanently delete your account and all data. This cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/account/delete`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } })
              if (res.ok) { await signOut(); Alert.alert("Account Deleted", "Your account has been deleted.") }
              else Alert.alert("Error", "Could not delete account")
            } catch (e) { Alert.alert("Error", "Connection error") }
          }}
        ])
      }} style={{ marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FEE2E2", alignItems: "center" }}>
        <Text style={{ color: colors.danger, fontSize: 14, fontWeight: "600" }}>Delete Account</Text>
      </TouchableOpacity>

      {/* Legal */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 16, marginBottom: 32 }}>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 60 },
  headerBanner: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  backBtn: { marginBottom: 16 },
  backText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  pageTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, marginBottom: 20, letterSpacing: -0.6 },
  avatarSection: { alignItems: "center" },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatarImage: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.separator },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.charcoal, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: colors.separator },
  avatarText: { fontSize: 28, fontWeight: "700", color: "white" },
  avatarEditBadge: { position: "absolute", bottom: 0, right: -4, backgroundColor: colors.charcoal, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: colors.background },
  avatarEditText: { fontSize: 11, color: colors.accent, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  email: { fontSize: 15, color: colors.textSecondary, marginBottom: 10 },
  roleBadge: { backgroundColor: colors.tintSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  roleText: { fontSize: 13, fontWeight: "600", color: colors.tint },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 },
  card: { backgroundColor: "white", borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.separator },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowValue: { fontSize: 14, fontWeight: "600", color: colors.text, maxWidth: "60%", textAlign: "right" },
 signOutBtn: { backgroundColor: "#DC2626", borderRadius: 14, padding: 16, alignItems: "center", marginHorizontal: 16 },
 signOutText: { color: "white", fontSize: 16, fontWeight: "700" },
  adminRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  adminRowLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  adminRowArrow: { fontSize: 20, color: colors.chevron },
})
