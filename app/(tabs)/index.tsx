import { useState, useEffect, useCallback } from "react"
import { View, Text, Pressable, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Image, Modal } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Ionicons } from "@expo/vector-icons"
import { Screen, ScreenHeader, StatStrip, ListGroup, ListRow, SectionHeader, Card, Chip, ProgressBar, EmptyState } from "@/components/ui"
import { colors, type, humanize } from "@/lib/theme"
import { loadCached } from "@/lib/cache"

export default function DashboardScreen() {
  const { user, signOut, token } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [selectedKPIs, setSelectedKPIs] = useState(
    user?.role === "FIELD_WORKER"
      ? ["active", "completion"]
      : ["active", "contracted", "completion"]
  )

  useEffect(() => { loadKPIPreferences() }, [])

  async function loadKPIPreferences() {
    try {
      const saved = await AsyncStorage.getItem("dashboard_kpis")
      if (saved) setSelectedKPIs(JSON.parse(saved))
    } catch (e) { console.log("Error loading KPI prefs:", e) }
  }

  async function saveKPIPreferences(kpis: string[]) {
    try {
      await AsyncStorage.setItem("dashboard_kpis", JSON.stringify(kpis))
    } catch (e) { console.log("Error saving KPI prefs:", e) }
  }

  const ALL_KPI_OPTIONS = [
    { key: "active", label: "Active projects", description: "Number of active projects", color: "white" },
    ...(user?.role !== "FIELD_WORKER" ? [
      { key: "contracted", label: "Contracted", description: "Sum of all contract values", color: "#F97316" },
    ] : []),
    { key: "completion", label: "Avg complete", description: "Average completion across projects", color: "#16A34A" },
    { key: "preconstruction", label: "Pre-construction", description: "Projects in pre-construction", color: "#3B82F6" },
    { key: "totalLogs", label: "Daily logs", description: "Daily logs across all projects", color: "#8B5CF6" },
    { key: "totalCOs", label: "Change orders", description: "Total change orders", color: "#F97316" },
    { key: "overdue", label: "Overdue", description: "Projects past their end date", color: "#DC2626" },
  ]

  const getKPIValue = (key: string) => {
    switch (key) {
      case "active": return projects.filter(p => p.status === "ACTIVE").length.toString()
      case "contracted": return `$${(projects.reduce((sum, p) => sum + p.contractValue, 0) / 1000).toFixed(0)}k`
      case "completion": return `${projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.completionPct, 0) / projects.length) : 0}%`
      case "preconstruction": return projects.filter(p => p.status === "PRE_CONSTRUCTION").length.toString()
      case "totalLogs": return projects.reduce((sum, p) => sum + (p._count?.dailyLogs || 0), 0).toString()
      case "totalCOs": return projects.reduce((sum, p) => sum + (p._count?.changeOrders || 0), 0).toString()
      case "overdue": return projects.filter(p => p.endDate && new Date(p.endDate) < new Date() && p.status === "ACTIVE").length.toString()
      default: return "0"
    }
  }

  const kpiTiles = selectedKPIs.slice(0, 3).map(key => {
    const option = ALL_KPI_OPTIONS.find(o => o.key === key)!
    return { key, label: option.label, value: getKPIValue(key), color: option.color }
  })

  // Refresh whenever this tab comes back into view. The saved copy shows instantly in the meantime.
  useFocusEffect(useCallback(() => {
    if (token) { loadProjects() } else { setLoading(false) }
  }, [token]))

  async function loadProjects() {
    try {
      await loadCached("/api/mobile/projects", token, data => {
        setProjects(data.projects || [])
        setLoading(false)
      })
    } catch (e) { console.log("Error loading projects:", e) }
    setLoading(false)
    setRefreshing(false)
  }

  function onRefresh() { setRefreshing(true); loadProjects() }

  const firstName = user?.name?.split(" ")[0] || "there"
  const hour = new Date().getHours()
  const greeting = hour < 11 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  const isManager = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?"

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <Screen
      tabBar
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <ScreenHeader
        eyebrow={`${greeting},`}
        title={firstName}
        trailing={
          <Pressable
            onPress={() => router.push("/profile" as any)}
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </Pressable>
        }
      />

      {/* Assistant */}
      <Pressable
        onPress={() => router.push("/assistant")}
        accessibilityRole="button"
        accessibilityLabel="Ask the assistant or jot a task"
        style={({ pressed }) => [styles.askField, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="sparkles-outline" size={20} color={colors.tint} />
        <Text style={styles.askFieldText} numberOfLines={1}>Ask the assistant or jot a task</Text>
      </Pressable>

      {/* Headline numbers. Tap to choose which three to show. */}
      <StatStrip
        stats={kpiTiles.map(tile => ({ label: tile.label, value: tile.value }))}
        onPress={() => setCustomizing(true)}
      />

      {/* Customize Modal */}
      <Modal visible={customizing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Dashboard numbers</Text>
            <Text style={styles.modalSub}>Choose up to three to show</Text>
            {ALL_KPI_OPTIONS.map(option => {
              const isSelected = selectedKPIs.includes(option.key)
              const selectedIndex = selectedKPIs.indexOf(option.key)
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => {
                    if (isSelected) {
                      if (selectedKPIs.length > 1) {
                        const updated = selectedKPIs.filter(k => k !== option.key)
                        setSelectedKPIs(updated)
                        saveKPIPreferences(updated)
                      }
                    } else {
                      if (selectedKPIs.length < 3) {
                        const updated = [...selectedKPIs, option.key]
                        setSelectedKPIs(updated)
                        saveKPIPreferences(updated)
                      } else {
                        const updated = [...selectedKPIs.slice(1), option.key]
                        setSelectedKPIs(updated)
                        saveKPIPreferences(updated)
                      }
                    }
                  }}
                >
                  <View style={[styles.optionCheck, isSelected && styles.optionCheckSelected]}>
                    {isSelected && <Text style={styles.optionCheckText}>{selectedIndex + 1}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
                    <Text style={styles.optionSub}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setCustomizing(false)}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ListGroup>
        <ListRow icon="checkmark-circle-outline" title="Tasks" onPress={() => router.push("/tasks")} />
        <ListRow icon="document-text-outline" title="Notes" onPress={() => router.push("/notes")} />
        <ListRow icon="time-outline" title="Time tracking" onPress={() => router.push("/time")} />
      </ListGroup>

      {/* Projects */}
      <View style={{ gap: 8 }}>
        <SectionHeader
          title="Projects"
          actionLabel={isManager ? "New" : undefined}
          actionIcon="add"
          onAction={() => router.push("/new-project" as any)}
        />
        {projects.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title="No projects yet"
            subtitle={isManager ? "Tap New to create your first project." : "Projects you are assigned to will show up here."}
          />
        ) : (
          <Card>
            {projects.map((project, index) => (
              <Pressable
                key={project.id}
                onPress={() => router.push(`/project/${project.id}` as any)}
                accessibilityRole="button"
                accessibilityLabel={`${project.name}, ${project.completionPct} percent complete`}
                style={({ pressed }) => [styles.projectRow, index > 0 && styles.projectRowDivider, pressed && { backgroundColor: colors.fillSubtle }]}
              >
                <View style={styles.projectTop}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={type.headline} numberOfLines={1}>{project.name}</Text>
                    <Text style={type.footnote} numberOfLines={1}>
                      {[
                        [project.city, project.state].filter(Boolean).join(", "),
                        humanize(project.projectType),
                        isManager ? `$${(project.contractValue / 1000).toFixed(0)}k` : null,
                      ].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  {project.status !== "ACTIVE" && <Chip label={humanize(project.status)} tone="warning" />}
                  <Text style={styles.projectPercent}>{project.completionPct}%</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
                </View>
                <ProgressBar percent={project.completionPct} />
              </Pressable>
            ))}
          </Card>
        )}
      </View>

      {/* Business */}
      {isManager && (
        <View style={{ gap: 8 }}>
          <SectionHeader title="Business" />
          <ListGroup>
            <ListRow icon="receipt-outline" title="Vendor invoices" onPress={() => router.push("/vendor-invoices" as any)} />
            <ListRow icon="trending-up-outline" title="Financials" onPress={() => router.push("/financials" as any)} />
            <ListRow icon="help-circle-outline" title="RFIs" onPress={() => router.push("/rfis" as any)} />
            <ListRow icon="calculator-outline" title="Estimates" onPress={() => router.push("/estimates" as any)} />
            <ListRow icon="document-text-outline" title="Invoices" onPress={() => router.push("/invoices" as any)} />
            <ListRow icon="people-outline" title="Team" onPress={() => router.push("/team" as any)} />
          </ListGroup>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  avatar: { width: 44, height: 44, borderRadius: 22, marginBottom: 2 },
  avatarFallback: { backgroundColor: colors.charcoal, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 15, fontWeight: "600", color: colors.white },
  askField: { height: 44, borderRadius: 14, backgroundColor: colors.fill, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  askFieldText: { flex: 1, fontSize: 17, color: colors.textSecondary },
  projectRow: { paddingVertical: 12, paddingLeft: 16, paddingRight: 14, gap: 8 },
  projectRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  projectTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  projectPercent: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },

  // "Customize dashboard" sheet
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 15, color: colors.textSecondary, marginBottom: 20 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: colors.fillSubtle },
  optionRowSelected: { backgroundColor: colors.tintSoft },
  optionCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.chevron, justifyContent: "center", alignItems: "center" },
  optionCheckSelected: { backgroundColor: colors.tint, borderColor: colors.tint },
  optionCheckText: { fontSize: 12, fontWeight: "700", color: colors.white },
  optionLabel: { fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 2 },
  optionLabelSelected: { color: colors.tint },
  optionSub: { fontSize: 13, color: colors.textSecondary },
  modalDoneBtn: { backgroundColor: colors.charcoal, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  modalDoneBtnText: { color: colors.white, fontSize: 17, fontWeight: "600" },
})
