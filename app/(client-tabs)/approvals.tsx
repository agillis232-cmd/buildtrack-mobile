import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, RefreshControl } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function ClientApprovalsScreen() {
  const { token } = useAuth()
  const [changeOrders, setChangeOrders] = useState<any[]>([])
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sigName, setSigName] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (token) loadData()
  }, [token])

  async function loadData() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/client/project`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProject(data.project)
      setChangeOrders(data.project?.changeOrders || [])
    } catch (e) {
      console.log("Error loading change orders:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  async function handleAction(coId: string, action: "approve" | "reject") {
    if (action === "approve" && !sigName.trim()) {
      Alert.alert("Signature Required", "Please type your full name to approve")
      return
    }
    setProcessing(coId)
    try {
      const res = await fetch(`${API_URL}/api/mobile/client/approve-co`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ coId, sigName, action })
      })
      const data = await res.json()
      if (data.changeOrder) {
        setChangeOrders(prev => prev.map(co => co.id === coId ? { ...co, status: data.changeOrder.status } : co))
        setSigName("")
        Alert.alert(action === "approve" ? "Approved!" : "Rejected", `Change order has been ${action === "approve" ? "approved" : "rejected"}.`)
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setProcessing(null)
  }

  const pending = changeOrders.filter(co => co.status === "PENDING_APPROVAL")
  const decided = changeOrders.filter(co => co.status !== "PENDING_APPROVAL" && co.status !== "DRAFT")

  const statusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "#16A34A"
      case "VOID": return "#DC2626"
      case "PENDING_APPROVAL": return "#D97706"
      default: return "#6B7280"
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} tintColor="#F97316" />}
    >
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <Text style={styles.title}>Change Orders</Text>
        {pending.length > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pending.length} awaiting approval</Text>
          </View>
        )}
      </View>

      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requires Your Approval</Text>
          {pending.map(co => (
            <View key={co.id} style={styles.pendingCard}>
              <View style={styles.coHeader}>
                <Text style={styles.coNumber}>CO #{co.number}</Text>
                <Text style={styles.coCost}>+${co.costImpact.toLocaleString()}</Text>
              </View>
              <Text style={styles.coTitle}>{co.title}</Text>
              <Text style={styles.coDesc}>{co.description}</Text>

              {project && (
                <View style={styles.impactBox}>
                  <Text style={styles.impactText}>
                    If approved, your new contract total will be{" "}
                    <Text style={styles.impactValue}>${(project.contractValue + co.costImpact).toLocaleString()}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.sigSection}>
                <Text style={styles.sigLabel}>Type your full name to approve</Text>
                <TextInput
                  style={styles.sigInput}
                  value={sigName}
                  onChangeText={setSigName}
                  placeholder="Your full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.actionBtns}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleAction(co.id, "reject")}
                  disabled={!!processing}
                >
                  {processing === co.id ? <ActivityIndicator color="#DC2626" size="small" /> : <Text style={styles.rejectBtnText}>Reject</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleAction(co.id, "approve")}
                  disabled={!!processing}
                >
                  {processing === co.id ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.approveBtnText}>Approve & Sign</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {decided.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {decided.map(co => (
            <View key={co.id} style={styles.historyCard}>
              <View style={styles.coHeader}>
                <Text style={styles.coNumber}>CO #{co.number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(co.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor(co.status) }]}>{co.status}</Text>
                </View>
              </View>
              <Text style={styles.coTitle}>{co.title}</Text>
              <Text style={styles.coCostSmall}>+${co.costImpact.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {changeOrders.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No change orders yet</Text>
          <Text style={styles.emptySub}>Change orders will appear here for your approval</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 8 },
  pendingBadge: { backgroundColor: "rgba(217,119,6,0.2)", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(217,119,6,0.3)" },
  pendingBadgeText: { fontSize: 12, color: "#D97706", fontWeight: "700" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  pendingCard: { backgroundColor: "white", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#FDE68A", marginBottom: 12 },
  historyCard: { backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 8 },
  coHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  coNumber: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  coCost: { fontSize: 20, fontWeight: "700", color: "#F97316" },
  coCostSmall: { fontSize: 14, fontWeight: "700", color: "#F97316", marginTop: 2 },
  coTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  coDesc: { fontSize: 13, color: "#6B7280", lineHeight: 20, marginBottom: 12 },
  impactBox: { backgroundColor: "#EFF6FF", borderRadius: 10, padding: 12, marginBottom: 12 },
  impactText: { fontSize: 13, color: "#1D4ED8", lineHeight: 20 },
  impactValue: { fontWeight: "700" },
  sigSection: { marginBottom: 12 },
  sigLabel: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 },
  sigInput: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  actionBtns: { flexDirection: "row", gap: 10 },
  rejectBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 13, alignItems: "center" },
  rejectBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 14 },
  approveBtn: { flex: 2, backgroundColor: "#16A34A", borderRadius: 10, padding: 13, alignItems: "center" },
  approveBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
})