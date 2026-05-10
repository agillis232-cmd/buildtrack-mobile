import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native"
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

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    })

    if (result.canceled) return

    setScanning(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/scan-receipt`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          image: result.assets[0].base64,
          projectId: id
        })
      })
      const data = await res.json()
      console.log("Scan response:", JSON.stringify(data))  // ADD THIS
      if (data.expense) {
        router.push(`/project/${id}/add-expense?prefill=${encodeURIComponent(JSON.stringify(data.expense))}`)
      } else {
        router.push(`/project/${id}/add-expense`)
      }
    } catch (e) {
      console.log("Scan error:", e)  // ADD THIS
      Alert.alert("Error", "Could not scan receipt")
      router.push(`/project/${id}/add-expense`)
    }
    setScanning(false)
  }
  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Expenses</Text>

        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Scan a receipt or add manually</Text>
          </View>
        ) : (
          expenses.map(expense => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseTop}>
                <Text style={styles.expenseVendor}>{expense.vendor}</Text>
                <Text style={styles.expenseAmount}>${expense.amount.toLocaleString()}</Text>
              </View>
              <Text style={styles.expenseDesc}>{expense.description}</Text>
              <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={scanReceipt} disabled={scanning}>
          {scanning ? <ActivityIndicator color="white" /> : <Text style={styles.fabText}>📷 Scan Receipt</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fabBtn, styles.fabSecondary]} onPress={() => router.push(`/project/${id}/add-expense` as any)}>
          <Text style={styles.fabText}>+ Add Manual</Text>
        </TouchableOpacity>
      </View>
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
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  expenseCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  expenseTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  expenseVendor: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  expenseAmount: { fontSize: 15, fontWeight: "700", color: "#F97316" },
  expenseDesc: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  expenseDate: { fontSize: 11, color: "#9CA3AF" },
  fab: { position: "absolute", bottom: 30, left: 20, right: 20, gap: 10 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabSecondary: { backgroundColor: "#1C1F26" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})