import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Image, Modal } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import AsyncStorage from "@react-native-async-storage/async-storage"


export default function DashboardScreen() {
  const { user, signOut, token } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customizing, setCustomizing] = useState(false)
   const [selectedKPIs, setSelectedKPIs] = useState(
    user?.role === "FIELD_WORKER" 
      ? ["active", "completion"] 
      : ["active", "contracted", "completion"]
  )

  useEffect(() => {
    loadKPIPreferences()
  }, [])

  async function loadKPIPreferences() {
    try {
      const saved = await AsyncStorage.getItem("dashboard_kpis")
      if (saved) setSelectedKPIs(JSON.parse(saved))
    } catch (e) {
      console.log("Error loading KPI prefs:", e)
    }
  }

  async function saveKPIPreferences(kpis: string[]) {
    try {
      await AsyncStorage.setItem("dashboard_kpis", JSON.stringify(kpis))
    } catch (e) {
      console.log("Error saving KPI prefs:", e)
    }
  }

 const ALL_KPI_OPTIONS = [
    { key: "active", label: "Active Projects", description: "Number of active projects", color: "white" },
    ...(user?.role !== "FIELD_WORKER" ? [
      { key: "contracted", label: "Total Contracted", description: "Sum of all contract values", color: "#F97316" },
    ] : []),
    { key: "completion", label: "Avg Completion", description: "Average completion across projects", color: "#16A34A" },
    { key: "preconstruction", label: "Pre-Construction", description: "Projects in pre-construction", color: "#3B82F6" },
    { key: "totalLogs", label: "Total Logs", description: "Daily logs across all projects", color: "#8B5CF6" },
    { key: "totalCOs", label: "Change Orders", description: "Total change orders", color: "#F97316" },
    { key: "overdue", label: "Overdue Projects", description: "Projects past their end date", color: "#DC2626" },
  ]

  const getKPIValue = (key: string) => {
    switch (key) {
      case "active": return projects.filter(p => p.status === "ACTIVE").length.toString()
      case "contracted": return `$${(projects.reduce((sum, p) => sum + p.contractValue, 0) / 1000).toFixed(0)}k`
      case "completion": return `${projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.completionPct, 0) / projects.length) : 0}%`
      case "preconstruction": return projects.filter(p => p.status === "PRE_CONSTRUCTION").length.toString()
      case "totalLogs": return projects.reduce((sum, p) => sum + (p._count?.dailyLogs || 0), 0).toString()
      case "totalCOs": return projects.reduce((sum, p) => sum + (p._count?.changeOrders || 0), 0).toString()
      case "overdue": return projects.filter(p => p.endDate && new Date(p.endDate) < new Date() && p.status === "ACTIVE").length.toString()
      default: return "0"
    }
  }

  const kpiTiles = selectedKPIs.slice(0, 3).map(key => {
    const option = ALL_KPI_OPTIONS.find(o => o.key === key)!
    return { key, label: option.label, value: getKPIValue(key), color: option.color }
  })

  useEffect(() => {
    if (token) {
      loadProjects()
    } else {
      setLoading(false)
    }
  }, [token])

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      if (!res.ok) {
        setLoading(false)
        setRefreshing(false)
        return
      }
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) {
      console.log("Error loading projects:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  function onRefresh() {
    setRefreshing(true)
    loadProjects()
  }

  const firstName = user?.name?.split(" ")[0] || "there"
  const hour = new Date().getHours()
  const greeting = hour < 11 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#F97316" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
    >
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerOrangeCircle} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image source={require("../../assets/logo.png")} style={styles.headerLogo} resizeMode="contain" />
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile" as any)}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {user?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI strip */}
      <View style={styles.kpiRow}>
        {kpiTiles.map((tile, index) => (
          <TouchableOpacity
            key={tile.key}
            style={styles.kpiCard}
            onPress={() => setCustomizing(true)}
            activeOpacity={0.8}
          >
            <View style={styles.kpiCircle} />
            <Text style={styles.kpiLabel}>{tile.label}</Text>
            <Text style={[styles.kpiValue, { color: tile.color }]}>{tile.value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Customize Modal */}
      <Modal visible={customizing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Customize Dashboard</Text>
            <Text style={styles.modalSub}>Choose 3 metrics to display</Text>

            {ALL_KPI_OPTIONS.map(option => {
              const isSelected = selectedKPIs.includes(option.key)
              const selectedIndex = selectedKPIs.indexOf(option.key)
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => {
                    if (isSelected) {
                      if (selectedKPIs.length > 1) {
                        const updated = selectedKPIs.filter(k => k !== option.key)
                        setSelectedKPIs(updated)
                        saveKPIPreferences(updated)
                      }
                    } else {
                      if (selectedKPIs.length < 3) {
                        const updated = [...selectedKPIs, option.key]
                        setSelectedKPIs(updated)
                        saveKPIPreferences(updated)
                      } else {
                        const updated = [...selectedKPIs.slice(1), option.key]
                        setSelectedKPIs(updated)
                        saveKPIPreferences(updated)
                      }
                    }
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

      {/* Projects */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active projects</Text>
        {(user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER") && (
          <TouchableOpacity onPress={() => router.push("/new-project" as any)} style={styles.newProjectBtn}>
            <Text style={styles.newProjectBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>
      {projects.length === 0 ? (
         <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Scan a receipt or add manually</Text>
          </View>
      ) : (
        projects.map(project => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            onPress={() => router.push(`/project/${project.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.projectTop}>
              <View style={[styles.projectDot, {
                backgroundColor: project.completionPct > 70 ? "#2D5E0E" :
                  project.completionPct > 40 ? "#854F0B" : "#1C1F26"
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectSub}>{project.city}, {project.state} · {project.projectType}</Text>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor: project.status === "ACTIVE" ? "#DCFCE7" : "#FEF3C7"
              }]}>
                <Text style={[styles.statusText, {
                  color: project.status === "ACTIVE" ? "#16A34A" : "#D97706"
                }]}>
                  {project.status === "ACTIVE" ? "Active" : project.status}
                </Text>
              </View>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${project.completionPct}%`,
                  backgroundColor: project.completionPct > 70 ? "#16A34A" : "#F97316"
                }]} />
              </View>
              <Text style={styles.progressText}>{project.completionPct}%</Text>
            </View>

          <View style={styles.projectStats}>
              {(user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER") && (
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>Contract: ${(project.contractValue / 1000).toFixed(0)}k</Text>
                </View>
              )}
              <View style={styles.statPill}>
                <Text style={styles.statPillText}>Logs: {project._count?.dailyLogs || 0}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillText}>COs: {project._count?.changeOrders || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
      {/* Estimates */}
      {(user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER") && (
        <View style={styles.estimatesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Estimates</Text>
            <TouchableOpacity onPress={() => router.push("/new-estimate" as any)} style={styles.newProjectBtn}>
              <Text style={styles.newProjectBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.estimatesCard} onPress={() => router.push("/estimates" as any)}>
            <Text style={styles.estimatesCardText}>View & manage all estimates →</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F4F0" },
  headerBanner: { backgroundColor: "#1C1F26", marginHorizontal: -20, marginTop: -20, paddingHorizontal: 20, paddingTop: 70, paddingBottom: 20, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerOrangeCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 36, height: 36 },
  greeting: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  name: { fontSize: 20, fontWeight: "700", color: "white", letterSpacing: -0.5 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F97316", justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 14, fontWeight: "700", color: "white" },
 kpiRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  kpiCard: { flex: 1, backgroundColor: "#1C1F26", borderRadius: 14, padding: 12, position: "relative", overflow: "hidden" },
  kpiCircle: { position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(249,115,22,0.08)" },
  kpiLabel: { fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: "700", color: "white", letterSpacing: -0.5 },
 sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  projectCard: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  projectTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  projectDot: { width: 28, height: 28, borderRadius: 6 },
  projectName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  projectSub: { fontSize: 11, color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "600" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  progressBar: { flex: 1, height: 5, backgroundColor: "#E8E6E1", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
  progressText: { fontSize: 12, fontWeight: "700", color: "#6B7280", minWidth: 32, textAlign: "right" },
  projectStats: { flexDirection: "row", gap: 14 },
  statItem: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  statPill: { backgroundColor: "#F3F4F6", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statPillText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
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
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  newProjectBtn: { backgroundColor: "#F97316", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  newProjectBtnText: { color: "white", fontSize: 12, fontWeight: "700" },
  estimatesSection: { marginBottom: 24 },
  estimatesCard: { backgroundColor: "white", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E8E6E1" },
  estimatesCardText: { fontSize: 14, fontWeight: "600", color: "#F97316" },
})