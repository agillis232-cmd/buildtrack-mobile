import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { parseDateOnly } from "@/lib/dates"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

export default function ProjectFinancialsScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [financials, setFinancials] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (token && id) loadFinancials()
  }, [token, id])

  async function loadFinancials() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/financials`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setFinancials(data.financials)
    } catch (e) {
      console.log("Error loading financials:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  async function markPaymentReceived(payment: any) {
    if (payment.status === "PAID") return
    Alert.alert(
      `Mark Payment ${payment.number} Received`,
      `$${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} — ${payment.description}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Received",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/mobile/payments/${payment.id}`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PAID", paidAmount: payment.amount, method: "CHECK" })
              })
              if (res.ok) {
                setFinancials((prev: any) => ({
                  ...prev,
                  paymentSchedule: prev.paymentSchedule.map((p: any) =>
                    p.id === payment.id ? { ...p, status: "PAID" } : p
                  ),
                  totalReceived: prev.totalReceived + payment.amount
                }))
              }
            } catch (e) {
              Alert.alert("Error", "Could not update payment")
            }
          }
        }
      ]
    )
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.tint} /></View>
  if (!financials) return <View style={styles.center}><Text style={styles.errorText}>Could not load financials</Text></View>

  const profitColor = financials.projectedProfit >= 0 ? "#16A34A" : "#DC2626"

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFinancials() }} tintColor={colors.tint} />}
    >
      <View style={styles.headerBanner}>
        <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Text style={styles.title}>Job Financials</Text>
        <View style={styles.profitRow}>
          <View style={styles.profitCard}>
            <Text style={styles.profitLabel}>Projected Profit</Text>
            <Text style={[styles.profitValue, { color: profitColor }]}>
              ${financials.projectedProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.profitMargin, { color: profitColor }]}>
              {financials.profitMargin.toFixed(1)}% margin
            </Text>
          </View>
          <View style={styles.profitCard}>
            <Text style={styles.profitLabel}>Revised Contract</Text>
            <Text style={styles.profitValue}>${financials.revisedContract.toLocaleString()}</Text>
            {financials.approvedCOs > 0 && (
              <Text style={styles.profitSub}>+${financials.approvedCOs.toLocaleString()} in COs</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contract</Text>
        <View style={styles.card}>
          <FinancialRow label="Original Contract" value={financials.contractValue} />
          <FinancialRow label="Approved Change Orders" value={financials.approvedCOs} positive />
          <FinancialRow label="Revised Contract Total" value={financials.revisedContract} bold />
        </View>
      </View>

      <View style={styles.section}>
      <Text style={styles.sectionTitle}>Receivables (Client Payments)</Text>
          <View style={styles.card}>
            <FinancialRow label="Invoiced" value={financials.invoicesSent} />
            <FinancialRow label="Invoice Payments" value={financials.invoicesReceived} positive />
            <FinancialRow label="Invoice Outstanding" value={financials.invoicesOutstanding} warning={financials.invoicesOutstanding > 0} />
            <View style={{ height: 1, backgroundColor: "#E8E6E1", marginVertical: 8 }} />
            <FinancialRow label="Draws Scheduled" value={financials.totalScheduled} />
            <FinancialRow label="Draws Received" value={financials.drawsReceived} positive />
            <View style={{ height: 1, backgroundColor: "#E8E6E1", marginVertical: 8 }} />
            <FinancialRow label="Total Received" value={financials.totalReceived} positive />
            <FinancialRow label="Remaining to Invoice" value={financials.remainingToInvoice} />
          </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses & Payables</Text>
        <View style={styles.card}>
          <FinancialRow label="Job Expenses" value={financials.totalExpenses} negative />
          <FinancialRow label="Vendor Invoices Total" value={financials.vendorInvoicesTotal} negative />
          <FinancialRow label="Vendor Invoices Paid" value={financials.vendorInvoicesPaid} />
          <FinancialRow label="Vendor Invoices Outstanding" value={financials.vendorInvoicesOutstanding} warning={financials.vendorInvoicesOutstanding > 0} />
        </View>
      </View>

      {financials.lienWaiversRequired > 0 && (
        <View style={styles.lienWarning}>
          <Text style={styles.lienWarningTitle}>⚠ Lien Waivers Needed</Text>
          <Text style={styles.lienWarningText}>{financials.lienWaiversRequired} vendor invoice{financials.lienWaiversRequired > 1 ? "s" : ""} require lien waivers that haven't been received yet.</Text>
          <TouchableOpacity onPress={() => router.push("/vendor-invoices" as any)}>
            <Text style={styles.lienWarningLink}>View Vendor Invoices →</Text>
          </TouchableOpacity>
        </View>
      )}

      {financials.paymentSchedule?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Schedule</Text>
          {financials.paymentSchedule.map((payment: any) => (
            <TouchableOpacity
              key={payment.id}
              style={[styles.paymentRow, payment.status === "PAID" && styles.paymentRowPaid]}
              onPress={() => markPaymentReceived(payment)}
              activeOpacity={payment.status === "PAID" ? 1 : 0.7}
            >
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentNumber}>Payment {payment.number}</Text>
                <Text style={styles.paymentDesc}>{payment.description}</Text>
                {payment.dueDate && (
                  <Text style={styles.paymentDate}>
                    Due: {parseDateOnly(payment.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                )}
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</Text>
                <View style={[styles.paymentStatus, { backgroundColor: payment.status === "PAID" ? "#DCFCE7" : "#FEF3C7" }]}>
                  <Text style={[styles.paymentStatusText, { color: payment.status === "PAID" ? "#16A34A" : "#D97706" }]}>
                    {payment.status === "PAID" ? "✓ RECEIVED" : "TAP TO MARK PAID"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.linkCard} onPress={() => router.push(`/project/${id}/expenses` as any)}>
          <Text style={styles.linkCardText}>View Expenses</Text>
          <Text style={styles.linkCardArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard} onPress={() => router.push("/vendor-invoices" as any)}>
          <Text style={styles.linkCardText}>Vendor Invoices</Text>
          <Text style={styles.linkCardArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard} onPress={() => router.push(`/project/${id}/change-orders` as any)}>
          <Text style={styles.linkCardText}>Change Orders</Text>
          <Text style={styles.linkCardArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function FinancialRow({ label, value, bold, positive, negative, warning }: {
  label: string
  value: number
  bold?: boolean
  positive?: boolean
  negative?: boolean
  warning?: boolean
}) {
  const color = warning ? "#D97706" : positive ? "#16A34A" : negative ? "#DC2626" : "#1A1A1A"
  return (
    <View style={[styles.row, bold && styles.rowBold]}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, { color }, bold && styles.rowValueBold]}>
        {negative ? "-" : positive ? "+" : ""}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: colors.textSecondary },
  headerBanner: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  backBtn: { marginBottom: 12 },
  backText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6, marginBottom: 16 },
  profitRow: { flexDirection: "row", gap: 10 },
  profitCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14 },
  profitLabel: { fontSize: 15, color: colors.textSecondary, marginBottom: 6 },
  profitValue: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 2 },
  profitMargin: { fontSize: 12, fontWeight: "600" },
  profitSub: { fontSize: 15, color: colors.textSecondary },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 },
  card: { backgroundColor: "white", borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.separator },
  rowBold: { backgroundColor: colors.fillSubtle, borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowLabelBold: { fontWeight: "700", color: colors.text },
  rowValue: { fontSize: 14, fontWeight: "600" },
  rowValueBold: { fontSize: 16, fontWeight: "700" },
  lienWarning: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: "#FDE68A" },
  lienWarningTitle: { fontSize: 14, fontWeight: "700", color: "#D97706", marginBottom: 4 },
  lienWarningText: { fontSize: 13, color: "#D97706", lineHeight: 20, marginBottom: 8 },
  lienWarningLink: { fontSize: 13, fontWeight: "700", color: "#D97706" },
  paymentRow: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  paymentRowPaid: { opacity: 0.7 },
  paymentLeft: { flex: 1 },
  paymentNumber: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 2 },
  paymentDesc: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 2 },
  paymentDate: { fontSize: 11, color: colors.textSecondary },
  paymentRight: { alignItems: "flex-end", gap: 4 },
  paymentAmount: { fontSize: 16, fontWeight: "700", color: colors.text },
  paymentStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  paymentStatusText: { fontSize: 11, fontWeight: "700" },
  linkCard: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  linkCardText: { fontSize: 14, fontWeight: "600", color: colors.text },
  linkCardArrow: { fontSize: 20, color: colors.chevron },
})