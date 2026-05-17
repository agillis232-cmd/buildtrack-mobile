import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import AsyncStorage from "@react-native-async-storage/async-storage"

const CLIENT_KPI_OPTIONS = [
  { key: "contract", label: "Contract Total", description: "Total contract value including approved COs", color: "white" },
  { key: "completion", label: "Completion", description: "Overall project completion percentage", color: "#F97316" },
  { key: "pending_cos", label: "Pending Approvals", description: "Change orders awaiting your approval", color: "#D97706" },
  { key: "approved_cos", label: "Approved COs", description: "Number of approved change orders", color: "#16A34A" },
  { key: "photos", label: "Site Photos", description: "Total photos uploaded", color: "#3B82F6" },
  { key: "logs", label: "Site Updates", description: "Daily log entries", color: "#8B5CF6" },
]

export default function ClientDashboard() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [selectedKPIs, setSelectedKPIs] = useState(["contract", "pending_cos"])

  useEffect(() => {
    loadKPIPreferences()
  }, [])

  useEffect(() => {
    if (token) loadProject()
  }, [token])

  async function loadKPIPreferences() {
    try {
      const saved = await AsyncStorage.getItem("client_dashboard_kpis")
      if (saved) setSelectedKPIs(JSON.parse(saved))
    } catch (e) {
      console.log("Error loading KPI prefs:", e)
    }
  }

  async function saveKPIPreferences(kpis: string[]) {
    try {
      await AsyncStorage.setItem("client_dashboard_kpis", JSON.stringify(kpis))
    } catch (e) {
      console.log("Error saving KPI prefs:", e)
    }
  }

  async function loadProject() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/client/project`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProject(data.project)
    } catch (e) {
      console.log("Error loading client project:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  const firstName = user?.name?.split(" ")[0] || "there"
  const pendingCOs = project?.changeOrders?.filter((co: any) => co.status === "PENDING_APPROVAL") || []
  const approvedCOs = project?.changeOrders?.filter((co: any) => co.status === "APPROVED") || []
  const totalCOValue = approvedCOs.reduce((sum: number, co: any) => sum + co.costImpact, 0)

  function getKPIValue(key: string) {
    if (!project) return "0"
    switch (key) {
      case "contract": return `$${((project.contractValue || 0) + totalCOValue).toLocaleString()}`
      case "completion": return `${project.completionPct || 0}%`
      case "pending_cos": return pendingCOs.length.toString()
      case "approved_cos": return approvedCOs.length.toString()
      case "photos": return (project.photos?.length || 0).toString()
      case "logs": return (project._count?.dailyLogs || 0).toString()
      default: return "0"
    }
  }

  const kpiTiles = selectedKPIs.slice(0, 2).map(key => {
    const option = CLIENT_KPI_OPTIONS.find(o => o.key === key)!
    return { key, label: option.label, value: getKPIValue(key), color: option.color }
  })

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProject() }} tintColor="#F97316" />}
    >
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile" as any)}>
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {project && (
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectSub}>{project.projectType} · {project.city}, {project.state}</Text>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Overall Completion</Text>
                <Text style={styles.progressValue}>{project.completionPct}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${project.completionPct}%` }]} />
              </View>
            </View>
          </View>
        )}
      </View>

      {!project ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No project assigned</Text>
          <Text style={styles.emptySub}>Contact your contractor to get access</Text>
        </View>
      ) : (
        <>
          {pendingCOs.length > 0 && (
            <TouchableOpacity style={styles.actionBanner} onPress={() => router.push("/(client-tabs)/approvals" as any)}>
              <View style={styles.actionBannerLeft}>
                <Text style={styles.actionBannerTitle}>Action Required</Text>
                <Text style={styles.actionBannerSub}>{pendingCOs.length} change order{pendingCOs.length > 1 ? "s" : ""} awaiting your approval</Text>
              </View>
              <Text style={styles.actionBannerArrow}>›</Text>
            </TouchableOpacity>
          )}

          {/* KPI tiles */}
          <View style={styles.financeRow}>
            {kpiTiles.map(tile => (
              <TouchableOpacity
                key={tile.key}
                style={styles.financeCard}
                onPress={() => setCustomizing(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.financeLabel}>{tile.label}</Text>
                <Text style={[styles.financeValue, { color: tile.color }]}>{tile.value}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {project.dailyLogs?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Site Updates</Text>
              {project.dailyLogs.slice(0, 3).map((log: any) => (
                <View key={log.id} style={styles.logCard}>
                  <Text style={styles.logDate}>{new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</Text>
                  <Text style={styles.logSummary}>{log.summary}</Text>
                  <Text style={styles.logMeta}>{log.weather} · {log.hoursWorked} hrs</Text>
                </View>
              ))}
            </View>
          )}

          {project.changeOrders?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change Orders</Text>
              {project.changeOrders.slice(0, 3).map((co: any) => (
                <View key={co.id} style={styles.coCard}>
                  <View style={styles.coTop}>
                    <Text style={styles.coTitle}>{co.title}</Text>
                    <Text style={styles.coCost}>+${co.costImpact.toLocaleString()}</Text>
                  </View>
                  <Text style={[styles.coStatus, {
                    color: co.status === "APPROVED" ? "#16A34A" : co.status === "PENDING_APPROVAL" ? "#D97706" : "#6B7280"
                  }]}>
                    {co.status.replace("_", " ")}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {project.scheduleEvents?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {project.scheduleEvents.slice(0, 3).map((event: any) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventMonth}>{new Date(event.date).toLocaleDateString("en-US", { month: "short" })}</Text>
                    <Text style={styles.eventDay}>{new Date(event.date).getDate()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventType}>{event.type}{event.startTime ? ` · ${event.startTime}` : ""}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Customize Modal */}
      <Modal visible={customizing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Customize Dashboard</Text>
            <Text style={styles.modalSub}>Choose 2 metrics to display</Text>
            {CLIENT_KPI_OPTIONS.map(option => {
              const isSelected = selectedKPIs.includes(option.key)
              const selectedIndex = selectedKPIs.indexOf(option.key)
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => {
                    let updated
                    if (isSelected) {
                      if (selectedKPIs.length > 1) {
                        updated = selectedKPIs.filter(k => k !== option.key)
                      } else return
                    } else {
                      if (selectedKPIs.length < 2) {
                        updated = [...selectedKPIs, option.key]
                      } else {
                        updated = [...selectedKPIs.slice(1), option.key]
                      }
                    }
                    setSelectedKPIs(updated)
                    saveKPIPreferences(updated)
                  }}
                >
                  <View style={[styles.optionCheck, isSelected && styles.optionCheckSelected]}>
                    {isSelected && <Text style={styles.optionCheckText}>{selectedIndex + 1}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
                    <Text style={styles.optionSub}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setCustomizing(false)}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 16, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  name: { fontSize: 22, fontWeight: "700", color: "white", letterSpacing: -0.5 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F97316", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "white" },
  projectInfo: { gap: 4 },
  projectName: { fontSize: 18, fontWeight: "700", color: "white", marginBottom: 2 },
  projectSub: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 },
  progressSection: { gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  progressValue: { fontSize: 12, fontWeight: "700", color: "white" },
  progressBar: { height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#F97316", borderRadius: 99 },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  actionBanner: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#FDE68A" },
  actionBannerLeft: { flex: 1 },
  actionBannerTitle: { fontSize: 14, fontWeight: "700", color: "#D97706", marginBottom: 2 },
  actionBannerSub: { fontSize: 12, color: "#D97706" },
  actionBannerArrow: { fontSize: 20, color: "#D97706" },
  financeRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  financeCard: { flex: 1, backgroundColor: "#1C1F26", borderRadius: 14, padding: 14 },
  financeLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  financeValue: { fontSize: 20, fontWeight: "700", color: "white", marginBottom: 2 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  logCard: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#E8E6E1" },
  logDate: { fontSize: 12, fontWeight: "700", color: "#F97316", marginBottom: 4 },
  logSummary: { fontSize: 14, color: "#1A1A1A", lineHeight: 20, marginBottom: 4 },
  logMeta: { fontSize: 11, color: "#9CA3AF" },
  coCard: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#E8E6E1" },
  coTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  coTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", flex: 1, marginRight: 8 },
  coCost: { fontSize: 15, fontWeight: "700", color: "#F97316" },
  coStatus: { fontSize: 11, fontWeight: "600" },
  eventCard: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E8E6E1" },
  eventDateBox: { width: 44, height: 44, backgroundColor: "#FFF7ED", borderRadius: 10, justifyContent: "center", alignItems: "center" },
  eventMonth: { fontSize: 10, color: "#F97316", fontWeight: "700", textTransform: "uppercase" },
  eventDay: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  eventTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", marginBottom: 2 },
  eventType: { fontSize: 12, color: "#9CA3AF" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#9CA3AF", marginBottom: 20 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1" },
  optionRowSelected: { backgroundColor: "#FFF7ED", borderColor: "#F97316" },
  optionCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#E8E6E1", justifyContent: "center", alignItems: "center" },
  optionCheckSelected: { backgroundColor: "#F97316", borderColor: "#F97316" },
  optionCheckText: { fontSize: 12, fontWeight: "700", color: "white" },
  optionLabel: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", marginBottom: 2 },
  optionLabelSelected: { color: "#F97316" },
  optionSub: { fontSize: 12, color: "#9CA3AF" },
  modalDoneBtn: { backgroundColor: "#F97316", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  modalDoneBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
})