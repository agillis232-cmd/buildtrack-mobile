import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

export default function CompanyFinancialsScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (token) loadFinancials()
  }, [token])

  async function loadFinancials() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/financials`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const d = await res.json()
      setData(d)
    } catch (e) {
      console.log("Error loading financials:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>
  if (!data) return <View style={styles.center}><Text style={styles.errorText}>Could not load financials</Text></View>

  const { summary, projects } = data
  const profitColor = summary.totalProfit >= 0 ? "#16A34A" : "#DC2626"

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFinancials() }} tintColor="#F97316" />}
    >
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Company Financials</Text>
        <Text style={styles.subtitle}>{summary.activeProjects} active · {summary.totalProjects} total projects</Text>
      </View>

      {/* Top KPIs */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Contracted</Text>
          <Text style={styles.kpiValue}>${(summary.totalContracted / 1000).toFixed(0)}k</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Received</Text>
          <Text style={[styles.kpiValue, { color: "#16A34A" }]}>${(summary.totalReceived / 1000).toFixed(0)}k</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Projected Profit</Text>
          <Text style={[styles.kpiValue, { color: profitColor }]}>${(summary.totalProfit / 1000).toFixed(0)}k</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Avg Margin</Text>
          <Text style={[styles.kpiValue, { color: profitColor }]}>{summary.avgMargin.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Alerts */}
      {(summary.outstandingVendorCount > 0 || summary.lienWaiversNeeded > 0) && (
        <View style={styles.alertsSection}>
          {summary.outstandingVendorAmount > 0 && (
            <TouchableOpacity style={styles.alertCard} onPress={() => router.push("/vendor-invoices" as any)}>
              <Text style={styles.alertTitle}>${summary.outstandingVendorAmount.toLocaleString()} in unpaid vendor invoices</Text>
              <Text style={styles.alertSub}>{summary.outstandingVendorCount} invoice{summary.outstandingVendorCount > 1 ? "s" : ""} outstanding →</Text>
            </TouchableOpacity>
          )}
          {summary.lienWaiversNeeded > 0 && (
            <TouchableOpacity style={[styles.alertCard, styles.alertCardWarning]} onPress={() => router.push("/vendor-invoices" as any)}>
              <Text style={styles.alertTitle}>⚠ {summary.lienWaiversNeeded} lien waiver{summary.lienWaiversNeeded > 1 ? "s" : ""} needed</Text>
              <Text style={styles.alertSub}>View vendor invoices →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Company totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Summary</Text>
        <View style={styles.card}>
          <FinRow label="Total Contracted" value={summary.totalContracted} />
          <FinRow label="Total Expenses" value={summary.totalExpenses} negative />
          <FinRow label="Vendor Invoices" value={summary.totalVendor} negative />
          <FinRow label="Projected Profit" value={summary.totalProfit} bold profit={summary.totalProfit >= 0} />
        </View>
      </View>

      {/* Per project breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Project</Text>
        {projects.map((project: any) => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            onPress={() => router.push(`/project-financials/${project.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.projectTop}>
              <Text style={styles.projectName}>{project.name}</Text>
              <View style={[styles.statusPill, { backgroundColor: project.status === "ACTIVE" ? "#DCFCE7" : project.status === "COMPLETED" ? "#DBEAFE" : "#F3F4F6" }]}>
                <Text style={[styles.statusPillText, { color: project.status === "ACTIVE" ? "#16A34A" : project.status === "COMPLETED" ? "#3B82F6" : "#6B7280" }]}>
                  {project.status}
                </Text>
              </View>
            </View>
            <View style={styles.projectStats}>
              <View style={styles.projectStat}>
                <Text style={styles.projectStatLabel}>Contract</Text>
                <Text style={styles.projectStatValue}>${(project.revisedContract / 1000).toFixed(0)}k</Text>
              </View>
              <View style={styles.projectStat}>
                <Text style={styles.projectStatLabel}>Expenses</Text>
                <Text style={[styles.projectStatValue, { color: "#DC2626" }]}>${(project.totalExpenses / 1000).toFixed(0)}k</Text>
              </View>
              <View style={styles.projectStat}>
                <Text style={styles.projectStatLabel}>Profit</Text>
                <Text style={[styles.projectStatValue, { color: project.projectedProfit >= 0 ? "#16A34A" : "#DC2626" }]}>
                  ${(project.projectedProfit / 1000).toFixed(0)}k
                </Text>
              </View>
              <View style={styles.projectStat}>
                <Text style={styles.projectStatLabel}>Margin</Text>
                <Text style={[styles.projectStatValue, { color: project.profitMargin >= 0 ? "#16A34A" : "#DC2626" }]}>
                  {project.profitMargin.toFixed(0)}%
                </Text>
              </View>
            </View>
            <Text style={styles.projectArrow}>View details →</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

function FinRow({ label, value, bold, negative, profit }: {
  label: string
  value: number
  bold?: boolean
  negative?: boolean
  profit?: boolean
}) {
  const color = bold ? (profit ? "#16A34A" : "#DC2626") : negative ? "#DC2626" : "#1A1A1A"
  return (
    <View style={[styles.row, bold && styles.rowBold]}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, { color }, bold && styles.rowValueBold]}>
        {negative ? "-" : ""}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#6B7280" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  kpiCard: { width: "47%", backgroundColor: "#1C1F26", borderRadius: 14, padding: 14 },
  kpiLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: "700", color: "white" },
  alertsSection: { paddingHorizontal: 16, marginBottom: 20, gap: 8 },
  alertCard: { backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FECACA" },
  alertCardWarning: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  alertTitle: { fontSize: 14, fontWeight: "700", color: "#DC2626", marginBottom: 2 },
  alertSub: { fontSize: 12, color: "#DC2626" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  card: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowBold: { backgroundColor: "#F9FAFB", borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowLabelBold: { fontWeight: "700", color: "#1A1A1A" },
  rowValue: { fontSize: 14, fontWeight: "600" },
  rowValueBold: { fontSize: 16, fontWeight: "700" },
  projectCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
 statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  projectName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  projectStats: { flexDirection: "row", marginBottom: 10 },
  projectStat: { flex: 1, alignItems: "center" },
  projectStatLabel: { fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 },
  projectStatValue: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  projectArrow: { fontSize: 12, color: "#F97316", fontWeight: "600" },
})