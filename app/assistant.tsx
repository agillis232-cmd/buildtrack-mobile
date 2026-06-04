import { useState, useRef, useEffect } from "react"
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView
} from "react-native"
import { useLocalSearchParams, router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { Ionicons } from "@expo/vector-icons"

const API = "https://buildtrackpro.app"

const ACTION_ICONS: Record<string, string> = {
  note: "📝", task: "✅", event: "📅", daily_log: "📋", brain_dump: "🧠",
}

export default function AssistantScreen() {
  const { projectId, projectName } = useLocalSearchParams<{ projectId?: string, projectName?: string }>()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  async function handleSend() {
    const msg = input.trim()
    if (!msg || loading) return

    setInput("")
    setMessages(prev => [...prev, { role: "user", content: msg }])
    setLoading(true)

    try {
      const token = await SecureStore.getItemAsync("auth_token")
      console.log("Token:", token ? token.substring(0, 20) + "..." : "NULL")
      if (!token) {
        setMessages(prev => [...prev, { role: "assistant", content: "Not logged in — please sign out and sign back in.", actions: [] }])
        setLoading(false)
        return
      }
      const res = await fetch(`${API}/api/mobile/assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: msg, projectId: projectId || null, threadId })
      })
      const data = await res.json()

      if (data.error) {
        const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error)
        setMessages(prev => [...prev, { role: "assistant", content: `Something went wrong: ${errMsg}`, actions: [] }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.message, actions: data.actions || [] }])
        if (data.threadId) setThreadId(data.threadId)
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error — please try again.", actions: [] }])
    }
    setLoading(false)
  }

  const suggestions = projectId
    ? ["Brain dump my day", "Create a punch list", "Log today's work", "What's pending?"]
    : ["Brain dump", "Create a task", "Add a reminder", "Add a note"]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F4F0" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#1C1F26", paddingTop: 10, paddingBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          {threadId && (
            <TouchableOpacity onPress={() => { setMessages([]); setThreadId(null) }}>
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>New Chat</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: "#F97316",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="hardware-chip-outline" size={22} color="white" />
          </View>
          <View>
            <Text style={{ color: "white", fontSize: 17, fontWeight: "700" }}>BuildTrack Assistant</Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              {projectName ? `Working on: ${projectName}` : "Organization-wide"}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 60, paddingBottom: 30 }}>
              <Ionicons name="construct-outline" size={48} color="#F97316" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C1F26", marginBottom: 6, textAlign: "center" }}>
                Hey! I'm your BuildTrack Assistant
              </Text>
              <Text style={{ fontSize: 13, color: "#999", textAlign: "center", maxWidth: 300, lineHeight: 18 }}>
                Create notes, tasks, events, and daily logs. Try a brain dump — just talk or type your thoughts.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20, justifyContent: "center" }}>
                {suggestions.map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setInput(s)}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 14,
                      borderRadius: 99, borderWidth: 1, borderColor: "#E8E6E1",
                      backgroundColor: "white",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#666" }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <View style={{
                flexDirection: "row",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                gap: 8,
              }}>
                {msg.role === "assistant" && (
                  <View style={{
                    width: 28, height: 28, borderRadius: 8,
                    backgroundColor: "#F97316",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="hardware-chip-outline" size={14} color="white" />
                  </View>
                )}
                <View style={{
                  maxWidth: "78%",
                  padding: 12,
                  borderRadius: 16,
                  borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
                  borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                  backgroundColor: msg.role === "user" ? "#1C1F26" : "white",
                }}>
                  <Text style={{
                    fontSize: 13, lineHeight: 20,
                    color: msg.role === "user" ? "white" : "#1C1F26",
                  }}>
                    {msg.content}
                  </Text>
                </View>
              </View>

              {msg.actions && msg.actions.length > 0 && (
                <View style={{ marginTop: 8, marginLeft: 36, gap: 4 }}>
                  {msg.actions.map((action: any, j: number) => {
                    if (action.type === "brain_dump") {
                      return action.items?.map((item: any, k: number) => (
                        <View key={k} style={{
                          flexDirection: "row", alignItems: "center", gap: 8,
                          padding: 10, borderRadius: 8,
                          backgroundColor: "white", borderWidth: 1, borderColor: "#E8E6E1",
                        }}>
                          <Text style={{ fontSize: 14 }}>{ACTION_ICONS[item.type] || "📌"}</Text>
                          <Text style={{ fontSize: 12, fontWeight: "600", flex: 1, color: "#1C1F26" }}>{item.title}</Text>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#16A34A" }}>✓</Text>
                        </View>
                      ))
                    }
                    return (
                      <View key={j} style={{
                        flexDirection: "row", alignItems: "center", gap: 8,
                        padding: 10, borderRadius: 8,
                        backgroundColor: "white", borderWidth: 1, borderColor: "#E8E6E1",
                      }}>
                        <Text style={{ fontSize: 14 }}>{ACTION_ICONS[action.type] || "📌"}</Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", flex: 1, color: "#1C1F26" }}>{action.title || action.summary || "Created"}</Text>
                        {action.assignee && <Text style={{ fontSize: 11, color: "#999" }}>→ {action.assignee}</Text>}
                        <Text style={{ fontSize: 11, fontWeight: "700", color: action.success ? "#16A34A" : "#DC2626" }}>
                          {action.success ? "✓" : "✗"}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: "#F97316",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
              <View style={{ padding: 12, borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: "white" }}>
                <ActivityIndicator size="small" color="#F97316" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={{
          paddingHorizontal: 16, paddingVertical: 12,
          borderTopWidth: 1, borderTopColor: "#E8E6E1",
          backgroundColor: "white",
        }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={projectName ? `Ask about ${projectName}...` : "Ask me anything..."}
              placeholderTextColor="#999"
              multiline
              style={{
                flex: 1, padding: 12, borderRadius: 12,
                borderWidth: 1, borderColor: "#E8E6E1",
                fontSize: 14, maxHeight: 100, color: "#1C1F26",
                backgroundColor: "#F5F4F0",
              }}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: input.trim() ? "#F97316" : "#E8E6E1",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18, color: "white" }}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}