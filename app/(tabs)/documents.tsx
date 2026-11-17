import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, RefreshControl } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter, useFocusEffect } from "expo-router"
import { API_URL } from "@/lib/api"
import * as DocumentPicker from "expo-document-picker"
import { openDocument as openInBluebeam } from "@/lib/openDocument"
import { Screen, ScreenHeader, CircleButton, Card, EmptyState } from "@/components/ui"
import { colors, type, humanize } from "@/lib/theme"
import { loadCached } from "@/lib/cache"


export default function DocumentsScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Refresh whenever this tab comes back into view. The saved copy shows instantly in the meantime.
  useFocusEffect(useCallback(() => {
    if (token) loadDocuments()
  }, [token]))

  async function loadDocuments() {
    try {
      await loadCached("/api/mobile/documents", token, data => {
        setDocuments(data.documents || [])
        setLoading(false)
      })
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
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>

  return (
    <Screen
      tabBar
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocuments() }} tintColor={colors.accent} />}
    >
      <ScreenHeader
        title="Documents"
        subtitle={uploading ? "Uploading…" : `${documents.length} file${documents.length !== 1 ? "s" : ""}`}
        actions={<CircleButton icon="add" label="Upload a document" onPress={uploadDocument} disabled={uploading} />}
      />

      {documents.length === 0 ? (
        <EmptyState icon="folder-open-outline" title="No documents yet" subtitle="Tap + to upload contracts, plans, permits and more." />
      ) : (
        <Card>
          {documents.map((doc, index) => (
            <Pressable
              key={doc.id}
              onPress={() => router.push(`/document/${doc.id}` as any)}
              accessibilityRole="button"
              accessibilityLabel={`${doc.name}, ${getFileIcon(doc.mimeType)}`}
              style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && { backgroundColor: colors.fillSubtle }]}
            >
              <View style={[styles.fileIconBox, { backgroundColor: getFileColor(doc.mimeType) + "1A" }]}>
                <Text style={[styles.fileIconText, { color: getFileColor(doc.mimeType) }]}>{getFileIcon(doc.mimeType)}</Text>
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={type.headline} numberOfLines={1}>{doc.name}</Text>
                <Text style={type.footnote} numberOfLines={1}>
                  {[
                    humanize(doc.category),
                    formatSize(doc.fileSize),
                    doc.project?.name,
                    new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                  ].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  row: { minHeight: 64, paddingVertical: 10, paddingLeft: 14, paddingRight: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  fileIconBox: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  fileIconText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
})
