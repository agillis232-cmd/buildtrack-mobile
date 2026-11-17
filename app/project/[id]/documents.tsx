import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Linking } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter, useLocalSearchParams } from "expo-router"
import { API_URL } from "@/lib/api"
import * as DocumentPicker from "expo-document-picker"
import { openDocument as openInBluebeam } from "@/lib/openDocument"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

export default function ProjectDocumentsScreen() {
  const { id } = useLocalSearchParams()
  const { token, user } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const isAdminOrPM = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"

  useEffect(() => {
    if (token && id) loadDocuments()
  }, [token, id])

  async function loadDocuments() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProject(data.project)
      setDocuments(data.project?.documents || [])
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
      formData.append("projectId", id as string)

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
    if (mimeType?.includes("word") || mimeType?.includes("doc")) return "DOC"
    if (mimeType?.includes("sheet") || mimeType?.includes("excel") || mimeType?.includes("csv")) return "XLS"
    return "FILE"
  }

  function getFileColor(mimeType: string) {
    if (mimeType?.includes("pdf")) return "#DC2626"
    if (mimeType?.includes("image")) return "#3B82F6"
    if (mimeType?.includes("word") || mimeType?.includes("doc")) return "#1D4ED8"
    if (mimeType?.includes("sheet") || mimeType?.includes("excel") || mimeType?.includes("csv")) return "#16A34A"
    return "#6B7280"
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.tint} /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocuments() }} tintColor={colors.tint} />}
      >
        <View style={styles.headerBanner}>
          <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>{project?.name} · {documents.length} file{documents.length !== 1 ? "s" : ""}</Text>
        </View>

        {documents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptySub}>Upload contracts, plans, permits and more</Text>
          </View>
        ) : (
          documents.map(doc => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => openInBluebeam(doc.fileUrl, doc.mimeType)}
              activeOpacity={0.8}
            >
              <View style={[styles.fileIconBox, { backgroundColor: getFileColor(doc.mimeType) + "15" }]}>
                <Text style={[styles.fileIconText, { color: getFileColor(doc.mimeType) }]}>
                  {getFileIcon(doc.mimeType)}
                </Text>
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                <Text style={styles.docMeta}>
                  {doc.category} · {formatSize(doc.fileSize)}
                </Text>
                <Text style={styles.docDate}>
                  {doc.uploader?.name} · {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Text>
                {doc.sharedWithClient && (
                  <View style={styles.sharedBadge}>
                    <Text style={styles.sharedBadgeText}>Shared with client</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.editDocBtn}
                onPress={() => router.push(`/document/${doc.id}` as any)}
              >
                <Text style={styles.editDocBtnText}>Edit</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {isAdminOrPM && (
        <View style={styles.fab}>
          <TouchableOpacity style={styles.fabBtn} onPress={uploadDocument} disabled={uploading}>
            {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.fabText}>Upload Document</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  backBtn: { marginBottom: 12 },
  backText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  docCard: { backgroundColor: "white", borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  fileIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  fileIconText: { fontSize: 11, fontWeight: "800" },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 3 },
  docMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 2, textTransform: "capitalize" },
  docDate: { fontSize: 11, color: colors.textSecondary },
  sharedBadge: { backgroundColor: "#DCFCE7", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start", marginTop: 4 },
  sharedBadgeText: { fontSize: 11, color: colors.success, fontWeight: "600" },
  editDocBtn: { backgroundColor: colors.fillSubtle, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editDocBtnText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: colors.charcoal, borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})