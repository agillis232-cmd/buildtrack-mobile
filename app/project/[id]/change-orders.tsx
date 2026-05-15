import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal } from "react-native"
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
  const [editingCO, setEditingCO] = useState<any>(null)

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

  function openEdit(co: any) {
    setEditingCO(co)
    setTitle(co.title)
    setDescription(co.description)
    setCostImpact(co.costImpact.toString())
    setScheduleDays(co.scheduleDays.toString())
    setReason(co.reason)
  }

  function closeEdit() {
    setEditingCO(null)
    setTitle("")
    setDescription("")
    setCostImpact("")
    setScheduleDays("")
    setReason("Client request")
  }

  async function saveCO() {
    if (!title || !description || !costImpact) {
      Alert.alert("Error", "Title, description and cost impact are required")
      return
    }
    setSaving(true)
    try {
      const url = editingCO
        ? `${API_URL}/api/mobile/projects/${id}/change-orders/${editingCO.id}`
        : `${API_URL}/api/mobile/projects/${id}/change-orders`

      const res = await fetch(url, {
        method: editingCO ? "PATCH" : "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description,
          costImpact: parseFloat(costImpact),
          scheduleDays: parseInt(scheduleDays) || 0,
          reason
        })
      })
      const data = await res.json()
      if (data.changeOrder) {
        if (editingCO) {
          setChangeOrders(prev => prev.map(c => c.id === data.changeOrder.id ? data.changeOrder : c))
          closeEdit()
        } else {
          setChangeOrders(prev => [data.changeOrder, ...prev])
          setTitle("")
          setDescription("")
          setCostImpact("")
          setScheduleDays("")
          setReason("Client request")
          setAdding(false)
        }
      } else {
        Alert.alert("Error", "Could not save change order")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function deleteCO(coId: string) {
    Alert.alert("Delete Change Order", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/mobile/projects/${id}/change-orders/${coId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) setChangeOrders(prev => prev.filter(c => c.id !== coId))
            else Alert.alert("Error", "Could not delete change order")
          } catch (e) {
            Alert.alert("Error", "Connection error")
          }
        }
      }
    ])
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

  const totalCost = changeOrders.reduce((sum, co) => sum + co.costImpact, 0)

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Change Orders</Text>
          {changeOrders.length > 0 && (
            <View style={styles.headerStats}>
              <Text style={styles.headerStatValue}>{changeOrders.length} total</Text>
              <Text style={styles.headerStatDot}>·</Text>
              <Text style={styles.headerStatValue}>${totalCost.toLocaleString()} impact</Text>
            </View>
          )}
        </View>

        {adding && (
          <View style={styles.addCard}>
            <View style={styles.addCardHeader}>
              <Text style={styles.addTitle}>New Change Order</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Additional electrical work" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description *</Text>
              <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Describe the scope of change..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Cost Impact ($) *</Text>
                <TextInput style={styles.input} value={costImpact} onChangeText={setCostImpact} placeholder="2500.00" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Schedule (days)</Text>
                <TextInput style={styles.input} value={scheduleDays} onChangeText={setScheduleDays} placeholder="3" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
              </View>
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

            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCO} disabled={saving}>
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
                <View style={styles.coNumberRow}>
                  <Text style={styles.coNumber}>CO #{co.number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(co.status) + "20" }]}>
                    <Text style={[styles.statusText, { color: statusColor(co.status) }]}>{co.status}</Text>
                  </View>
                </View>
                <Text style={styles.coCost}>+${co.costImpact.toLocaleString()}</Text>
              </View>
              <Text style={styles.coTitle}>{co.title}</Text>
              <Text style={styles.coDesc}>{co.description}</Text>
              <View style={styles.coMeta}>
                <View style={styles.coMetaPill}>
                  <Text style={styles.coMetaText}>{co.scheduleDays} day{co.scheduleDays !== 1 ? "s" : ""} added</Text>
                </View>
                <View style={styles.coMetaPill}>
                  <Text style={styles.coMetaText}>{co.reason}</Text>
                </View>
              </View>
              <View style={styles.coActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(co)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCO(co.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
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

      <Modal visible={!!editingCO} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Change Order</Text>
            <ScrollView>
              <View style={styles.field}>
                <Text style={styles.label}>Title *</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description *</Text>
                <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
              </View>
              <View style={styles.twoCol}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Cost Impact ($) *</Text>
                  <TextInput style={styles.input} value={costImpact} onChangeText={setCostImpact} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9CA3AF" />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Schedule (days)</Text>
                  <TextInput style={styles.input} value={scheduleDays} onChangeText={setScheduleDays} keyboardType="number-pad" placeholder="0" placeholderTextColor="#9CA3AF" />
                </View>
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
              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveCO} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Update</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 20, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 6 },
  headerStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerStatValue: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  headerStatDot: { fontSize: 13, color: "rgba(255,255,255,0.3)" },
  addCard: { backgroundColor: "white", borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E8E6E1", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  addCardHeader: { marginBottom: 20 },
  addTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  multiline: { height: 80, textAlignVertical: "top" },
  twoCol: { flexDirection: "row", gap: 12 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  reasonBtnActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  reasonBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  reasonBtnTextActive: { color: "white" },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  coCard: { backgroundColor: "white", borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  coTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  coNumberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  coNumber: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  coCost: { fontSize: 18, fontWeight: "700", color: "#F97316" },
  coTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  coDesc: { fontSize: 13, color: "#6B7280", lineHeight: 20, marginBottom: 10 },
  coMeta: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  coMetaPill: { backgroundColor: "#F3F4F6", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  coMetaText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  coActions: { flexDirection: "row", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  editBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 8, padding: 8, alignItems: "center" },
  editBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  deleteBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 8, padding: 8, alignItems: "center" },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
})