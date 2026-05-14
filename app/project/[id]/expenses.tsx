import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"

export default function ExpensesScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const [vendor, setVendor] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")

  useEffect(() => {
    if (token && id) loadExpenses()
  }, [token, id])

  async function loadExpenses() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/expenses`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setExpenses(data.expenses || [])
    } catch (e) {
      console.log("Error loading expenses:", e)
    }
    setLoading(false)
  }

  async function scanReceipt() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera access is required to scan receipts")
      return
    }

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled) return

    setScanning(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/scan-receipt`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ image: result.assets[0].base64, projectId: id })
      })
      const data = await res.json()
      if (data.expense) {
        router.push(`/project/${id}/add-expense?prefill=${encodeURIComponent(JSON.stringify(data.expense))}` as any)
      } else {
        router.push(`/project/${id}/add-expense` as any)
      }
    } catch (e) {
      router.push(`/project/${id}/add-expense` as any)
    }
    setScanning(false)
  }

  function openEdit(expense: any) {
    setEditingExpense(expense)
    setVendor(expense.vendor)
    setDescription(expense.description || "")
    setAmount(expense.amount.toString())
    setDate(new Date(expense.date).toISOString().split("T")[0])
  }

  function closeEdit() {
    setEditingExpense(null)
    setVendor("")
    setDescription("")
    setAmount("")
    setDate("")
  }

  async function saveEdit() {
    if (!vendor || !amount) {
      Alert.alert("Error", "Vendor and amount are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/expenses/${editingExpense.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ vendor, description, amount: parseFloat(amount), date })
      })
      const data = await res.json()
      if (data.expense) {
        setExpenses(prev => prev.map(e => e.id === data.expense.id ? data.expense : e))
        closeEdit()
      } else {
        Alert.alert("Error", "Could not update expense")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function deleteExpense(expenseId: string) {
    Alert.alert("Delete Expense", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/mobile/projects/${id}/expenses/${expenseId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
              setExpenses(prev => prev.filter(e => e.id !== expenseId))
            } else {
              Alert.alert("Error", "Could not delete expense")
            }
          } catch (e) {
            Alert.alert("Error", "Connection error")
          }
        }
      }
    ])
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Expenses</Text>

        {expenses.length > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text>
          </View>
        )}

        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Scan a receipt or add manually</Text>
          </View>
        ) : (
          expenses.map(expense => (
            <TouchableOpacity
              key={expense.id}
              style={styles.expenseCard}
              onPress={() => openEdit(expense)}
              activeOpacity={0.8}
            >
              <View style={styles.expenseTop}>
                <Text style={styles.expenseVendor}>{expense.vendor}</Text>
                <Text style={styles.expenseAmount}>${expense.amount.toLocaleString()}</Text>
              </View>
              <Text style={styles.expenseDesc}>{expense.description}</Text>
              <View style={styles.expenseBottom}>
                <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
                <TouchableOpacity onPress={() => deleteExpense(expense.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={scanReceipt} disabled={scanning}>
          {scanning ? <ActivityIndicator color="white" /> : <Text style={styles.fabText}>Scan Receipt</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fabBtn, styles.fabSecondary]} onPress={() => router.push(`/project/${id}/add-expense` as any)}>
          <Text style={styles.fabText}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={!!editingExpense} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Expense</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Vendor *</Text>
              <TextInput style={styles.input} value={vendor} onChangeText={setVendor} placeholder="Home Depot" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Lumber, screws..." placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 160, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 20 },
  backText: { color: "#F97316", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },
  totalCard: { backgroundColor: "#1C1F26", borderRadius: 12, padding: 16, marginBottom: 16 },
  totalLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: "700", color: "white" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  expenseCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  expenseTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  expenseVendor: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  expenseAmount: { fontSize: 15, fontWeight: "700", color: "#F97316" },
  expenseDesc: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  expenseBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  expenseDate: { fontSize: 11, color: "#9CA3AF" },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#FEE2E2", borderRadius: 6 },
  deleteBtnText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  fab: { position: "absolute", bottom: 30, left: 20, right: 20, gap: 10 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabSecondary: { backgroundColor: "#1C1F26" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
})