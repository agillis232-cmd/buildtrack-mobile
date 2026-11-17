import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"
import { colors } from "@/lib/theme"

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
        <Text style={styles.title}>My Projects</Text>
        <Text style={styles.subtitle}>{projects.length} assigned project{projects.length !== 1 ? "s" : ""}</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProjects() }} tintColor={colors.tint} />}
      >
        {loading ? (
          <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 40 }}>Loading...</Text>
        ) : projects.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 }}>No projects yet</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>You will see projects here when a contractor assigns you</Text>
          </View>
        ) : (
          projects.map((p: any) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => router.push(`/project/${p.projectId}` as any)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  {p.orgName && <Text style={{ fontSize: 11, fontWeight: "700", color: colors.tint, marginBottom: 2 }}>{p.orgName}</Text>}
                  <Text style={styles.cardTitle}>{p.projectName}</Text>
                  <Text style={styles.cardSub}>{p.trade} - {p.projectAddress}</Text>
                </View>
                <View style={{ backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success }}>{p.completionPct || 0}%</Text>
                </View>
              </View>
              {p.scopeOfWork && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }} numberOfLines={2}>{p.scopeOfWork}</Text>}
              <View style={{ height: 4, backgroundColor: colors.fillSubtle, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                <View style={{ height: 4, backgroundColor: colors.accent, borderRadius: 2, width: `${p.completionPct || 0}%` }} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "800", color: colors.text, marginBottom: 4, letterSpacing: -0.6 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  list: { flex: 1 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 2 },
  cardSub: { fontSize: 12, color: colors.textSecondary },
})
