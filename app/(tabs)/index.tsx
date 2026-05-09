import { useState, useEffect } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator
} from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function DashboardScreen() {
  const { user, signOut, token } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (!res.ok) {
        console.log("Projects fetch failed:", res.status)
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
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{firstName} 👋</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* KPI strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Active projects</Text>
          <Text style={styles.kpiValue}>{projects.filter(p => p.status === "ACTIVE").length}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total contracted</Text>
          <Text style={[styles.kpiValue, { color: "#F97316" }]}>
            ${(projects.reduce((sum, p) => sum + p.contractValue, 0) / 1000).toFixed(0)}k
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Avg completion</Text>
          <Text style={[styles.kpiValue, { color: "#16A34A" }]}>
            {projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.completionPct, 0) / projects.length) : 0}%
          </Text>
        </View>
      </ScrollView>

      {/* Projects */}
      <Text style={styles.sectionTitle}>Active projects</Text>
      {projects.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏗️</Text>
          <Text style={styles.emptyTitle}>No projects yet</Text>
          <Text style={styles.emptySub}>Create your first project on the web app</Text>
        </View>
      ) : (
        projects.map(project => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            onPress={() => router.push(`/project/${project.id}`)}
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
              <Text style={styles.statItem}>💰 ${project.contractValue.toLocaleString()}</Text>
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
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F4F0" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingTop: 56 },
  greeting: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "700", color: "#1A1A1A", letterSpacing: -0.5 },
  signOutBtn: { backgroundColor: "#1C1F26", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, marginTop: 6 },
  signOutText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  kpiScroll: { marginBottom: 24 },
  kpiCard: { backgroundColor: "white", borderRadius: 12, padding: 16, marginRight: 10, minWidth: 130, borderWidth: 1, borderColor: "#E8E6E1" },
  kpiLabel: { fontSize: 10, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  kpiValue: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", letterSpacing: -0.5 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 12, letterSpacing: -0.3 },
  projectCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
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
})