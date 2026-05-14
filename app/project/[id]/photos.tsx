import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"

export default function PhotosScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (token && id) loadPhotos()
  }, [token, id])

  async function loadPhotos() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/photos`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      console.log("Photos data:", JSON.stringify(data))
      setPhotos(data.photos || [])
    } catch (e) {
      console.log("Error loading photos:", e)
    }
    setLoading(false)
  }

  async function uploadPhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to continue")
      return
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 })

    if (result.canceled) return

    setUploading(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/photos`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: result.assets[0].base64 })
      })
      const data = await res.json()
      if (data.photo) {
        setPhotos(prev => [data.photo, ...prev])
      } else {
        Alert.alert("Error", "Could not upload photo")
        const data = await res.json()
console.log("Photos data:", JSON.stringify(data))
setPhotos(data.photos || [])
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setUploading(false)
  }

  function pickSource() {
    Alert.alert("Upload Photo", "Choose source", [
      { text: "Camera", onPress: () => uploadPhoto(true) },
      { text: "Photo Library", onPress: () => uploadPhoto(false) },
      { text: "Cancel", style: "cancel" }
    ])
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Photos</Text>

        {photos.length === 0 ? (
           <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Scan a receipt or add manually</Text>
          </View>
     ) : (
          <View style={styles.grid}>
           {photos.map(photo => (
  <Image 
    key={photo.id} 
    source={{ uri: photo.url.replace('/upload/', '/upload/f_jpg/') }} 
    style={styles.photo}
    onLoad={() => console.log("Image loaded:", photo.url)}
    onError={(e) => console.log("Image error:", photo.url, e.nativeEvent.error)}
  />
))}
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={pickSource} disabled={uploading}>
         {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.fabText}>Upload Photo</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 120, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 20 },
  backText: { color: "#F97316", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
 photo: { width: 160, height: 160, borderRadius: 10, backgroundColor: "#E8E6E1", margin: 4 },
  fab: { position: "absolute", bottom: 30, left: 20, right: 20 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})