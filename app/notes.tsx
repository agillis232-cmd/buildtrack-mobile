import { useState, useEffect } from "react"
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  SafeAreaView, ActivityIndicator
} from "react-native"
import { router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

const CATEGORY_ICONS: Record<string, string> = {
  general: "document-text-outline",
  meeting: "people-outline",
  decision: "scale-outline",
  reminder: "notifications-outline",
  idea: "bulb-outline"
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
        <Text style={{ color: colors.text, fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.6, marginTop: 12 }}>Notes</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 4 }}>{notes.length} notes</Text>
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
            <Text style={{ fontSize: 11, fontWeight: "600", color: filterCategory === "all" ? "white" : colors.textSecondary }}>All</Text>
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
              <Text style={{ fontSize: 11, fontWeight: "600", color: filterCategory === c ? "white" : colors.textSecondary }}>
                {CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotes() }} tintColor={colors.tint} />}
      >
        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Ionicons name="document-text-outline" size={40} color={colors.tint} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>No notes yet</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Use the assistant to capture notes</Text>
          </View>
        ) : (
          filtered.map(note => (
            <TouchableOpacity
              key={note.id}
              onPress={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
              style={{
                backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 10,
                borderLeftWidth: 3, borderLeftColor: note.pinned ? "#F97316" : "#E8E6E1",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>{CATEGORY_ICONS[note.category] || "📝"}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, flex: 1 }}>{note.title || "Untitled"}</Text>
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
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: colors.tintSoft }}>
                      <Text style={{ fontSize: 11, color: colors.tint, fontWeight: "600" }}>{note.project.name}</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>{note.createdBy?.name}</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
            </TouchableOpacity>
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