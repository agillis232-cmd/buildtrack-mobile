import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

export default function ExpensesScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) loadExpenses()
  }, [token])

  async function loadExpenses() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/expenses`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setExpenses(data.expenses || [])
    } catch (e) {
      console.log("Error loading expenses:", e)
    }
    setLoading(false)
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>All Expenses</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Spent</Text>
        <Text style={styles.totalValue}>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.totalSub}>{expenses.length} expenses across all projects</Text>
      </View>

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
            onPress={() => router.push(`/project/${expense.projectId}/expenses` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.expenseTop}>
              <Text style={styles.expenseVendor}>{expense.vendor}</Text>
              <Text style={styles.expenseAmount}>${expense.amount.toLocaleString()}</Text>
            </View>
            <Text style={styles.expenseDesc}>{expense.description}</Text>
            <View style={styles.expenseBottom}>
              <Text style={styles.expenseProject}>{expense.project?.name || "Unknown project"}</Text>
              <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 60, paddingTop: 70 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
  totalCard: { backgroundColor: "#1C1F26", borderRadius: 16, padding: 20, marginBottom: 24 },
  totalLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  totalValue: { fontSize: 36, fontWeight: "700", color: "white", letterSpacing: -1, marginBottom: 4 },
  totalSub: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  expenseCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  expenseTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  expenseVendor: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  expenseAmount: { fontSize: 15, fontWeight: "700", color: "#F97316" },
  expenseDesc: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  expenseBottom: { flexDirection: "row", justifyContent: "space-between" },
  expenseProject: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  expenseDate: { fontSize: 11, color: "#9CA3AF" },
})