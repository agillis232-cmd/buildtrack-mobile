import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

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

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>
  if (!project) return <View style={styles.center}><Text style={styles.errorText}>Project not found</Text></View>

  const isAdmin = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"

  const sections = [
    { label: "Expenses", sub: "Scan receipts & track costs", route: `/project/${id}/expenses`, color: "#8B5CF6" },
    { label: "Photos", sub: "Upload job site photos", route: `/project/${id}/photos`, color: "#3B82F6" },
    { label: "Daily Logs", sub: "View & add daily reports", route: `/project/${id}/logs`, color: "#16A34A" },
    { label: "Documents", sub: "Contracts, plans & permits", route: `/project/${id}/documents`, color: "#F59E0B" },
    ...(isAdmin ? [{ label: "Change Orders", sub: "View & create change orders", route: `/project/${id}/change-orders`, color: "#F97316" }] : []),
    { label: "Messages", sub: "Notes & communication", route: `/project/${id}/messages`, color: "#EC4899" },
  ]

  const statusColor = project.status === "ACTIVE" ? "#16A34A" : project.status === "PRE_CONSTRUCTION" ? "#D97706" : "#6B7280"
  const statusLabel = project.status === "ACTIVE" ? "Active" : project.status === "PRE_CONSTRUCTION" ? "Pre-Construction" : project.status

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.projectName}>{project.name}</Text>
        <Text style={styles.projectSub}>{project.address}, {project.city}, {project.state}</Text>
        <Text style={styles.projectType}>{project.projectType}</Text>

        {/* Progress */}
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
      </View>

      {/* Stats row */}
     <View style={styles.statsRow}>
          {(user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER") && (
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

      {/* Section title */}
      <Text style={styles.sectionTitle}>Project Actions</Text>

      {/* Action cards */}
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
})