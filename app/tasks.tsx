import { useState, useEffect } from "react"
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  SafeAreaView, ActivityIndicator, TextInput, Modal
} from "react-native"
import { router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"
import { parseDateOnly } from "@/lib/dates"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

const STATUS_COLORS: Record<string, string> = { TODO: "#D97706", IN_PROGRESS: "#3B82F6", REVIEW: "#8B5CF6", DONE: "#16A34A" }
const STATUS_LABELS: Record<string, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", DONE: "Done" }
const PRIORITY_COLORS: Record<string, string> = { LOW: "#6B7280", MEDIUM: "#3B82F6", HIGH: "#F97316", URGENT: "#DC2626" }

export default function TasksScreen() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState("all")

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      const res = await fetch(`${API_URL}/api/mobile/tasks`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (e) { console.log(e) }
    setLoading(false)
    setRefreshing(false)
  }

  async function updateStatus(taskId: string, status: string) {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      await fetch(`${API_URL}/api/mobile/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status, completedAt: status === "DONE" ? new Date().toISOString() : null })
      })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    } catch (e) { console.log(e) }
  }

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter)
  const todoCount = tasks.filter(t => t.status === "TODO").length
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length
  const doneCount = tasks.filter(t => t.status === "DONE").length

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={colors.tint} />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: 4, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        </View>
        <Text style={{ color: colors.text, fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.6, marginTop: 12 }}>Tasks</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 4 }}>
          {tasks.length} tasks · {todoCount} to do · {inProgressCount} in progress · {doneCount} done
        </Text>
      </View>

      {/* Filter */}
      <View style={{ flexDirection: "row", gap: 6, padding: 16, paddingBottom: 8 }}>
        {[
          { key: "all", label: `All (${tasks.length})` },
          { key: "TODO", label: `To Do (${todoCount})` },
          { key: "IN_PROGRESS", label: `Active (${inProgressCount})` },
          { key: "DONE", label: `Done (${doneCount})` },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
              backgroundColor: filter === f.key ? "#1C1F26" : "white",
              borderWidth: 1, borderColor: filter === f.key ? "#1C1F26" : "#E8E6E1",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: filter === f.key ? "white" : colors.textSecondary }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks() }} tintColor={colors.tint} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.tint} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>No tasks</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Use the assistant to create tasks</Text>
          </View>
        ) : (
          filtered.map(task => (
            <View key={task.id} style={{
              backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 10,
              borderLeftWidth: 3, borderLeftColor: STATUS_COLORS[task.status] || "#E8E6E1",
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <Text style={{
                  fontSize: 14, fontWeight: "600", color: colors.text, flex: 1, marginRight: 8,
                  textDecorationLine: task.status === "DONE" ? "line-through" : "none",
                }}>{task.title}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: PRIORITY_COLORS[task.priority] + "20" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: PRIORITY_COLORS[task.priority] }}>{task.priority}</Text>
                </View>
              </View>

              {task.description && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8, lineHeight: 16 }} numberOfLines={2}>{task.description}</Text>
              )}

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {task.project && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.tintSoft }}>
                    <Text style={{ fontSize: 11, color: colors.tint, fontWeight: "600" }}>{task.project.name}</Text>
                  </View>
                )}
                {task.assignee && (
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>→ {task.assignee.name}</Text>
                )}
                {task.dueDate && (
                  <Text style={{
                    fontSize: 11, fontWeight: "600",
                    color: new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "#DC2626" : "#999"
                  }}>
                    Due {parseDateOnly(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                )}
              </View>

              {/* Status buttons */}
              <View style={{ flexDirection: "row", gap: 6 }}>
                {["TODO", "IN_PROGRESS", "REVIEW", "DONE"].filter(s => s !== task.status).map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => updateStatus(task.id, s)}
                    style={{
                      flex: 1, paddingVertical: 6, borderRadius: 6,
                      borderWidth: 1, borderColor: STATUS_COLORS[s] + "40",
                      backgroundColor: STATUS_COLORS[s] + "10",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB to assistant */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ask the assistant"
        onPress={() => router.push("/assistant")}
        style={{
          position: "absolute", bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.charcoal,
          alignItems: "center", justifyContent: "center",
          shadowColor: "#1C1F26", shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
        }}
      >
        <Ionicons name="sparkles-outline" size={24} color={colors.accent} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}