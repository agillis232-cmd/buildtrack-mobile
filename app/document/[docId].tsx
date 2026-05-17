import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { openDocument as openInBluebeam } from "@/lib/openDocument"

const CATEGORIES = ["contract", "plans", "permit", "invoice", "photo", "report", "other"]

export default function DocumentViewerScreen() {
  const { docId } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [projectId, setProjectId] = useState("")
  const [sharedWithClient, setSharedWithClient] = useState(false)

  useEffect(() => {
    if (token && docId) {
      loadDocument()
      loadProjects()
    }
  }, [token, docId])

  async function loadDocument() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/documents/${docId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.document) {
        setDocument(data.document)
        setName(data.document.name)
        setDescription(data.document.description || "")
        setCategory(data.document.category || "other")
        setProjectId(data.document.projectId || "")
        setSharedWithClient(data.document.sharedWithClient || false)
      }
    } catch (e) {
      console.log("Error loading document:", e)
    }
    setLoading(false)
  }

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) {
      console.log("Error loading projects:", e)
    }
  }

  async function saveDocument() {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/documents/${docId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, projectId: projectId || null, sharedWithClient })
      })
      const data = await res.json()
      if (data.document) {
        setDocument(data.document)
        setEditing(false)
      } else {
        Alert.alert("Error", "Could not save document")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function deleteDocument() {
    Alert.alert("Delete Document", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true)
          try {
            const res = await fetch(`${API_URL}/api/mobile/documents/${docId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
              router.back()
            } else {
              Alert.alert("Error", "Could not delete document")
            }
          } catch (e) {
            Alert.alert("Error", "Connection error")
          }
          setDeleting(false)
        }
      }
    ])
  }

  function openDocument() {
    if (document?.fileUrl) {
      openInBluebeam(document.fileUrl, document.mimeType)
    }
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

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>
  if (!document) return <View style={styles.center}><Text style={styles.errorText}>Document not found</Text></View>

  const fileColor = getFileColor(document.mimeType)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Document</Text>
        </View>

        <View style={styles.fileCard}>
          <View style={[styles.fileIconBox, { backgroundColor: fileColor + "15" }]}>
            <Text style={[styles.fileIconText, { color: fileColor }]}>{getFileIcon(document.mimeType)}</Text>
          </View>
          <Text style={styles.fileName}>{document.name}</Text>
          <Text style={styles.fileMeta}>{formatSize(document.fileSize)} · {document.mimeType}</Text>
          {document.project && (
            <View style={styles.projectBadge}>
              <Text style={styles.projectBadgeText}>{document.project.name}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.openBtn} onPress={openDocument}>
            <Text style={styles.openBtnText}>Open Document</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Details</Text>
          <Row label="Category" value={document.category} />
          <Row label="Uploaded by" value={document.uploader?.name || "Unknown"} />
          <Row label="Date" value={new Date(document.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
          <Row label="Linked project" value={document.project?.name || "None"} />
          <Row label="Shared with client" value={document.sharedWithClient ? "Yes" : "No"} last />
        </View>

        {document.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText}>{document.description}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={deleteDocument} disabled={deleting}>
            {deleting ? <ActivityIndicator color="#DC2626" size="small" /> : <Text style={styles.deleteBtnText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={editing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Document</Text>
            <ScrollView>
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Document name" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Optional description..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryRow}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={[styles.categoryBtnText, category === cat && styles.categoryBtnTextActive]}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Link to Project</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryRow}>
                    <TouchableOpacity
                      style={[styles.categoryBtn, projectId === "" && styles.categoryBtnActive]}
                      onPress={() => setProjectId("")}
                    >
                      <Text style={[styles.categoryBtnText, projectId === "" && styles.categoryBtnTextActive]}>None</Text>
                    </TouchableOpacity>
                    {projects.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.categoryBtn, projectId === p.id && styles.categoryBtnActive]}
                        onPress={() => setProjectId(p.id)}
                      >
                        <Text style={[styles.categoryBtnText, projectId === p.id && styles.categoryBtnTextActive]}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Share with client</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, !sharedWithClient && styles.toggleBtnActive]}
                    onPress={() => setSharedWithClient(false)}
                  >
                    <Text style={[styles.toggleBtnText, !sharedWithClient && styles.toggleBtnTextActive]}>Private</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, sharedWithClient && styles.toggleBtnActiveGreen]}
                    onPress={() => setSharedWithClient(true)}
                  >
                    <Text style={[styles.toggleBtnText, sharedWithClient && styles.toggleBtnTextActive]}>Shared</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveDocument} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Row({ label, value, last }: { label: string, value: string, last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#6B7280" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 20, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5 },
  fileCard: { backgroundColor: "white", borderRadius: 16, padding: 24, marginHorizontal: 16, marginBottom: 12, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  fileIconBox: { width: 72, height: 72, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  fileIconText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  fileName: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", textAlign: "center", marginBottom: 6 },
  fileMeta: { fontSize: 12, color: "#9CA3AF", marginBottom: 10 },
  projectBadge: { backgroundColor: "#FFF7ED", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16, borderWidth: 1, borderColor: "#FED7AA" },
  projectBadgeText: { fontSize: 12, color: "#F97316", fontWeight: "600" },
  openBtn: { backgroundColor: "#F97316", borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, width: "100%" },
  openBtnText: { color: "white", fontWeight: "700", fontSize: 15, textAlign: "center" },
  detailsCard: { backgroundColor: "white", borderRadius: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden" },
  detailsTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, padding: 14, paddingBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", maxWidth: "55%", textAlign: "right", textTransform: "capitalize" },
  descCard: { backgroundColor: "white", borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: "#E8E6E1" },
  descLabel: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  descText: { fontSize: 14, color: "#374151", lineHeight: 21 },
  actionsRow: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 4 },
  editBtn: { flex: 1, backgroundColor: "#1C1F26", borderRadius: 12, padding: 14, alignItems: "center" },
  editBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  deleteBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#FECACA" },
  deleteBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  multiline: { height: 80, textAlignVertical: "top" },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  categoryBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  categoryBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  categoryBtnTextActive: { color: "white" },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1", alignItems: "center" },
  toggleBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  toggleBtnActiveGreen: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  toggleBtnText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  toggleBtnTextActive: { color: "white" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
})