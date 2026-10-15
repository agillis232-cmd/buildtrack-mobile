import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useAuth } from "@/lib/auth"

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://buildtrackpro.app"

export default function SubCameraScreen() {
  const { token } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/sub/projects`, { headers: { "Authorization": `Bearer ${token}` } })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function takePhoto(projectId: string) {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert("Permission needed"); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, maxWidth: 1920, maxHeight: 1920 })
    if (result.canceled || !result.assets?.length) return

    setUploading(true)
    try {
      const signRes = await fetch(`${API_URL}/api/mobile/cloudinary-sign`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "buildtrack/photos" }),
      })
      const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json()

      const fd = new FormData()
      fd.append("file", { uri: result.assets[0].uri, type: "image/jpeg", name: "photo.jpg" } as any)
      fd.append("signature", signature)
      fd.append("timestamp", String(timestamp))
      fd.append("api_key", apiKey)
      fd.append("folder", folder)

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd })
      const cloudData = await upRes.json()

      await fetch(`${API_URL}/api/sub/photos`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, url: cloudData.secure_url, publicId: cloudData.public_id }),
      })

      Alert.alert("Uploaded!", "Photo added to project")
    } catch (e) { Alert.alert("Error", "Could not upload photo") }
    setUploading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <Text style={styles.title}>Site Photos</Text>
        <Text style={styles.subtitle}>Take and upload project photos</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {uploading && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14, backgroundColor: "#FFF7ED", borderRadius: 10, marginBottom: 12 }}>
            <ActivityIndicator color="#F97316" />
            <Text style={{ fontSize: 13, color: "#D97706", fontWeight: "600" }}>Uploading photo...</Text>
          </View>
        )}
        {loading ? (
          <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 40 }}>Loading...</Text>
        ) : projects.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 }}>No projects assigned</Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF" }}>Photos will appear when you are assigned to a project</Text>
          </View>
        ) : (
          projects.map((p: any) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => takePhoto(p.projectId)}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  {p.orgName && <Text style={{ fontSize: 10, fontWeight: "700", color: "#F97316", textTransform: "uppercase", marginBottom: 2 }}>{p.orgName}</Text>}
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A1A" }}>{p.projectName}</Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{p.trade}</Text>
                </View>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#F97316", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "white", fontSize: 20 }}>+</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  card: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
})
