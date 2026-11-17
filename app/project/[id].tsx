import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, Pressable, TouchableOpacity, ActivityIndicator, Modal, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"
import { Screen, ScreenHeader, CircleButton, Card, Chip, ProgressBar, StatStrip, ListGroup, ListRow } from "@/components/ui"
import { colors, type, humanize } from "@/lib/theme"
import { showMenu } from "@/lib/menu"
import { loadCached } from "@/lib/cache"

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const { token, user } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [newCompletion, setNewCompletion] = useState("")
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (token && id) loadProject()
  }, [token, id])

  async function loadProject() {
    try {
      await loadCached(`/api/mobile/projects/${id}`, token, data => {
        setProject(data.project)
        setLoading(false)
      })
    } catch (e) {
      console.log("Error loading project:", e)
    }
    setLoading(false)
  }

  async function updateProject() {
    setUpdating(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/update`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus || undefined,
          completionPct: newCompletion || undefined,
        })
      })
      const data = await res.json()
      if (data.project) {
        setProject(data.project)
        setShowUpdateModal(false)
      } else {
        Alert.alert("Error", "Could not update project")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setUpdating(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
  if (!project) return <View style={styles.center}><Text style={styles.errorText}>Project not found</Text></View>

  const isAdmin = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"
async function deleteProject() {
    Alert.alert("Delete Project", "Are you sure? This will permanently delete this project and all its data.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/mobile/projects/${id}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
              router.replace("/(tabs)")
            } else {
              Alert.alert("Error", data.error || "Could not delete project")
            }
          } catch (e) {
            Alert.alert("Error", "Connection error")
          }
        }
      }
    ])
  }

  const sections = [
    { label: "Expenses", sub: "Scan receipts & track costs", route: `/project/${id}/expenses`, icon: "receipt-outline" },
    { label: "Photos", sub: "Upload job site photos", route: `/project/${id}/photos`, icon: "camera-outline" },
    { label: "Daily logs", sub: "View & add daily reports", route: `/project/${id}/logs`, icon: "document-text-outline" },
    { label: "Documents", sub: "Contracts, plans & permits", route: `/project/${id}/documents`, icon: "folder-outline" },
    { label: "Spec book", sub: "Materials, finishes & fixtures", route: `/project/${id}/spec-book`, icon: "book-outline" },
    ...(isAdmin ? [{ label: "Job financials", sub: "Revenue, expenses & profit", route: `/project-financials/${id}`, icon: "stats-chart-outline" }] : []),
    { label: "Messages", sub: "Notes & communication", route: `/project/${id}/messages`, icon: "chatbubble-outline" },
  ]

  const statusColor = project.status === "ACTIVE" ? "#16A34A" : project.status === "PRE_CONSTRUCTION" ? "#D97706" : project.status === "ON_HOLD" ? "#DC2626" : "#6B7280"
  const statusLabel = project.status === "ACTIVE" ? "Active" : project.status === "PRE_CONSTRUCTION" ? "Pre-construction" : project.status === "ON_HOLD" ? "On hold" : project.status === "COMPLETED" ? "Completed" : project.status

  const statusTone = project.status === "ACTIVE" ? "success" : project.status === "ON_HOLD" ? "danger" : project.status === "PRE_CONSTRUCTION" ? "warning" : "neutral"
  const stats = [
    ...(isAdmin ? [{ label: "Contract", value: `$${(project.contractValue / 1000).toFixed(0)}k` }] : []),
    { label: "Daily logs", value: String(project._count?.dailyLogs || 0) },
    { label: "Change orders", value: String(project._count?.changeOrders || 0) },
  ]

  function openUpdate() {
    setNewStatus(project.status)
    setNewCompletion(project.completionPct.toString())
    setShowUpdateModal(true)
  }

  return (
    <Screen>
      <ScreenHeader
        title={project.name}
        subtitle={[project.address, project.city, project.state].filter(Boolean).join(", ")}
        onBack={() => router.back()}
        actions={
          <>
            <CircleButton
              icon="sparkles-outline"
              label="Ask the assistant about this project"
              color={colors.tint}
              onPress={() => router.push({ pathname: "/assistant", params: { projectId: project.id, projectName: project.name } })}
            />
            {isAdmin && (
              <CircleButton
                icon="ellipsis-horizontal"
                label="More: delete project"
                onPress={() => showMenu(project.name, [{ label: "Delete project", onPress: deleteProject, destructive: true }])}
              />
            )}
          </>
        }
      >
        <View style={styles.chips}>
          <Chip label={statusLabel} tone={statusTone} />
          {!!project.projectType && <Chip label={humanize(project.projectType)} />}
        </View>
      </ScreenHeader>

      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={type.subhead}>Completion</Text>
          <Text style={type.title2}>{project.completionPct}%</Text>
        </View>
        <ProgressBar percent={project.completionPct} height={8} />
        {isAdmin ? (
          <Pressable onPress={openUpdate} accessibilityRole="button" style={({ pressed }) => [styles.updateLink, pressed && { opacity: 0.55 }]}>
            <Text style={styles.updateLinkText}>Update status and completion</Text>
          </Pressable>
        ) : (
          <View style={{ height: 8 }} />
        )}
      </Card>

      <StatStrip stats={stats} />

      <ListGroup>
        {sections.map(section => (
          <ListRow
            key={section.route}
            icon={section.icon as any}
            title={section.label}
            onPress={() => router.push(section.route as any)}
          />
        ))}
      </ListGroup>

      <Modal visible={showUpdateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update project</Text>

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusRow}>
              {["PRE_CONSTRUCTION", "ACTIVE", "ON_HOLD", "COMPLETED"].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, newStatus === s && styles.statusBtnActive]}
                  onPress={() => setNewStatus(s)}
                >
                  <Text style={[styles.statusBtnText, newStatus === s && styles.statusBtnTextActive]}>
                    {humanize(s)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Completion</Text>
            <View style={styles.completionRow}>
              {[0, 10, 25, 50, 75, 90, 100].map(pct => (
                <TouchableOpacity
                  key={pct}
                  style={[styles.pctBtn, newCompletion === pct.toString() && styles.pctBtnActive]}
                  onPress={() => setNewCompletion(pct.toString())}
                >
                  <Text style={[styles.pctBtnText, newCompletion === pct.toString() && styles.pctBtnTextActive]}>
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUpdateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={updateProject} disabled={updating}>
                {updating ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  errorText: { fontSize: 17, color: colors.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 4 },
  progressCard: { paddingTop: 14, paddingHorizontal: 16, gap: 10 },
  progressHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  updateLink: { minHeight: 44, justifyContent: "center" },
  updateLinkText: { fontSize: 15, fontWeight: "600", color: colors.tint },

  // "Update project" sheet
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 20 },
  modalLabel: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 10 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  statusBtn: { paddingHorizontal: 14, height: 36, justifyContent: "center", borderRadius: 18, backgroundColor: colors.fillSubtle },
  statusBtnActive: { backgroundColor: colors.charcoal },
  statusBtnText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  statusBtnTextActive: { color: colors.white },
  completionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  pctBtn: { paddingHorizontal: 14, height: 36, justifyContent: "center", borderRadius: 18, backgroundColor: colors.fillSubtle },
  pctBtnActive: { backgroundColor: colors.charcoal },
  pctBtnText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  pctBtnTextActive: { color: colors.white },
  modalBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: colors.fillSubtle, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 17, fontWeight: "600", color: colors.text },
  saveBtn: { flex: 1, backgroundColor: colors.charcoal, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: colors.white, fontSize: 17, fontWeight: "600" },
})
