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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <Text style={styles.pageTitle}>Expenses</Text>
          <Text style={styles.totalAmount}>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.totalSub}>{expenses.length} expenses across all projects</Text>
        </View>

        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Add expenses from within a project</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {expenses.map(expense => (
              <TouchableOpacity
                key={expense.id}
                style={styles.expenseCard}
                onPress={() => router.push(`/project/${expense.projectId}/expenses` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.expenseLeft}>
                  <View style={styles.expenseIconBox}>
                    <View style={styles.expenseIconDot} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseVendor}>{expense.vendor}</Text>
                    <Text style={styles.expenseDesc} numberOfLines={1}>{expense.description || expense.project?.name || ""}</Text>
                    <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
                  </View>
                </View>
                <Text style={styles.expenseAmount}>${expense.amount.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 28, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  pageTitle: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  totalAmount: { fontSize: 40, fontWeight: "700", color: "white", letterSpacing: -1, marginBottom: 4 },
  totalSub: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  list: { paddingHorizontal: 16, gap: 8 },
  expenseCard: { backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#E8E6E1", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  expenseLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
  expenseIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF7ED", justifyContent: "center", alignItems: "center" },
  expenseIconDot: { width: 14, height: 14, borderRadius: 4, backgroundColor: "#F97316" },
  expenseVendor: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  expenseDesc: { fontSize: 12, color: "#9CA3AF", marginBottom: 2 },
  expenseDate: { fontSize: 11, color: "#9CA3AF" },
  expenseAmount: { fontSize: 16, fontWeight: "700", color: "#F97316" },
})