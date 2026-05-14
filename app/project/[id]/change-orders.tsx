import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function ChangeOrdersScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [changeOrders, setChangeOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [costImpact, setCostImpact] = useState("")
  const [scheduleDays, setScheduleDays] = useState("")
  const [reason, setReason] = useState("Client request")

  useEffect(() => {
    if (token && id) loadChangeOrders()
  }, [token, id])

  async function loadChangeOrders() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/change-orders`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setChangeOrders(data.changeOrders || [])
    } catch (e) {
      console.log("Error loading change orders:", e)
    }
    setLoading(false)
  }

  async function saveChangeOrder() {
    if (!title || !description || !costImpact) {
      Alert.alert("Error", "Title, description and cost impact are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/change-orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description,
          costImpact: parseFloat(costImpact),
          scheduleDays: parseInt(scheduleDays) || 0,
          reason
        })
      })
      const data = await res.json()
      if (data.changeOrder) {
        setChangeOrders(prev => [data.changeOrder, ...prev])
        setTitle("")
        setDescription("")
        setCostImpact("")
        setScheduleDays("")
        setReason("Client request")
        setAdding(false)
      } else {
        Alert.alert("Error", "Could not save change order")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "#16A34A"
      case "PENDING": return "#D97706"
      case "DRAFT": return "#6B7280"
      case "VOID": return "#DC2626"
      default: return "#6B7280"
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Change Orders</Text>

        {adding && (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>New Change Order</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Additional electrical work" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Description *</Text>
              <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Describe the change..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Cost Impact ($) *</Text>
              <TextInput style={styles.input} value={costImpact} onChangeText={setCostImpact} placeholder="2500.00" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Schedule Impact (days)</Text>
              <TextInput style={styles.input} value={scheduleDays} onChangeText={setScheduleDays} placeholder="3" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Reason</Text>
              <View style={styles.reasonRow}>
                {["Client request", "Unforeseen", "Design change"].map(r => (
                  <TouchableOpacity key={r} style={[styles.reasonBtn, reason === r && styles.reasonBtnActive]} onPress={() => setReason(r)}>
                    <Text style={[styles.reasonBtnText, reason === r && styles.reasonBtnTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveChangeOrder} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {changeOrders.length === 0 && !adding ? (
           <View style={styles.emptyCard}>
           <Text style={styles.emptyTitle}>No change orders yet</Text>
<Text style={styles.emptySub}>Create your first change order</Text>
          </View>
        ) : (
          changeOrders.map(co => (
            <View key={co.id} style={styles.coCard}>
              <View style={styles.coTop}>
                <Text style={styles.coNumber}>CO #{co.number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(co.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor(co.status) }]}>{co.status}</Text>
                </View>
              </View>
              <Text style={styles.coTitle}>{co.title}</Text>
              <Text style={styles.coDesc}>{co.description}</Text>
              <View style={styles.coStats}>
                <Text style={styles.coStat}>💰 ${co.costImpact.toLocaleString()}</Text>
                <Text style={styles.coStat}>📅 {co.scheduleDays} days</Text>
                <Text style={styles.coStat}>📌 {co.reason}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {!adding && (
        <View style={styles.fab}>
          <TouchableOpacity style={styles.fabBtn} onPress={() => setAdding(true)}>
           <Text style={styles.fabText}>New Change Order</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 120, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 20 },
  backText: { color: "#F97316", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
  addCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E8E6E1" },
  addTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  multiline: { height: 80, textAlignVertical: "top" },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  reasonBtnActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  reasonBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  reasonBtnTextActive: { color: "white" },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  coCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  coTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  coNumber: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  coTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  coDesc: { fontSize: 13, color: "#6B7280", marginBottom: 10, lineHeight: 18 },
  coStats: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  coStat: { fontSize: 12, color: "#6B7280" },
  fab: { position: "absolute", bottom: 30, left: 20, right: 20 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})