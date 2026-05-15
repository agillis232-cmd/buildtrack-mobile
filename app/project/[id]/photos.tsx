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
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: result.assets[0].base64 })
      })
      const data = await res.json()
      if (data.photo) {
        setPhotos(prev => [data.photo, ...prev])
      } else {
        Alert.alert("Error", "Could not upload photo")
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
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Photos</Text>
          {photos.length > 0 && (
            <Text style={styles.photoCount}>{photos.length} photo{photos.length !== 1 ? "s" : ""}</Text>
          )}
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptySub}>Take or upload job site photos</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map(photo => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoWrapper}
                onPress={() => router.push(`/project/${id}/photo-viewer?photoId=${photo.id}&url=${encodeURIComponent(photo.url)}&caption=${encodeURIComponent(photo.caption || "")}` as any)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: photo.url.replace('/upload/', '/upload/f_jpg/') }}
                  style={styles.photo}
                />
                {photo.caption ? (
                  <View style={styles.captionOverlay}>
                    <Text style={styles.captionText} numberOfLines={1}>{photo.caption}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
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
  content: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 20, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  photoCount: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "600" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 3, paddingHorizontal: 16 },
  photoWrapper: { width: "48%", borderRadius: 12, overflow: "hidden", position: "relative" },
  photo: { width: "100%", height: 160, backgroundColor: "#E8E6E1" },
  captionOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", padding: 8 },
  captionText: { fontSize: 11, color: "white", fontWeight: "500" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})