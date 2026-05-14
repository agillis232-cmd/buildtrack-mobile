import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

   const sections = [
    { label: "Expenses", sub: "Scan receipts & track costs", route: `/project/${id}/expenses` },
    { label: "Photos", sub: "Upload job site photos", route: `/project/${id}/photos` },
    { label: "Daily Logs", sub: "View & add daily reports", route: `/project/${id}/logs` },
    { label: "Change Orders", sub: "View & create change orders", route: `/project/${id}/change-orders` },
    { label: "Messages", sub: "Notes & communication", route: `/project/${id}/messages` },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.projectName}>{project.name}</Text>
      <Text style={styles.projectSub}>{project.address}, {project.city}, {project.state}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{project.completionPct}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${(project.contractValue / 1000).toFixed(0)}k</Text>
          <Text style={styles.statLabel}>Contract</Text>
        </View>
        <View style={[styles.statCard, { 
          backgroundColor: project.status === "ACTIVE" ? "#DCFCE7" : "#FEF3C7" 
        }]}>
          <Text style={[styles.statValue, { 
            fontSize: 13,
            color: project.status === "ACTIVE" ? "#16A34A" : "#D97706" 
          }]}>{project.status}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { 
          width: `${project.completionPct}%`,
          backgroundColor: project.completionPct > 70 ? "#16A34A" : "#F97316"
        }]} />
      </View>

      <Text style={styles.sectionTitle}>Project Actions</Text>

      {sections.map((section) => (
        <TouchableOpacity
          key={section.route}
          style={styles.sectionCard}
          onPress={() => router.push(section.route as any)}
          activeOpacity={0.8}
        >
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
  content: { padding: 20, paddingBottom: 40, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 20 },
  backText: { color: "#F97316", fontSize: 16, fontWeight: "600" },
  projectName: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  projectSub: { fontSize: 13, color: "#9CA3AF", marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: "white", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  statValue: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  statLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 2, textTransform: "uppercase" },
  progressBar: { height: 6, backgroundColor: "#E8E6E1", borderRadius: 99, overflow: "hidden", marginBottom: 28 },
  progressFill: { height: "100%", borderRadius: 99 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 12 },
  sectionCard: { backgroundColor: "white", borderRadius: 14, padding: 18, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  sectionLabel: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  sectionSub: { fontSize: 12, color: "#9CA3AF" },
  arrow: { fontSize: 18, color: "#D1D5DB" },
  errorText: { fontSize: 16, color: "#6B7280" },
})