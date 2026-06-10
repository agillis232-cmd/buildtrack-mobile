import { useState, useEffect } from "react"
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  SafeAreaView, ActivityIndicator, TextInput, Modal, Alert
} from "react-native"
import { router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Ionicons } from "@expo/vector-icons"

const STATUS_COLORS: Record<string, string> = { PENDING: "#D97706", APPROVED: "#16A34A", REJECTED: "#DC2626" }

export default function TimeScreen() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"mine" | "pending">("mine")

  const [projectId, setProjectId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [hours, setHours] = useState("")
  const [notes, setNotes] = useState("")

  const isAdmin = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"

  useEffect(() => {
    loadEntries()
    loadProjects()
  }, [])

  async function loadEntries() {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      const res = await fetch(`${API_URL}/api/mobile/time`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (e) { console.log(e) }
    setLoading(false)
    setRefreshing(false)
  }

  async function loadProjects() {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      const res = await fetch(`${API_URL}/api/mobile/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) { console.log(e) }
  }

  async function saveEntry() {
    if (!projectId || !hours) {
      Alert.alert("Required", "Please select a project and enter hours")
      return
    }
    setSaving(true)
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      const res = await fetch(`${API_URL}/api/mobile/time`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, date, hoursWorked: hours, notes })
      })
      const data = await res.json()
      if (data.entry) {
        setEntries(prev => [data.entry, ...prev])
        setAdding(false)
        setProjectId("")
        setHours("")
        setNotes("")
      }
    } catch (e) { Alert.alert("Error", "Could not save") }
    setSaving(false)
  }

  async function approveEntry(entryId: string) {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      const res = await fetch(`${API_URL}/api/mobile/time/${entryId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" })
      })
      const data = await res.json()
      if (data.entry) {
        setEntries(prev => prev.map(e => e.id === entryId ? data.entry : e))
      }
    } catch (e) { Alert.alert("Error", "Could not approve") }
  }

  async function deleteEntry(entryId: string) {
    Alert.alert("Delete", "Remove this time entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          const token = await SecureStore.getItemAsync("auth_token")
          await fetch(`${API_URL}/api/mobile/time/${entryId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          })
          setEntries(prev => prev.filter(e => e.id !== entryId))
        } catch (e) { Alert.alert("Error", "Could not delete") }
      }}
    ])
  }

  const myEntries = entries.filter(e => e.user?.name === user?.name)
  const pendingEntries = entries.filter(e => e.status === "PENDING")
  const displayEntries = tab === "pending" ? pendingEntries : myEntries

  const totalHoursThisWeek = myEntries
    .filter(e => {
      const entryDate = new Date(e.date)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return entryDate >= weekAgo
    })
    .reduce((sum, e) => sum + e.hoursWorked, 0)

  const pendingCount = pendingEntries.length

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F4F0", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color="#F97316" />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F4F0" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#1C1F26", paddingTop: 10, paddingBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "700", marginTop: 12 }}>Time tracking</Text>

        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="time-outline" size={14} color="#F97316" />
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>This week</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "white", marginTop: 4 }}>{totalHoursThisWeek.toFixed(1)}h</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="document-text-outline" size={14} color="#D97706" />
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Pending</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: pendingCount > 0 ? "#D97706" : "white", marginTop: 4 }}>{pendingCount}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#16A34A" />
              <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Total entries</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "white", marginTop: 4 }}>{myEntries.length}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        <TouchableOpacity
          onPress={() => setTab("mine")}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: tab === "mine" ? "#1C1F26" : "white", borderWidth: 1, borderColor: tab === "mine" ? "#1C1F26" : "#E8E6E1" }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: tab === "mine" ? "white" : "#6B7280" }}>My time</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => setTab("pending")}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: tab === "pending" ? "#1C1F26" : "white", borderWidth: 1, borderColor: tab === "pending" ? "#1C1F26" : "#E8E6E1" }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: tab === "pending" ? "white" : "#6B7280" }}>
              Approve ({pendingCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEntries() }} tintColor="#F97316" />}
      >
        {displayEntries.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Ionicons name="time-outline" size={40} color="#D1D5DB" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#9CA3AF", marginTop: 12 }}>
              {tab === "pending" ? "No pending entries" : "No time logged yet"}
            </Text>
            <Text style={{ fontSize: 13, color: "#D1D5DB", marginTop: 4 }}>
              {tab === "pending" ? "All timesheets are up to date" : "Tap + to log your hours"}
            </Text>
          </View>
        ) : (
          displayEntries.map(entry => {
            const statusColor = STATUS_COLORS[entry.status] || "#6B7280"
            return (
              <View key={entry.id} style={{
                backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 10,
                borderWidth: 1, borderColor: "#E8E6E1",
                borderLeftWidth: 3, borderLeftColor: statusColor,
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1C1F26" }}>{entry.project?.name || "Unknown project"}</Text>
                    {tab === "pending" && <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{entry.user?.name}</Text>}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#1C1F26" }}>{entry.hoursWorked}h</Text>
                    {entry.laborCost > 0 && <Text style={{ fontSize: 11, color: "#16A34A" }}>${entry.laborCost.toFixed(0)}</Text>}
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99, backgroundColor: statusColor + "15" }}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: statusColor }}>{entry.status}</Text>
                  </View>
                </View>

                {entry.notes && <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>{entry.notes}</Text>}

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 }}>
                  {tab === "pending" && isAdmin && entry.status === "PENDING" && (
                    <TouchableOpacity
                      onPress={() => approveEntry(entry.id)}
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#DCFCE7", borderRadius: 8, paddingVertical: 8 }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#16A34A" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#16A34A" }}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {entry.status === "PENDING" && (
                    <TouchableOpacity
                      onPress={() => deleteEntry(entry.id)}
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#FEE2E2", borderRadius: 8, paddingVertical: 8 }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#DC2626" }}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  {entry.status === "APPROVED" && (
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#16A34A" }}>Approved</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal visible={adding} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1C1F26" }}>Log time</Text>
              <TouchableOpacity onPress={() => setAdding(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Project picker */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {projects.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setProjectId(p.id)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                      backgroundColor: projectId === p.id ? "#1C1F26" : "#F3F4F6",
                      borderWidth: 1, borderColor: projectId === p.id ? "#1C1F26" : "#E8E6E1",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: projectId === p.id ? "white" : "#6B7280" }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Date */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              style={{ backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 16, color: "#1C1F26" }}
            />

            {/* Hours */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Hours worked</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[4, 6, 8, 10].map(h => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setHours(h.toString())}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center",
                    backgroundColor: hours === h.toString() ? "#F97316" : "#F3F4F6",
                    borderWidth: 1, borderColor: hours === h.toString() ? "#F97316" : "#E8E6E1",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: hours === h.toString() ? "white" : "#6B7280" }}>{h}h</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                value={hours}
                onChangeText={setHours}
                placeholder="Other"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                style={{
                  flex: 1, backgroundColor: "#F9FAFB", borderRadius: 8, padding: 10,
                  fontSize: 14, borderWidth: 1, borderColor: "#E8E6E1", textAlign: "center", color: "#1C1F26"
                }}
              />
            </View>

            {/* Notes */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you work on?"
              placeholderTextColor="#9CA3AF"
              multiline
              style={{ backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 20, height: 70, textAlignVertical: "top", color: "#1C1F26" }}
            />

            <TouchableOpacity
              onPress={saveEntry}
              disabled={saving}
              style={{ backgroundColor: "#F97316", borderRadius: 12, padding: 16, alignItems: "center" }}
            >
              {saving ? <ActivityIndicator color="white" /> : (
                <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Log time</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FAB */}
      {!adding && (
        <TouchableOpacity
          onPress={() => setAdding(true)}
          style={{
            position: "absolute", bottom: 24, right: 24,
            width: 56, height: 56, borderRadius: 16,
            backgroundColor: "#F97316",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#F97316", shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
          }}
        >
          <Ionicons name="add" size={26} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}