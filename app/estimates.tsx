import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6B7280",
  SENT: "#3B82F6",
  APPROVED: "#16A34A",
  DECLINED: "#DC2626",
  CONVERTED: "#8B5CF6",
}

export default function EstimatesScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (token) loadEstimates()
  }, [token])

  async function loadEstimates() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/estimates`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setEstimates(data.estimates || [])
    } catch (e) {
      console.log("Error loading estimates:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  async function deleteEstimate(id: string) {
    Alert.alert("Delete Estimate", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/mobile/estimates/${id}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            setEstimates(prev => prev.filter(e => e.id !== id))
          } catch (e) {
            Alert.alert("Error", "Could not delete estimate")
          }
        }
      }
    ])
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEstimates() }} tintColor="#F97316" />}
      >
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Estimates</Text>
          <Text style={styles.subtitle}>{estimates.length} estimate{estimates.length !== 1 ? "s" : ""}</Text>
        </View>

        {estimates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No estimates yet</Text>
            <Text style={styles.emptySub}>Create your first estimate to get started</Text>
          </View>
        ) : (
          estimates.map(est => (
            <TouchableOpacity
              key={est.id}
              style={styles.estimateCard}
              onPress={() => router.push(`/estimate/${est.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.estimateTop}>
                <Text style={styles.estimateNumber}>{est.estimateNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[est.status] + "20" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[est.status] }]}>{est.status}</Text>
                </View>
              </View>
              <Text style={styles.clientName}>{est.clientName}</Text>
              {est.projectAddress && <Text style={styles.projectAddress}>{est.projectAddress}</Text>}
              <View style={styles.estimateBottom}>
                <Text style={styles.estimateTotal}>${est.total.toLocaleString()}</Text>
                <Text style={styles.estimateDate}>{new Date(est.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
              </View>
              {est.project && (
                <View style={styles.projectBadge}>
                  <Text style={styles.projectBadgeText}>{est.project.name}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={() => router.push("/new-estimate" as any)}>
          <Text style={styles.fabText}>New Estimate</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  estimateCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  estimateTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  estimateNumber: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  clientName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  projectAddress: { fontSize: 13, color: "#6B7280", marginBottom: 10 },
  estimateBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  estimateTotal: { fontSize: 18, fontWeight: "700", color: "#F97316" },
  estimateDate: { fontSize: 12, color: "#9CA3AF" },
  projectBadge: { backgroundColor: "#FFF7ED", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 8, borderWidth: 1, borderColor: "#FED7AA" },
  projectBadgeText: { fontSize: 11, color: "#F97316", fontWeight: "600" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})