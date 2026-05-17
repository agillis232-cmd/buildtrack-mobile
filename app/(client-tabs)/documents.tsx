import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Linking, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import * as DocumentPicker from "expo-document-picker"

export default function ClientDocumentsScreen() {
  const { token } = useAuth()
  const [documents, setDocuments] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (token) loadDocuments()
  }, [token])

  async function loadDocuments() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/client/project`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setDocuments(data.project?.documents || [])
      setProjectId(data.project?.id || null)
    } catch (e) {
      console.log("Error loading documents:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  async function uploadDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      })
      if (result.canceled) return

      const file = result.assets[0]
      setUploading(true)

      const formData = new FormData()
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      } as any)
      formData.append("name", file.name)
      formData.append("category", "other")
      if (projectId) formData.append("projectId", projectId)

      const res = await fetch(`${API_URL}/api/mobile/documents`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (data.document) {
        setDocuments(prev => [data.document, ...prev])
      } else {
        Alert.alert("Error", "Could not upload document")
      }
    } catch (e) {
      Alert.alert("Error", "Could not upload document")
    }
    setUploading(false)
  }

  function getFileIcon(mimeType: string) {
    if (mimeType?.includes("pdf")) return "PDF"
    if (mimeType?.includes("image")) return "IMG"
    if (mimeType?.includes("word")) return "DOC"
    if (mimeType?.includes("sheet") || mimeType?.includes("excel")) return "XLS"
    return "FILE"
  }

  function getFileColor(mimeType: string) {
    if (mimeType?.includes("pdf")) return "#DC2626"
    if (mimeType?.includes("image")) return "#3B82F6"
    if (mimeType?.includes("word")) return "#1D4ED8"
    if (mimeType?.includes("sheet") || mimeType?.includes("excel")) return "#16A34A"
    return "#6B7280"
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocuments() }} tintColor="#F97316" />}
      >
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>{documents.length} file{documents.length !== 1 ? "s" : ""}</Text>
        </View>

        {documents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySub}>Upload contracts, permits or other files</Text>
          </View>
        ) : (
          documents.map(doc => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => Linking.openURL(doc.fileUrl)}
              activeOpacity={0.8}
            >
              <View style={[styles.fileIconBox, { backgroundColor: getFileColor(doc.mimeType) + "15" }]}>
                <Text style={[styles.fileIconText, { color: getFileColor(doc.mimeType) }]}>{getFileIcon(doc.mimeType)}</Text>
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                {doc.description ? <Text style={styles.docDesc} numberOfLines={1}>{doc.description}</Text> : null}
                <Text style={styles.docMeta}>{formatSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
              </View>
              <Text style={styles.openText}>Open</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={uploadDocument} disabled={uploading}>
          {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.fabText}>Upload Document</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  docCard: { backgroundColor: "white", borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E8E6E1" },
  fileIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  fileIconText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  docDesc: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  docMeta: { fontSize: 11, color: "#9CA3AF" },
  openText: { fontSize: 13, fontWeight: "700", color: "#F97316" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})