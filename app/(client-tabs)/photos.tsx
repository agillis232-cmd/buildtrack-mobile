import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, RefreshControl, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"
import { cloudinaryThumb } from "@/lib/images"
import { colors } from "@/lib/theme"

export default function ClientPhotosScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [photos, setPhotos] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (token) loadPhotos()
  }, [token])

  async function loadPhotos() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/client/project`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setPhotos(data.project?.photos || [])
      setProjectId(data.project?.id || null)
    } catch (e) {
      console.log("Error loading photos:", e)
    }
    setLoading(false)
    setRefreshing(false)
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
      const res = await fetch(`${API_URL}/api/mobile/projects/${projectId}/photos`, {
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

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.tint} /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPhotos() }} tintColor={colors.tint} />}
      >
        <View style={styles.headerBanner}>
          <Text style={styles.title}>Site Photos</Text>
          <Text style={styles.subtitle}>{photos.length} photo{photos.length !== 1 ? "s" : ""}</Text>
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptySub}>Upload your first site photo</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map(photo => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoWrapper}
                onPress={() => router.push(`/project/${projectId}/photo-viewer?photoId=${photo.id}&url=${encodeURIComponent(photo.url)}&caption=${encodeURIComponent(photo.caption || "")}` as any)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: cloudinaryThumb(photo.url) }} style={styles.photo} />
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 190 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 3, paddingHorizontal: 16 },
  photoWrapper: { width: "48%", borderRadius: 12, overflow: "hidden", position: "relative" },
  photo: { width: "100%", height: 160, backgroundColor: "#E8E6E1" },
  captionOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", padding: 8 },
  captionText: { fontSize: 11, color: "white", fontWeight: "500" },
  // sits above the floating tab bar
  fab: { position: "absolute", bottom: 104, left: 16, right: 16 },
  fabBtn: { backgroundColor: colors.charcoal, borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})