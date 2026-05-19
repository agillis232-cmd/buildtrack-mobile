import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, TextInput } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  UNPAID: "#DC2626",
  PARTIAL: "#D97706",
  PAID: "#16A34A",
}

const PAYMENT_METHODS = ["CHECK", "ACH", "WIRE", "CASH", "CREDIT CARD"]

export default function VendorInvoicesScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<"ALL" | "UNPAID" | "PARTIAL" | "PAID">("UNPAID")

  // Add form
  const [vendorName, setVendorName] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [projectId, setProjectId] = useState("")
  const [notes, setNotes] = useState("")
  const [lienWaiverRequired, setLienWaiverRequired] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  // Pay form
  const [paidAmount, setPaidAmount] = useState("")
  const [payMethod, setPayMethod] = useState("CHECK")
  const [payNotes, setPayNotes] = useState("")
  const [lienWaiverReceived, setLienWaiverReceived] = useState(false)

  useEffect(() => {
    if (token) {
      loadInvoices()
      loadProjects()
    }
  }, [token])

  async function loadInvoices() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/vendor-invoices`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setInvoices(data.vendorInvoices || [])
    } catch (e) {
      console.log("Error loading vendor invoices:", e)
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

  async function addInvoice() {
    if (!vendorName || !amount) {
      Alert.alert("Error", "Vendor name and amount are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/vendor-invoices`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ vendorName, invoiceNumber, amount, dueDate: dueDate || null, projectId: projectId || null, notes, lienWaiverRequired })
      })
      const data = await res.json()
      if (data.vendorInvoice) {
        setInvoices(prev => [data.vendorInvoice, ...prev])
        resetAddForm()
        setShowAddModal(false)
      } else {
        Alert.alert("Error", "Could not add invoice")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function markPaid(invoice: any) {
    setSaving(true)
    try {
      const paid = parseFloat(paidAmount) || invoice.amount
      const newStatus = paid >= invoice.amount ? "PAID" : "PARTIAL"
      const res = await fetch(`${API_URL}/api/mobile/vendor-invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          paidAmount: paid,
          method: payMethod,
          notes: payNotes,
          lienWaiverReceived
        })
      })
      const data = await res.json()
      if (data.vendorInvoice) {
        setInvoices(prev => prev.map(i => i.id === invoice.id ? data.vendorInvoice : i))
        setShowPayModal(null)
        resetPayForm()
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function deleteInvoice(id: string) {
    Alert.alert("Delete Invoice", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/mobile/vendor-invoices/${id}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            setInvoices(prev => prev.filter(i => i.id !== id))
          } catch (e) {
            Alert.alert("Error", "Could not delete invoice")
          }
        }
      }
    ])
  }

  function resetAddForm() {
    setVendorName("")
    setInvoiceNumber("")
    setAmount("")
    setDueDate("")
    setProjectId("")
    setNotes("")
    setLienWaiverRequired(false)
  }

  function resetPayForm() {
    setPaidAmount("")
    setPayMethod("CHECK")
    setPayNotes("")
    setLienWaiverReceived(false)
  }

  const filtered = invoices.filter(i => filter === "ALL" ? true : i.status === filter)
  const totalUnpaid = invoices.filter(i => i.status !== "PAID").reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0)
  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0)

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
          <Text style={styles.title}>Vendor Invoices</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>${totalUnpaid.toLocaleString()}</Text>
              <Text style={styles.headerStatLabel}>Outstanding</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>${totalPaid.toLocaleString()}</Text>
              <Text style={styles.headerStatLabel}>Paid</Text>
            </View>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(["UNPAID", "PARTIAL", "PAID", "ALL"] as const).map(f => (
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
            <Text style={styles.emptyTitle}>No {filter.toLowerCase()} invoices</Text>
            <Text style={styles.emptySub}>Tap + Add to log a vendor invoice</Text>
          </View>
        ) : (
          filtered.map(invoice => (
            <View key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceTop}>
                <View style={styles.invoiceLeft}>
                  <Text style={styles.vendorName}>{invoice.vendorName}</Text>
                  {invoice.invoiceNumber && <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>}
                  {invoice.project && <Text style={styles.projectName}>{invoice.project.name}</Text>}
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>${invoice.amount.toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[invoice.status] + "20" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[invoice.status] }]}>{invoice.status}</Text>
                  </View>
                </View>
              </View>

              {invoice.dueDate && (
                <Text style={[styles.dueDate, new Date(invoice.dueDate) < new Date() && invoice.status !== "PAID" && styles.overdue]}>
                  Due: {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {new Date(invoice.dueDate) < new Date() && invoice.status !== "PAID" ? " — OVERDUE" : ""}
                </Text>
              )}

              {invoice.lienWaiverRequired && (
                <View style={[styles.lienBadge, invoice.lienWaiverReceived && styles.lienBadgeReceived]}>
                  <Text style={[styles.lienText, invoice.lienWaiverReceived && styles.lienTextReceived]}>
                    {invoice.lienWaiverReceived ? "✓ Lien Waiver Received" : "⚠ Lien Waiver Required"}
                  </Text>
                </View>
              )}

              <View style={styles.invoiceActions}>
                {invoice.status !== "PAID" && (
                  <TouchableOpacity style={styles.payBtn} onPress={() => { setShowPayModal(invoice); setPaidAmount(invoice.amount.toString()) }}>
                    <Text style={styles.payBtnText}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteInvoice(invoice.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.fabText}>+ Add Invoice</Text>
        </TouchableOpacity>
      </View>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Vendor Invoice</Text>
            <ScrollView>
              <View style={styles.field}>
                <Text style={styles.label}>Vendor Name *</Text>
                <TextInput style={styles.input} value={vendorName} onChangeText={setVendorName} placeholder="Acme Plumbing" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Invoice Number</Text>
                <TextInput style={styles.input} value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="INV-001" placeholderTextColor="#9CA3AF" />
              </View>
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
                <TextInput style={[styles.input, { height: 60, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} placeholder="Optional notes..." placeholderTextColor="#9CA3AF" multiline />
              </View>
              <TouchableOpacity
                style={[styles.toggleRow, lienWaiverRequired && styles.toggleRowActive]}
                onPress={() => setLienWaiverRequired(!lienWaiverRequired)}
              >
                <Text style={[styles.toggleText, lienWaiverRequired && styles.toggleTextActive]}>
                  {lienWaiverRequired ? "✓ Lien Waiver Required" : "Lien Waiver Required?"}
                </Text>
              </TouchableOpacity>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); resetAddForm() }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={addInvoice} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Add Invoice</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pay Modal */}
      <Modal visible={!!showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark as Paid</Text>
            <Text style={styles.modalSub}>{showPayModal?.vendorName} — ${showPayModal?.amount?.toLocaleString()}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Amount Paid</Text>
              <TextInput style={styles.input} value={paidAmount} onChangeText={setPaidAmount} keyboardType="decimal-pad" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, payMethod === m && styles.methodBtnActive]}
                      onPress={() => setPayMethod(m)}
                    >
                      <Text style={[styles.methodBtnText, payMethod === m && styles.methodBtnTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.input} value={payNotes} onChangeText={setPayNotes} placeholder="Check #, reference..." placeholderTextColor="#9CA3AF" />
            </View>
            {showPayModal?.lienWaiverRequired && (
              <TouchableOpacity
                style={[styles.toggleRow, lienWaiverReceived && styles.toggleRowActive]}
                onPress={() => setLienWaiverReceived(!lienWaiverReceived)}
              >
                <Text style={[styles.toggleText, lienWaiverReceived && styles.toggleTextActive]}>
                  {lienWaiverReceived ? "✓ Lien Waiver Received" : "Mark Lien Waiver Received"}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowPayModal(null); resetPayForm() }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => markPaid(showPayModal)} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Picker */}
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
  invoiceTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  invoiceLeft: { flex: 1 },
  vendorName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  invoiceNumber: { fontSize: 12, color: "#9CA3AF", marginBottom: 2 },
  projectName: { fontSize: 12, color: "#F97316", fontWeight: "600" },
  invoiceRight: { alignItems: "flex-end", gap: 4 },
  invoiceAmount: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  dueDate: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  overdue: { color: "#DC2626", fontWeight: "700" },
  lienBadge: { backgroundColor: "#FEF3C7", borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: "#FDE68A" },
  lienBadgeReceived: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  lienText: { fontSize: 12, color: "#D97706", fontWeight: "600" },
  lienTextReceived: { color: "#16A34A" },
  invoiceActions: { flexDirection: "row", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  payBtn: { flex: 2, backgroundColor: "#DCFCE7", borderRadius: 8, padding: 8, alignItems: "center" },
  payBtnText: { fontSize: 13, fontWeight: "700", color: "#16A34A" },
  deleteBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 8, padding: 8, alignItems: "center" },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#9CA3AF", marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  selectBtn: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E8E6E1", flexDirection: "row", justifyContent: "space-between" },
  selectBtnText: { fontSize: 15, color: "#1A1A1A" },
  arrow: { fontSize: 18, color: "#9CA3AF" },
  toggleRow: { padding: 12, borderRadius: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 14, alignItems: "center" },
  toggleRowActive: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  toggleText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  toggleTextActive: { color: "#16A34A" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  methodBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  methodBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  methodBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  methodBtnTextActive: { color: "white" },
  projOption: { padding: 14, borderRadius: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 8 },
  projOptionActive: { backgroundColor: "#FFF7ED", borderColor: "#F97316" },
  projOptionText: { fontSize: 14, color: "#1A1A1A", fontWeight: "500" },
})