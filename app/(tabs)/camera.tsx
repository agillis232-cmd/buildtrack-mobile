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

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    })

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
          "Receipt Scanned!",
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

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    })

    if (!result.canceled) {
      Alert.alert("Photo taken!", "Go to a project to upload photos to a specific job site.")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Quick Actions</Text>
      <Text style={styles.subtitle}>Capture receipts or photos from anywhere</Text>

      <TouchableOpacity style={styles.card} onPress={scanReceipt} disabled={scanning}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🧾</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Scan Receipt</Text>
          <Text style={styles.cardSub}>AI-powered receipt scanning</Text>
        </View>
        {scanning ? <ActivityIndicator color="#F97316" /> : <Text style={styles.arrow}>→</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={takePhoto}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>📸</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Take Photo</Text>
          <Text style={styles.cardSub}>Then attach to a project</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)")}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>📋</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Add Daily Log</Text>
          <Text style={styles.cardSub}>Go to a project to log today</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0", padding: 20, paddingTop: 70 },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#9CA3AF", marginBottom: 32 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 18, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", gap: 14 },
  iconBox: { width: 48, height: 48, backgroundColor: "#FFF7ED", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  cardSub: { fontSize: 12, color: "#9CA3AF" },
  arrow: { fontSize: 18, color: "#D1D5DB" },
})