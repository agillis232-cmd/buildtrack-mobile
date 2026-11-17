import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

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

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.tint} /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEstimates() }} tintColor={colors.tint} />}
      >
        <View style={styles.headerBanner}>
          <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  backBtn: { marginBottom: 12 },
  backText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  estimateCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10 },
  estimateTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  estimateNumber: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  clientName: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 2 },
  projectAddress: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  estimateBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.separator },
  estimateTotal: { fontSize: 18, fontWeight: "700", color: colors.tint },
  estimateDate: { fontSize: 12, color: colors.textSecondary },
  projectBadge: { backgroundColor: colors.tintSoft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 8, borderWidth: 1, borderColor: "#FED7AA" },
  projectBadgeText: { fontSize: 11, color: colors.tint, fontWeight: "600" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: colors.charcoal, borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})