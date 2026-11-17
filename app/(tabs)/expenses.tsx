import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter, useFocusEffect } from "expo-router"
import { API_URL } from "@/lib/api"
import { parseDateOnly } from "@/lib/dates"
import { Screen, ScreenHeader, CircleButton, Card, EmptyState } from "@/components/ui"
import { colors, type, humanize } from "@/lib/theme"
import { loadCached } from "@/lib/cache"

export default function ExpensesScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Refresh whenever this tab comes back into view. The saved copy shows instantly in the meantime.
  useFocusEffect(useCallback(() => {
    if (token) loadExpenses()
  }, [token]))

  async function loadExpenses() {
    try {
      await loadCached("/api/mobile/expenses", token, data => {
        setExpenses(data.expenses || [])
        setLoading(false)
      })
    } catch (e) {
      console.log("Error loading expenses:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>

  return (
    <Screen
      tabBar
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExpenses() }} tintColor={colors.accent} />}
    >
      <ScreenHeader title="Expenses" subtitle={`${expenses.length} expense${expenses.length === 1 ? "" : "s"} across all projects`} />

      <Card style={styles.totalCard}>
        <Text style={type.subhead}>Total</Text>
        <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>
          ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </Card>

      {expenses.length === 0 ? (
        <EmptyState icon="wallet-outline" title="No expenses yet" subtitle="Add expenses from inside a project, or scan a receipt with Quick Add." />
      ) : (
        <Card>
          {expenses.map((expense, index) => (
            <Pressable
              key={expense.id}
              onPress={() => router.push(`/project/${expense.projectId}/expenses` as any)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, index > 0 && styles.rowDivider, pressed && { backgroundColor: colors.fillSubtle }]}
            >
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={type.headline} numberOfLines={1}>{expense.vendor || "Expense"}</Text>
                <Text style={type.footnote} numberOfLines={1}>
                  {[
                    parseDateOnly(expense.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                    expense.project?.name,
                    expense.description,
                  ].filter(Boolean).join(" · ")}
                </Text>
              </View>
              <Text style={styles.amount}>${Number(expense.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  totalCard: { padding: 16, gap: 2 },
  totalAmount: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.6, color: colors.text },
  row: { minHeight: 60, paddingVertical: 10, paddingLeft: 16, paddingRight: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  amount: { fontSize: 17, fontWeight: "600", color: colors.text },
})
