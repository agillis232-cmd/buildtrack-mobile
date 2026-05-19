import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

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
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProject(data.project)
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

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>
  if (!project) return <View style={styles.center}><Text style={styles.errorText}>Project not found</Text></View>

  const isAdmin = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"

  const sections = [
    { label: "Expenses", sub: "Scan receipts & track costs", route: `/project/${id}/expenses`, color: "#8B5CF6" },
    { label: "Photos", sub: "Upload job site photos", route: `/project/${id}/photos`, color: "#3B82F6" },
    { label: "Daily Logs", sub: "View & add daily reports", route: `/project/${id}/logs`, color: "#16A34A" },
    { label: "Documents", sub: "Contracts, plans & permits", route: `/project/${id}/documents`, color: "#F59E0B" },
    ...(isAdmin ? [{ label: "Job Financials", sub: "Revenue, expenses & profit", route: `/project-financials/${id}`, color: "#16A34A" }] : []),
    { label: "Messages", sub: "Notes & communication", route: `/project/${id}/messages`, color: "#EC4899" },
  ]

  const statusColor = project.status === "ACTIVE" ? "#16A34A" : project.status === "PRE_CONSTRUCTION" ? "#D97706" : project.status === "ON_HOLD" ? "#DC2626" : "#6B7280"
  const statusLabel = project.status === "ACTIVE" ? "Active" : project.status === "PRE_CONSTRUCTION" ? "Pre-Construction" : project.status === "ON_HOLD" ? "On Hold" : project.status === "COMPLETED" ? "Completed" : project.status

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectSub}>{project.address}, {project.city}, {project.state}</Text>
          <Text style={styles.projectType}>{project.projectType}</Text>

          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Completion</Text>
              <Text style={styles.progressValue}>{project.completionPct}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${project.completionPct}%`,
                backgroundColor: project.completionPct > 70 ? "#16A34A" : "#F97316"
              }]} />
            </View>
          </View>

          {isAdmin && (
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={() => {
                setNewStatus(project.status)
                setNewCompletion(project.completionPct.toString())
                setShowUpdateModal(true)
              }}
            >
              <Text style={styles.updateBtnText}>Update Status & Completion</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          {isAdmin && (
            <View style={styles.statCard}>
              <Text style={styles.statValue}>${(project.contractValue / 1000).toFixed(0)}k</Text>
              <Text style={styles.statLabel}>Contract</Text>
            </View>
          )}
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{project._count?.dailyLogs || 0}</Text>
            <Text style={styles.statLabel}>Daily Logs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{project._count?.changeOrders || 0}</Text>
            <Text style={styles.statLabel}>Change Orders</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: statusColor + "15" }]}>
            <Text style={[styles.statValue, { fontSize: 11, color: statusColor }]}>{statusLabel}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Project Actions</Text>

        {sections.map((section) => (
          <TouchableOpacity
            key={section.route}
            style={styles.sectionCard}
            onPress={() => router.push(section.route as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.sectionIconBox, { backgroundColor: section.color + "15" }]}>
              <View style={[styles.sectionIconDot, { backgroundColor: section.color }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <Text style={styles.sectionSub}>{section.sub}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showUpdateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Project</Text>

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusRow}>
              {["PRE_CONSTRUCTION", "ACTIVE", "ON_HOLD", "COMPLETED"].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, newStatus === s && styles.statusBtnActive]}
                  onPress={() => setNewStatus(s)}
                >
                  <Text style={[styles.statusBtnText, newStatus === s && styles.statusBtnTextActive]}>
                    {s.replace(/_/g, " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Completion %</Text>
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
                {updating ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#6B7280" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 16, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 16 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  projectName: { fontSize: 24, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  projectSub: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 2 },
  projectType: { fontSize: 12, color: "#F97316", fontWeight: "600", marginBottom: 16 },
  progressSection: { gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  progressValue: { fontSize: 12, fontWeight: "700", color: "white" },
  progressBar: { height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
  updateBtn: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 8, padding: 10, alignItems: "center", marginTop: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  updateBtnText: { color: "white", fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "white", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  statValue: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  statLabel: { fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", fontWeight: "600", textAlign: "center" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, paddingHorizontal: 16 },
  sectionCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", gap: 14 },
  sectionIconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sectionIconDot: { width: 14, height: 14, borderRadius: 4 },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  sectionSub: { fontSize: 12, color: "#9CA3AF" },
  arrow: { fontSize: 20, color: "#D1D5DB", fontWeight: "300" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 10 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  statusBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  statusBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  statusBtnTextActive: { color: "white" },
  completionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  pctBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  pctBtnActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  pctBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  pctBtnTextActive: { color: "white" },
  modalBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
})