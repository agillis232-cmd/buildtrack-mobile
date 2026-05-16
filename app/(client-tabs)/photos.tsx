import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, RefreshControl } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

export default function ClientPhotosScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
    } catch (e) {
      console.log("Error loading photos:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPhotos() }} tintColor="#F97316" />}
    >
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <Text style={styles.title}>Site Photos</Text>
        <Text style={styles.subtitle}>{photos.length} photo{photos.length !== 1 ? "s" : ""}</Text>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySub}>Your contractor will upload site photos here</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {photos.map(photo => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoWrapper}
              onPress={() => router.push(`/client-photo?url=${encodeURIComponent(photo.url)}&caption=${encodeURIComponent(photo.caption || "")}` as any)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: photo.url.replace('/upload/', '/upload/f_jpg/') }} style={styles.photo} />
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
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 3, paddingHorizontal: 16 },
  photoWrapper: { width: "48%", borderRadius: 12, overflow: "hidden", position: "relative" },
  photo: { width: "100%", height: 160, backgroundColor: "#E8E6E1" },
  captionOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", padding: 8 },
  captionText: { fontSize: 11, color: "white", fontWeight: "500" },
})