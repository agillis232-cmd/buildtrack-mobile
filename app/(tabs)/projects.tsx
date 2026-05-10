import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

export default function ProjectsScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (token) loadProjects()
  }, [token])

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
    setLoading(false)
    setRefreshing(false)
  }

  function onRefresh() {
    setRefreshing(true)
    loadProjects()
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "#16A34A"
      case "PRE_CONSTRUCTION": return "#D97706"
      case "ARCHIVED": return "#6B7280"
      default: return "#6B7280"
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE": return "Active"
      case "PRE_CONSTRUCTION": return "Pre-Construction"
      case "ARCHIVED": return "Archived"
      default: return status
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
    >
      <Text style={styles.pageTitle}>Projects</Text>
      <Text style={styles.subtitle}>{projects.length} total projects</Text>

      {projects.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏗️</Text>
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptySub}>Create projects from the web app</Text>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectSub}>{project.city}, {project.state} · {project.projectType}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(project.status) + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor(project.status) }]}>
                  {statusLabel(project.status)}
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
              <Text style={styles.statItem}>💰 ${(project.contractValue / 1000).toFixed(0)}k</Text>
              <Text style={styles.statItem}>📋 {project._count?.dailyLogs || 0} logs</Text>
              <Text style={styles.statItem}>📝 {project._count?.changeOrders || 0} COs</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 60, paddingTop: 70 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#9CA3AF", marginBottom: 24 },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  projectCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1" },
  projectTop: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  projectName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  projectSub: { fontSize: 11, color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "600" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  progressBar: { flex: 1, height: 5, backgroundColor: "#E8E6E1", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99 },
  progressText: { fontSize: 12, fontWeight: "700", color: "#6B7280", minWidth: 32, textAlign: "right" },
  projectStats: { flexDirection: "row", gap: 14 },
  statItem: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
})