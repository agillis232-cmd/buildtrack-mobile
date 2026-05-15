import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { useState } from "react"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"

export default function CameraScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [scanning, setScanning] = useState(false)

  async function scanReceipt() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera access is required to scan receipts")
      return
    }

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled) return

    setScanning(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/scan-receipt`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: result.assets[0].base64 })
      })
      const data = await res.json()
      if (data.expense) {
        Alert.alert(
          "Receipt Scanned",
          `Vendor: ${data.expense.vendor}\nAmount: $${data.expense.amount}\nDate: ${data.expense.date}`,
          [{ text: "OK" }]
        )
      } else {
        Alert.alert("Could not read receipt", "Try again with a clearer photo")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setScanning(false)
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera access is required")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled) {
      Alert.alert("Photo taken", "Go to a project to upload photos to a specific job site.")
    }
  }

  const actions = [
    {
      label: "Scan Receipt",
      sub: "AI-powered receipt scanning",
      color: "#8B5CF6",
      onPress: scanReceipt,
      loading: scanning,
    },
    {
      label: "Take Photo",
      sub: "Then attach to a project",
      color: "#3B82F6",
      onPress: takePhoto,
      loading: false,
    },
    {
      label: "Add Daily Log",
      sub: "Go to a project to log today",
      color: "#16A34A",
      onPress: () => router.push("/(tabs)"),
      loading: false,
    },
    {
      label: "New Change Order",
      sub: "Go to a project to create",
      color: "#F97316",
      onPress: () => router.push("/(tabs)"),
      loading: false,
    },
  ]

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <Text style={styles.pageTitle}>Quick Actions</Text>
        <Text style={styles.subtitle}>Capture and log from anywhere</Text>
      </View>

      <View style={styles.content}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.card}
            onPress={action.onPress}
            disabled={action.loading}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: action.color + "15" }]}>
              <View style={[styles.iconDot, { backgroundColor: action.color }]} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{action.label}</Text>
              <Text style={styles.cardSub}>{action.sub}</Text>
            </View>
            {action.loading
              ? <ActivityIndicator color="#F97316" />
              : <Text style={styles.arrow}>›</Text>
            }
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)" },
  content: { padding: 16, gap: 10 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", gap: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  iconDot: { width: 16, height: 16, borderRadius: 5 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  cardSub: { fontSize: 12, color: "#9CA3AF" },
  arrow: { fontSize: 20, color: "#D1D5DB", fontWeight: "300" },
})