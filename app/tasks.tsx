import { useState, useEffect } from "react"
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  SafeAreaView, ActivityIndicator, TextInput, Modal
} from "react-native"
import { router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"

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
        <Text style={{ color: "white", fontSize: 22, fontWeight: "700", marginTop: 12 }}>Tasks</Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
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
            <Text style={{ fontSize: 11, fontWeight: "600", color: filter === f.key ? "white" : "#6B7280" }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks() }} tintColor="#F97316" />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#F97316" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1C1F26" }}>No tasks</Text>
            <Text style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Use the assistant to create tasks</Text>
          </View>
        ) : (
          filtered.map(task => (
            <View key={task.id} style={{
              backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 10,
              borderWidth: 1, borderColor: "#E8E6E1",
              borderLeftWidth: 3, borderLeftColor: STATUS_COLORS[task.status] || "#E8E6E1",
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <Text style={{
                  fontSize: 14, fontWeight: "600", color: "#1C1F26", flex: 1, marginRight: 8,
                  textDecorationLine: task.status === "DONE" ? "line-through" : "none",
                }}>{task.title}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: PRIORITY_COLORS[task.priority] + "20" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: PRIORITY_COLORS[task.priority] }}>{task.priority}</Text>
                </View>
              </View>

              {task.description && (
                <Text style={{ fontSize: 12, color: "#999", marginBottom: 8, lineHeight: 16 }} numberOfLines={2}>{task.description}</Text>
              )}

              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {task.project && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: "#FFF7ED" }}>
                    <Text style={{ fontSize: 10, color: "#F97316", fontWeight: "600" }}>{task.project.name}</Text>
                  </View>
                )}
                {task.assignee && (
                  <Text style={{ fontSize: 11, color: "#999" }}>→ {task.assignee.name}</Text>
                )}
                {task.dueDate && (
                  <Text style={{
                    fontSize: 11, fontWeight: "600",
                    color: new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "#DC2626" : "#999"
                  }}>
                    Due {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
                    <Text style={{ fontSize: 10, fontWeight: "600", color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB to assistant */}
      <TouchableOpacity
        onPress={() => router.push("/assistant")}
        style={{
          position: "absolute", bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: 16,
          backgroundColor: "#F97316",
          alignItems: "center", justifyContent: "center",
          shadowColor: "#F97316", shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
        }}
      >
        <Ionicons name="hardware-chip-outline" size={26} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}