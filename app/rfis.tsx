import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Linking } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import DatePicker from "@/components/DatePicker"
import * as DocumentPicker from "expo-document-picker"
import { parseDateOnly } from "@/lib/dates"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#3B82F6",
  ANSWERED: "#16A34A",
  CLOSED: "#6B7280",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#6B7280",
  MEDIUM: "#D97706",
  HIGH: "#DC2626",
  URGENT: "#7C3AED",
}

export default function RFIsScreen() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [rfis, setRfis] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [responding, setResponding] = useState(false)
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "ANSWERED" | "CLOSED">("OPEN")
  const [uploadingDoc, setUploadingDoc] = useState(false)

  // Add form
  const [projectId, setProjectId] = useState("")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [drawingRef, setDrawingRef] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [assignedTo, setAssignedTo] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [response, setResponse] = useState("")
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)

  useEffect(() => {
    if (token) {
      loadRFIs()
      loadProjects()
      loadTeam()
    }
  }, [token])

  async function loadRFIs() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/rfis`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setRfis(data.rfis || [])
    } catch (e) {
      console.log("Error loading RFIs:", e)
    }
    setLoading(false)
    setRefreshing(false)
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

  async function loadTeam() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setTeamMembers(data.users || [])
    } catch (e) {
      console.log("Error loading team:", e)
    }
  }

  async function createRFI() {
    if (!projectId || !subject || !description) {
      Alert.alert("Error", "Project, subject and description are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/rfis`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, subject, description, drawingRef, priority, assignedTo: assignedTo || null, dueDate: dueDate || null })
      })
      const data = await res.json()
      if (data.rfi) {
        setRfis(prev => [data.rfi, ...prev])
        resetForm()
        setShowAddModal(false)
      } else {
        Alert.alert("Error", "Could not create RFI")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }
  async function uploadDocument(rfiId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
        base64: true,
      })
      if (result.canceled) return

      const file = result.assets[0]
      setUploadingDoc(true)

      const res = await fetch(`${API_URL}/api/mobile/rfis/${rfiId}/documents`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          file: file.base64,
          mimeType: file.mimeType || "application/octet-stream"
        })
      })
      const data = await res.json()
      if (data.document) {
        setShowDetailModal((prev: any) => ({
          ...prev,
          documents: [...(prev.documents || []), data.document]
        }))
        Alert.alert("Uploaded!", `${file.name} attached to RFI`)
      }
    } catch (e) {
      Alert.alert("Error", "Could not upload document")
    }
    setUploadingDoc(false)
  }

  async function submitResponse() {
    if (!response.trim()) {
      Alert.alert("Error", "Please enter a response")
      return
    }
    setResponding(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/rfis/${showDetailModal.id}/respond`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: response })
      })
      const data = await res.json()
      if (data.response) {
        setShowDetailModal((prev: any) => ({
          ...prev,
          status: "ANSWERED",
          responses: [...(prev.responses || []), data.response]
        }))
        setRfis(prev => prev.map(r => r.id === showDetailModal.id ? { ...r, status: "ANSWERED" } : r))
        setResponse("")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setResponding(false)
  }

  async function closeRFI(rfiId: string) {
    try {
      const res = await fetch(`${API_URL}/api/mobile/rfis/${rfiId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" })
      })
      if (res.ok) {
        setRfis(prev => prev.map(r => r.id === rfiId ? { ...r, status: "CLOSED" } : r))
        setShowDetailModal((prev: any) => prev ? { ...prev, status: "CLOSED" } : null)
      }
    } catch (e) {
      Alert.alert("Error", "Could not close RFI")
    }
  }

  function resetForm() {
    setProjectId("")
    setSubject("")
    setDescription("")
    setDrawingRef("")
    setPriority("MEDIUM")
    setAssignedTo("")
    setDueDate("")
  }

  const filtered = rfis.filter(r => filter === "ALL" ? true : r.status === filter)
  const openCount = rfis.filter(r => r.status === "OPEN").length

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.tint} /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRFIs() }} tintColor={colors.tint} />}
      >
        <View style={styles.headerBanner}>
          <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text style={styles.title}>RFIs</Text>
          <Text style={styles.subtitle}>{openCount} open · {rfis.length} total</Text>
        </View>

        <View style={styles.filterRow}>
          {(["OPEN", "ANSWERED", "CLOSED", "ALL"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No {filter.toLowerCase()} RFIs</Text>
            <Text style={styles.emptySub}>Tap + New RFI to submit a request for information</Text>
          </View>
        ) : (
          filtered.map(rfi => (
            <TouchableOpacity
              key={rfi.id}
              style={styles.rfiCard}
              onPress={() => setShowDetailModal(rfi)}
              activeOpacity={0.8}
            >
              <View style={styles.rfiTop}>
                <View style={styles.rfiLeft}>
                  <Text style={styles.rfiNumber}>{rfi.rfiNumber}</Text>
                  <Text style={styles.rfiProject}>{rfi.project?.name}</Text>
                </View>
                <View style={styles.rfiRight}>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[rfi.status] + "20" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[rfi.status] }]}>{rfi.status}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[rfi.priority] + "20" }]}>
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[rfi.priority] }]}>{rfi.priority}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.rfiSubject}>{rfi.subject}</Text>
              {rfi.drawingRef && <Text style={styles.rfiDrawing}>Drawing: {rfi.drawingRef}</Text>}
              <View style={styles.rfiMeta}>
                <Text style={styles.rfiMetaText}>By {rfi.submittedBy?.name}</Text>
                {rfi.assignedToUser && <Text style={styles.rfiMetaText}>→ {rfi.assignedToUser?.name}</Text>}
                {rfi.dueDate && <Text style={[styles.rfiMetaText, new Date(rfi.dueDate) < new Date() && rfi.status === "OPEN" && { color: colors.danger }]}>Due {parseDateOnly(rfi.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>}
                <Text style={styles.rfiMetaText}>{rfi._count?.responses || 0} response{rfi._count?.responses !== 1 ? "s" : ""}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.fabText}>+ New RFI</Text>
        </TouchableOpacity>
      </View>

      {/* Add RFI Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New RFI</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>Project *</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setShowProjectPicker(true)}>
                  <Text style={[styles.selectBtnText, !projectId && { color: colors.textSecondary }]}>
                    {projectId ? projects.find(p => p.id === projectId)?.name || "Select..." : "Select project..."}
                  </Text>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Subject *</Text>
                <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Clarification needed on..." placeholderTextColor={colors.chevron} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description *</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]} value={description} onChangeText={setDescription} placeholder="Detailed description of the request..." placeholderTextColor={colors.chevron} multiline />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Drawing Reference</Text>
                <TextInput style={styles.input} value={drawingRef} onChangeText={setDrawingRef} placeholder="e.g. A2.1, S-101..." placeholderTextColor={colors.chevron} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityRow}>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.priorityBtn, priority === p && { backgroundColor: PRIORITY_COLORS[p] + "20", borderColor: PRIORITY_COLORS[p] }]}
                      onPress={() => setPriority(p)}
                    >
                      <Text style={[styles.priorityBtnText, priority === p && { color: PRIORITY_COLORS[p] }]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Assign To</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setShowAssigneePicker(true)}>
                  <Text style={[styles.selectBtnText, !assignedTo && { color: colors.textSecondary }]}>
                    {assignedTo ? teamMembers.find(m => m.id === assignedTo)?.name || "Select..." : "Select team member..."}
                  </Text>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              </View>

              <DatePicker label="Due Date" value={dueDate} onChange={setDueDate} placeholder="Select due date..." />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); resetForm() }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={createRFI} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Submit RFI</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RFI Detail Modal */}
      <Modal visible={!!showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailRfiNumber}>{showDetailModal?.rfiNumber}</Text>
                <Text style={styles.detailProject}>{showDetailModal?.project?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.detailSubject}>{showDetailModal?.subject}</Text>

              <View style={styles.detailMeta}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[showDetailModal?.status] + "20" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[showDetailModal?.status] }]}>{showDetailModal?.status}</Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[showDetailModal?.priority] + "20" }]}>
                  <Text style={[styles.priorityText, { color: PRIORITY_COLORS[showDetailModal?.priority] }]}>{showDetailModal?.priority}</Text>
                </View>
              </View>

              <Text style={styles.detailDescription}>{showDetailModal?.description}</Text>

              {showDetailModal?.drawingRef && (
                <View style={styles.drawingRef}>
                  <Text style={styles.drawingRefText}>📐 Drawing Reference: {showDetailModal.drawingRef}</Text>
                </View>
              )}

              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Submitted by</Text>
                <Text style={styles.detailInfoValue}>{showDetailModal?.submittedBy?.name} ({showDetailModal?.submittedBy?.role})</Text>
              </View>
              {showDetailModal?.assignedToUser && (
                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>Assigned to</Text>
                  <Text style={styles.detailInfoValue}>{showDetailModal?.assignedToUser?.name}</Text>
                </View>
              )}
              {showDetailModal?.dueDate && (
                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>Due date</Text>
                  <Text style={styles.detailInfoValue}>{parseDateOnly(showDetailModal.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</Text>
                </View>
              )}
              {/* Documents */}
              <View style={styles.docsSection}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={styles.responsesTitle}>Attachments</Text>
                  <TouchableOpacity
                    style={styles.attachBtn}
                    onPress={() => uploadDocument(showDetailModal.id)}
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? <ActivityIndicator size="small" color={colors.tint} /> : <Text style={styles.attachBtnText}>+ Attach</Text>}
                  </TouchableOpacity>
                </View>
                {showDetailModal?.documents?.length > 0 ? (
                  showDetailModal.documents.map((doc: any) => (
                    <TouchableOpacity
                      key={doc.id}
                      style={styles.docRow}
                      onPress={() => Linking.openURL(doc.url)}
                    >
                      <Text style={styles.docIcon}>📎</Text>
                      <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                      <Text style={styles.docOpen}>Open →</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDocsText}>No attachments yet</Text>
                )}
                <TouchableOpacity
                style={styles.pdfBtn}
                onPress={() => Linking.openURL(`https://buildtrackpro.app/rfis/${showDetailModal.id}`)}
              >
                <Text style={styles.pdfBtnText}>View / Print PDF</Text>
              </TouchableOpacity>
              </View>

              {/* Responses */}
              {showDetailModal?.responses?.length > 0 && (
                <View style={styles.responsesSection}>
                  <Text style={styles.responsesTitle}>Responses</Text>
                  {showDetailModal.responses.map((r: any) => (
                    <View key={r.id} style={styles.responseCard}>
                      <View style={styles.responseHeader}>
                        <Text style={styles.responseName}>{r.user?.name}</Text>
                        <Text style={styles.responseRole}>{r.user?.role?.replace("_", " ")}</Text>
                        <Text style={styles.responseTime}>{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
                      </View>
                      <Text style={styles.responseMessage}>{r.message}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Add response */}
              {showDetailModal?.status !== "CLOSED" && (
                <View style={styles.responseInput}>
                  <Text style={styles.label}>Add Response</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                    value={response}
                    onChangeText={setResponse}
                    placeholder="Type your response..."
                    placeholderTextColor={colors.chevron}
                    multiline
                  />
                  <View style={styles.modalBtns}>
                    {(user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER") && showDetailModal?.status === "ANSWERED" && (
                      <TouchableOpacity style={styles.closeRFIBtn} onPress={() => closeRFI(showDetailModal.id)}>
                        <Text style={styles.closeRFIBtnText}>Close RFI</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.saveBtn} onPress={submitResponse} disabled={responding}>
                      {responding ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Submit Response</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Project Picker */}
      <Modal visible={showProjectPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Project</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {projects.map(p => (
                <TouchableOpacity key={p.id} style={[styles.pickerOption, projectId === p.id && styles.pickerOptionActive]} onPress={() => { setProjectId(p.id); setShowProjectPicker(false) }}>
                  <Text style={[styles.pickerOptionText, projectId === p.id && { color: colors.tint, fontWeight: "700" }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProjectPicker(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assignee Picker */}
      <Modal visible={showAssigneePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign To</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity style={styles.pickerOption} onPress={() => { setAssignedTo(""); setShowAssigneePicker(false) }}>
                <Text style={styles.pickerOptionText}>Unassigned</Text>
              </TouchableOpacity>
              {teamMembers.map(m => (
                <TouchableOpacity key={m.id} style={[styles.pickerOption, assignedTo === m.id && styles.pickerOptionActive]} onPress={() => { setAssignedTo(m.id); setShowAssigneePicker(false) }}>
                  <Text style={[styles.pickerOptionText, assignedTo === m.id && { color: colors.tint, fontWeight: "700" }]}>{m.name} · {m.role.replace("_", " ")}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAssigneePicker(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 99, backgroundColor: "white", alignItems: "center" },
  filterBtnActive: { backgroundColor: colors.charcoal, borderColor: "#1C1F26" },
  filterText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  filterTextActive: { color: "white" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  rfiCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10 },
  rfiTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  rfiLeft: { flex: 1 },
  rfiNumber: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 2 },
  rfiProject: { fontSize: 12, color: colors.tint, fontWeight: "600" },
  rfiRight: { gap: 4, alignItems: "flex-end" },
  rfiSubject: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 },
  rfiDrawing: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  rfiMeta: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  rfiMetaText: { fontSize: 11, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  priorityText: { fontSize: 11, fontWeight: "700" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: colors.charcoal, borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: { backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text },
  selectBtn: { backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectBtnText: { fontSize: 15, color: colors.text },
  arrow: { fontSize: 18, color: colors.textSecondary },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.fillSubtle, alignItems: "center" },
  priorityBtnText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, backgroundColor: colors.fillSubtle, borderRadius: 12, padding: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 2, backgroundColor: colors.charcoal, borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  detailRfiNumber: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 2 },
  detailProject: { fontSize: 13, color: colors.tint, fontWeight: "600" },
  closeBtn: { fontSize: 18, color: colors.textSecondary, padding: 4 },
  detailSubject: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 10 },
  detailMeta: { flexDirection: "row", gap: 8, marginBottom: 12 },
  detailDescription: { fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 12 },
  drawingRef: { backgroundColor: "#EEF2FF", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#C7D2FE" },
  drawingRefText: { fontSize: 13, color: "#4F46E5", fontWeight: "600" },
  detailInfoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.separator },
  detailInfoLabel: { fontSize: 13, color: colors.textSecondary },
  detailInfoValue: { fontSize: 13, fontWeight: "600", color: colors.text },
  responsesSection: { marginTop: 16, marginBottom: 8 },
  responsesTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 10 },
  responseCard: { backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 12, marginBottom: 8 },
  responseHeader: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 6 },
  responseName: { fontSize: 13, fontWeight: "700", color: colors.text },
  responseRole: { fontSize: 11, color: colors.textSecondary, flex: 1 },
  responseTime: { fontSize: 11, color: colors.textSecondary },
  responseMessage: { fontSize: 14, color: colors.text, lineHeight: 20 },
  responseInput: { marginTop: 16 },
  closeRFIBtn: { flex: 1, backgroundColor: colors.fillSubtle, borderRadius: 12, padding: 14, alignItems: "center" },
  closeRFIBtnText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  pickerOption: { padding: 14, borderRadius: 10, backgroundColor: colors.fillSubtle, marginBottom: 8 },
  pickerOptionActive: { backgroundColor: colors.tintSoft, borderColor: "#F97316" },
  pickerOptionText: { fontSize: 14, color: colors.text, fontWeight: "500" },
  docsSection: { marginTop: 16, marginBottom: 8 },
  attachBtn: { backgroundColor: colors.tintSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#FED7AA" },
  attachBtnText: { fontSize: 12, fontWeight: "700", color: colors.tint },
  docRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: colors.fillSubtle, borderRadius: 8, marginBottom: 6 },
  docIcon: { fontSize: 16 },
  docName: { flex: 1, fontSize: 13, color: colors.text, fontWeight: "500" },
  docOpen: { fontSize: 12, color: colors.tint, fontWeight: "600" },
  noDocsText: { fontSize: 13, color: colors.textSecondary, fontStyle: "italic" },
  pdfBtn: { backgroundColor: colors.charcoal, borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 12 },
  pdfBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
})