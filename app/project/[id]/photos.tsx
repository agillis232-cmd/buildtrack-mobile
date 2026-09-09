@'
import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Dimensions } from "react-native"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"

const SCREEN_WIDTH = Dimensions.get("window").width
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3

interface UploadJob {
  uri: string
  base64: string
  status: "pending" | "uploading" | "done" | "error"
  retries: number
}

async function uploadWithRetry(
  url: string,
  base64: string,
  token: string,
  maxRetries = 2,
  timeoutMs = 20000
): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64 }),
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      return await res.json()
    } catch (e: any) {
      const isLast = attempt === maxRetries
      if (isLast) throw e
      // Wait 2s before retry
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}

export default function PhotosScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (token && id) loadPhotos()
  }, [token, id])

  async function loadPhotos() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/photos`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (e) {
      console.log("Error loading photos:", e)
    }
    setLoading(false)
  }

  const processQueue = useCallback(async (jobs: UploadJob[]) => {
    if (jobs.length === 0) return
    setIsUploading(true)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < jobs.length; i++) {
      // Update status to uploading
      setUploadQueue(prev =>
        prev.map((j, idx) => idx === i ? { ...j, status: "uploading" as const } : j)
      )

      try {
        const data = await uploadWithRetry(
          `${API_URL}/api/mobile/projects/${id}/photos`,
          jobs[i].base64,
          token!
        )
        if (data.photo) {
          setPhotos(prev => [data.photo, ...prev])
          successCount++
        } else {
          failCount++
        }
        setUploadQueue(prev =>
          prev.map((j, idx) => idx === i ? { ...j, status: data.photo ? "done" as const : "error" as const } : j)
        )
      } catch (e) {
        console.log("Upload failed:", e)
        failCount++
        setUploadQueue(prev =>
          prev.map((j, idx) => idx === i ? { ...j, status: "error" as const } : j)
        )
      }
    }

    setIsUploading(false)

    // Show summary
    if (failCount === 0) {
      Alert.alert("Done", `${successCount} photo${successCount > 1 ? "s" : ""} uploaded`)
    } else {
      Alert.alert(
        "Upload Complete",
        `${successCount} uploaded, ${failCount} failed.\nFailed photos can be retried.`,
        [
          { text: "Retry Failed", onPress: retryFailed },
          { text: "Dismiss", onPress: () => setUploadQueue([]) },
        ]
      )
    }

    // Clear successful after a moment
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(j => j.status === "error"))
    }, 1500)
  }, [id, token])

  function retryFailed() {
    const failed = uploadQueue.filter(j => j.status === "error").map(j => ({
      ...j,
      status: "pending" as const,
      retries: j.retries + 1,
    }))
    setUploadQueue(failed)
    processQueue(failed)
  }

  async function pickPhotos(fromCamera: boolean) {
    if (isUploading) return

    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow camera access in Settings")
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.6,
        maxWidth: 1920,
        maxHeight: 1920,
      })
      if (result.canceled || !result.assets?.length) return

      const jobs: UploadJob[] = result.assets.map(a => ({
        uri: a.uri,
        base64: a.base64!,
        status: "pending" as const,
        retries: 0,
      }))
      setUploadQueue(jobs)
      processQueue(jobs)
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo library access in Settings")
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.6,
        maxWidth: 1920,
        maxHeight: 1920,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      })
      if (result.canceled || !result.assets?.length) return

      const jobs: UploadJob[] = result.assets.map(a => ({
        uri: a.uri,
        base64: a.base64!,
        status: "pending" as const,
        retries: 0,
      }))
      setUploadQueue(jobs)
      processQueue(jobs)
    }
  }

  function pickSource() {
    Alert.alert("Upload Photos", "Choose source", [
      { text: "Camera", onPress: () => pickPhotos(true) },
      { text: "Photo Library (multi-select)", onPress: () => pickPhotos(false) },
      { text: "Cancel", style: "cancel" },
    ])
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F97316" />
      </View>
    )

  return (
    <View style={styles.container}>
      {/* Upload progress bar */}
      {uploadQueue.length > 0 && (
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {isUploading
              ? `Uploading ${uploadQueue.filter(j => j.status === "done").length + 1} of ${uploadQueue.length}...`
              : `${uploadQueue.filter(j => j.status === "done").length} of ${uploadQueue.length} uploaded`}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(uploadQueue.filter(j => j.status === "done" || j.status === "error").length / uploadQueue.length) * 100}%`,
                  backgroundColor: uploadQueue.some(j => j.status === "error") ? "#EF4444" : "#16A34A",
                },
              ]}
            />
          </View>
          {/* Thumbnail strip */}
          <ScrollView horizontal style={styles.thumbStrip} showsHorizontalScrollIndicator={false}>
            {uploadQueue.map((job, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: job.uri }} style={styles.thumbImg} />
                {job.status === "uploading" && (
                  <View style={styles.thumbOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {job.status === "done" && (
                  <View style={[styles.thumbOverlay, { backgroundColor: "rgba(22,163,74,0.5)" }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </View>
                )}
                {job.status === "error" && (
                  <View style={[styles.thumbOverlay, { backgroundColor: "rgba(239,68,68,0.5)" }]}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="camera-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubText}>Tap the button below to add photos</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo: any) => (
              <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Upload button */}
      <TouchableOpacity
        style={[styles.fab, isUploading && styles.fabDisabled]}
        onPress={pickSource}
        disabled={isUploading}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F4F0" },
  content: { padding: 16, paddingBottom: 80 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8, backgroundColor: "#E2E8F0" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabDisabled: { opacity: 0.5 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#1C1F26" },
  emptySubText: { fontSize: 14, color: "#64748B" },
  progressBar: { backgroundColor: "#1C1F26", padding: 12, paddingTop: 8 },
  progressText: { color: "#fff", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  progressTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  thumbStrip: { marginTop: 8 },
  thumbWrap: { width: 44, height: 44, borderRadius: 6, marginRight: 6, overflow: "hidden" },
  thumbImg: { width: 44, height: 44 },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
})
'@ | Set-Content -LiteralPath "C:\Users\agill\buildtrack-mobile\app\project\[id]\photos.tsx"