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
  status: "pending" | "uploading" | "done" | "error"
  retries: number
}

async function uploadToCloudinary(
  uri: string,
  projectId: string,
  token: string,
  apiUrl: string,
  maxRetries = 2
): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Step 1: Get Cloudinary signature from our server (tiny request)
      const signRes = await fetch(`${apiUrl}/api/mobile/cloudinary-sign`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ folder: `buildtrack/projects/${projectId}` }),
      })
      if (!signRes.ok) throw new Error("Failed to get upload signature")
      const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json()

      // Step 2: Upload directly to Cloudinary (no server body limit)
      const formData = new FormData()
      const filename = uri.split("/").pop() || "photo.jpg"
      formData.append("file", { uri, type: "image/jpeg", name: filename } as any)
      formData.append("signature", signature)
      formData.append("timestamp", String(timestamp))
      formData.append("api_key", apiKey)
      formData.append("folder", folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Cloudinary upload failed")
      const cloudData = await uploadRes.json()

      // Step 3: Save the record in our DB (tiny request — just the URL)
      const saveRes = await fetch(`${apiUrl}/api/mobile/projects/${projectId}/photos`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cloudinaryUrl: cloudData.secure_url, publicId: cloudData.public_id }),
      })
      if (!saveRes.ok) throw new Error("Failed to save photo record")
      return await saveRes.json()
    } catch (e: any) {
      if (attempt === maxRetries) throw e
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
      setUploadQueue(prev => prev.map((j, idx) => idx === i ? { ...j, status: "uploading" as const } : j))

      try {
        const data = await uploadToCloudinary(jobs[i].uri, id as string, token!, API_URL)
        if (data.photo) {
          setPhotos(prev => [data.photo, ...prev])
          successCount++
        } else { failCount++ }
        setUploadQueue(prev => prev.map((j, idx) => idx === i ? { ...j, status: data.photo ? "done" as const : "error" as const } : j))
      } catch (e) {
        console.log("Upload failed:", e)
        failCount++
        setUploadQueue(prev => prev.map((j, idx) => idx === i ? { ...j, status: "error" as const } : j))
      }
    }

    setIsUploading(false)
    if (failCount === 0) {
      Alert.alert("Done", `${successCount} photo${successCount > 1 ? "s" : ""} uploaded`)
    } else {
      Alert.alert("Upload Complete", `${successCount} uploaded, ${failCount} failed.`, [
        { text: "Retry Failed", onPress: retryFailed },
        { text: "Dismiss", onPress: () => setUploadQueue([]) },
      ])
    }
    setTimeout(() => setUploadQueue(prev => prev.filter(j => j.status === "error")), 1500)
  }, [id, token])

  function retryFailed() {
    const failed = uploadQueue.filter(j => j.status === "error").map(j => ({ ...j, status: "pending" as const, retries: j.retries + 1 }))
    setUploadQueue(failed)
    processQueue(failed)
  }

  async function pickPhotos(fromCamera: boolean) {
    if (isUploading) return

    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) { Alert.alert("Permission needed", "Please allow camera access"); return }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.6, maxWidth: 1920, maxHeight: 1920 })
      if (result.canceled || !result.assets?.length) return
      const jobs: UploadJob[] = result.assets.map(a => ({ uri: a.uri, status: "pending" as const, retries: 0 }))
      setUploadQueue(jobs)
      processQueue(jobs)
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) { Alert.alert("Permission needed", "Please allow photo library access"); return }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, maxWidth: 1920, maxHeight: 1920, allowsMultipleSelection: true, selectionLimit: 10 })
      if (result.canceled || !result.assets?.length) return
      const jobs: UploadJob[] = result.assets.map(a => ({ uri: a.uri, status: "pending" as const, retries: 0 }))
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

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      {uploadQueue.length > 0 && (
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {isUploading
              ? `Uploading ${uploadQueue.filter(j => j.status === "done").length + 1} of ${uploadQueue.length}...`
              : `${uploadQueue.filter(j => j.status === "done").length} of ${uploadQueue.length} uploaded`}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${(uploadQueue.filter(j => j.status === "done" || j.status === "error").length / uploadQueue.length) * 100}%`,
              backgroundColor: uploadQueue.some(j => j.status === "error") ? "#EF4444" : "#16A34A",
            }]} />
          </View>
          <ScrollView horizontal style={styles.thumbStrip} showsHorizontalScrollIndicator={false}>
            {uploadQueue.map((job, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: job.uri }} style={styles.thumbImg} />
                {job.status === "uploading" && <View style={styles.thumbOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
                {job.status === "done" && <View style={[styles.thumbOverlay, { backgroundColor: "rgba(22,163,74,0.5)" }]}><Ionicons name="checkmark-circle" size={20} color="#fff" /></View>}
                {job.status === "error" && <View style={[styles.thumbOverlay, { backgroundColor: "rgba(239,68,68,0.5)" }]}><Ionicons name="close-circle" size={20} color="#fff" /></View>}
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

      <TouchableOpacity style={[styles.fab, isUploading && styles.fabDisabled]} onPress={pickSource} disabled={isUploading}>
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
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#F97316", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
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
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
})
