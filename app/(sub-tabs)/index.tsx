import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://buildtrackpro.app"

export default function SubProjectsScreen() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/sub/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) { console.error(e) }
    setLoading(false)
    setRefreshing(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <Text style={styles.title}>My Projects</Text>
        <Text style={styles.subtitle}>{projects.length} assigned project{projects.length !== 1 ? "s" : ""}</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProjects() }} tintColor="#F97316" />}
      >
        {loading ? (
          <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 40 }}>Loading...</Text>
        ) : projects.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 }}>No projects yet</Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF" }}>You will see projects here when a contractor assigns you</Text>
          </View>
        ) : (
          projects.map((p: any) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => router.push(`/project/${p.projectId}` as any)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  {p.orgName && <Text style={{ fontSize: 10, fontWeight: "700", color: "#F97316", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{p.orgName}</Text>}
                  <Text style={styles.cardTitle}>{p.projectName}</Text>
                  <Text style={styles.cardSub}>{p.trade} - {p.projectAddress}</Text>
                </View>
                <View style={{ backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#16A34A" }}>{p.completionPct || 0}%</Text>
                </View>
              </View>
              {p.scopeOfWork && <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }} numberOfLines={2}>{p.scopeOfWork}</Text>}
              <View style={{ height: 4, backgroundColor: "#F3F4F6", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <View style={{ height: 4, backgroundColor: "#F97316", borderRadius: 2, width: `${p.completionPct || 0}%` }} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  header: { backgroundColor: "#1C1F26", paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, overflow: "hidden" },
  headerCircle: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(249,115,22,0.08)" },
  title: { fontSize: 22, fontWeight: "800", color: "white", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  list: { flex: 1 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  cardSub: { fontSize: 12, color: "#9CA3AF" },
})
