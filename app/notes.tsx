import { useState, useEffect } from "react"
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  SafeAreaView, ActivityIndicator
} from "react-native"
import { router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_URL } from "@/lib/api"

const CATEGORY_ICONS: Record<string, string> = {
  general: "📝", meeting: "🤝", decision: "⚖️", reminder: "🔔", idea: "💡"
}

export default function NotesScreen() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterCategory, setFilterCategory] = useState("all")
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  useEffect(() => { loadNotes() }, [])

  async function loadNotes() {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      const res = await fetch(`${API_URL}/api/mobile/notes`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (e) { console.log(e) }
    setLoading(false)
    setRefreshing(false)
  }

  async function togglePin(noteId: string, current: boolean) {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      await fetch(`${API_URL}/api/mobile/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !current })
      })
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, pinned: !current } : n)
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)))
    } catch (e) { console.log(e) }
  }

  const filtered = filterCategory === "all" ? notes : notes.filter(n => n.category === filterCategory)
  const categories = ["general", "meeting", "decision", "reminder", "idea"]

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
        <Text style={{ color: "white", fontSize: 22, fontWeight: "700", marginTop: 12 }}>Notes</Text>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>{notes.length} notes</Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity
            onPress={() => setFilterCategory("all")}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
              backgroundColor: filterCategory === "all" ? "#1C1F26" : "white",
              borderWidth: 1, borderColor: filterCategory === "all" ? "#1C1F26" : "#E8E6E1",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: filterCategory === "all" ? "white" : "#6B7280" }}>All</Text>
          </TouchableOpacity>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setFilterCategory(c)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
                backgroundColor: filterCategory === c ? "#1C1F26" : "white",
                borderWidth: 1, borderColor: filterCategory === c ? "#1C1F26" : "#E8E6E1",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: filterCategory === c ? "white" : "#6B7280" }}>
                {CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotes() }} tintColor="#F97316" />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📝</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1C1F26" }}>No notes yet</Text>
            <Text style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Use the assistant to capture notes</Text>
          </View>
        ) : (
          filtered.map(note => (
            <TouchableOpacity
              key={note.id}
              onPress={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
              style={{
                backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 10,
                borderWidth: 1, borderColor: "#E8E6E1",
                borderLeftWidth: 3, borderLeftColor: note.pinned ? "#F97316" : "#E8E6E1",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>{CATEGORY_ICONS[note.category] || "📝"}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1C1F26", flex: 1 }}>{note.title || "Untitled"}</Text>
                </View>
                <TouchableOpacity onPress={() => togglePin(note.id, note.pinned)}>
                  <Text style={{ fontSize: 16, opacity: note.pinned ? 1 : 0.3 }}>📌</Text>
                </TouchableOpacity>
              </View>

              <Text
                style={{ fontSize: 13, color: "#666", lineHeight: 18 }}
                numberOfLines={expandedNote === note.id ? undefined : 3}
              >
                {note.content}
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0EDE8" }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  {note.project && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: "#FFF7ED" }}>
                      <Text style={{ fontSize: 10, color: "#F97316", fontWeight: "600" }}>{note.project.name}</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 10, color: "#999" }}>{note.createdBy?.name}</Text>
                </View>
                <Text style={{ fontSize: 10, color: "#999" }}>
                  {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
            </TouchableOpacity>
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
        <Text style={{ fontSize: 26 }}>🤖</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}