import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, TextInput } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6B7280",
  SENT: "#3B82F6",
  PARTIAL: "#D97706",
  PAID: "#16A34A",
  OVERDUE: "#DC2626",
}

export default function InvoicesScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "SENT" | "PAID">("ALL")
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  // Add form
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [projectId, setProjectId] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (token) {
      loadInvoices()
      loadProjects()
    }
  }, [token])

  async function loadInvoices() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/invoices`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch (e) {
      console.log("Error loading invoices:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

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
  }

  async function createInvoice() {
    if (!amount) {
      Alert.alert("Error", "Amount is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/invoices`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, dueDate: dueDate || null, projectId: projectId || null, notes })
      })
      const data = await res.json()
      if (data.invoice) {
        setInvoices(prev => [data.invoice, ...prev])
        setShowAddModal(false)
        resetForm()
      } else {
        Alert.alert("Error", "Could not create invoice")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function updateStatus(invoiceId: string, status: string, paidAmount?: number) {
    try {
      const res = await fetch(`${API_URL}/api/mobile/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(paidAmount !== undefined ? { paidAmount } : {}) })
      })
      const data = await res.json()
      if (data.invoice) {
        setInvoices(prev => prev.map(i => i.id === invoiceId ? data.invoice : i))
      }
    } catch (e) {
      Alert.alert("Error", "Could not update invoice")
    }
  }

  async function deleteInvoice(id: string) {
    Alert.alert("Delete Invoice", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/mobile/invoices/${id}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            setInvoices(prev => prev.filter(i => i.id !== id))
          } catch (e) {
            Alert.alert("Error", "Could not delete")
          }
        }
      }
    ])
  }

  function resetForm() {
    setAmount("")
    setDueDate("")
    setProjectId("")
    setNotes("")
  }

  function isOverdue(invoice: any) {
    return invoice.status === "SENT" && invoice.dueDate && new Date(invoice.dueDate) < new Date()
  }

  const filtered = invoices.filter(i => filter === "ALL" ? true : i.status === filter)
  const totalOutstanding = invoices.filter(i => i.status !== "PAID").reduce((sum, i) => sum + (i.amount || 0), 0)
  const totalReceived = invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + (i.amount || 0), 0)

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInvoices() }} tintColor="#F97316" />}
      >
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Invoices</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>${totalOutstanding.toLocaleString()}</Text>
              <Text style={styles.headerStatLabel}>Outstanding</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>${totalReceived.toLocaleString()}</Text>
              <Text style={styles.headerStatLabel}>Received</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(["ALL", "DRAFT", "SENT", "PAID"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptySub}>Tap + New to create your first invoice</Text>
          </View>
        ) : (
          filtered.map(invoice => (
            <View key={invoice.id} style={[styles.invoiceCard, isOverdue(invoice) && styles.invoiceCardOverdue]}>
              <View style={styles.invoiceTop}>
                <View style={styles.invoiceLeft}>
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                  {invoice.project && <Text style={styles.projectName}>{invoice.project.name}</Text>}
                  {invoice.dueDate && (
                    <Text style={[styles.dueDate, isOverdue(invoice) && styles.overdue]}>
                      Due: {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {isOverdue(invoice) ? " — OVERDUE" : ""}
                    </Text>
                  )}
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>${(invoice.amount || 0).toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[isOverdue(invoice) ? "OVERDUE" : invoice.status] + "20" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[isOverdue(invoice) ? "OVERDUE" : invoice.status] }]}>
                      {isOverdue(invoice) ? "OVERDUE" : invoice.status}
                    </Text>
                  </View>
                </View>
              </View>

              {invoice.notes && <Text style={styles.invoiceNotes}>{invoice.notes}</Text>}

              <View style={styles.invoiceActions}>
                {invoice.status === "DRAFT" && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(invoice.id, "SENT")}>
                    <Text style={styles.actionBtnText}>Mark Sent</Text>
                  </TouchableOpacity>
                )}
                {(invoice.status === "SENT" || isOverdue(invoice)) && (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => {
                    Alert.alert("Mark as Paid", `Mark ${invoice.invoiceNumber} as paid?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Mark Paid", onPress: () => updateStatus(invoice.id, "PAID", invoice.amount) }
                    ])
                  }}>
                    <Text style={[styles.actionBtnText, { color: "#16A34A" }]}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={() => deleteInvoice(invoice.id)}>
                  <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.fabText}>+ New Invoice</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Invoice</Text>
            <ScrollView>
              <View style={styles.field}>
                <Text style={styles.label}>Amount *</Text>
                <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Due Date</Text>
                <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Link to Project</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setShowProjectPicker(true)}>
                  <Text style={[styles.selectBtnText, !projectId && { color: "#9CA3AF" }]}>
                    {projectId ? projects.find(p => p.id === projectId)?.name || "Select..." : "Select project..."}
                  </Text>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Notes</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} placeholder="Payment 2 of 6, etc..." placeholderTextColor="#9CA3AF" multiline />
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); resetForm() }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={createInvoice} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Create Invoice</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showProjectPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Project</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity style={styles.projOption} onPress={() => { setProjectId(""); setShowProjectPicker(false) }}>
                <Text style={styles.projOptionText}>None</Text>
              </TouchableOpacity>
              {projects.map(p => (
                <TouchableOpacity key={p.id} style={[styles.projOption, projectId === p.id && styles.projOptionActive]} onPress={() => { setProjectId(p.id); setShowProjectPicker(false) }}>
                  <Text style={[styles.projOptionText, projectId === p.id && { color: "#F97316", fontWeight: "700" }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProjectPicker(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
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
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 16, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 16 },
  headerStats: { flexDirection: "row", gap: 20 },
  headerStat: { alignItems: "center" },
  headerStatValue: { fontSize: 20, fontWeight: "700", color: "white", marginBottom: 2 },
  headerStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" },
  headerStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 99, backgroundColor: "white", borderWidth: 1, borderColor: "#E8E6E1", alignItems: "center" },
  filterBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  filterText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  filterTextActive: { color: "white" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  invoiceCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  invoiceCardOverdue: { borderColor: "#FECACA", backgroundColor: "#FFF5F5" },
  invoiceTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  invoiceLeft: { flex: 1 },
  invoiceNumber: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  projectName: { fontSize: 12, color: "#F97316", fontWeight: "600", marginBottom: 2 },
  dueDate: { fontSize: 12, color: "#6B7280" },
  overdue: { color: "#DC2626", fontWeight: "700" },
  invoiceRight: { alignItems: "flex-end", gap: 4 },
  invoiceAmount: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  invoiceNotes: { fontSize: 12, color: "#6B7280", marginBottom: 8, fontStyle: "italic" },
  invoiceActions: { flexDirection: "row", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  actionBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 8, padding: 8, alignItems: "center" },
  actionBtnGreen: { backgroundColor: "#DCFCE7" },
  actionBtnRed: { backgroundColor: "#FEE2E2" },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  selectBtn: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E8E6E1", flexDirection: "row", justifyContent: "space-between" },
  selectBtnText: { fontSize: 15, color: "#1A1A1A" },
  arrow: { fontSize: 18, color: "#9CA3AF" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  projOption: { padding: 14, borderRadius: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 8 },
  projOptionActive: { backgroundColor: "#FFF7ED", borderColor: "#F97316" },
  projOptionText: { fontSize: 14, color: "#1A1A1A", fontWeight: "500" },
})