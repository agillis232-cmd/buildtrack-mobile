import { useState, useRef, useEffect } from "react"
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView
} from "react-native"
import { useLocalSearchParams, router } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { Ionicons } from "@expo/vector-icons"

const API = "https://buildtrackpro.app"

const ACTION_ICON_MAP: Record<string, string> = {
  note: "document-text-outline",
  task: "checkbox-outline",
  event: "calendar-outline",
  daily_log: "clipboard-outline",
  brain_dump: "bulb-outline",
}

export default function AssistantScreen() {
  const { projectId, projectName } = useLocalSearchParams()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [threads, setThreads] = useState<any[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  async function loadThreads() {
    setLoadingThreads(true)
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      if (!token) return
      const url = projectId
        ? `${API}/api/assistant/threads?projectId=${projectId}`
        : `${API}/api/assistant/threads`
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setThreads(data.threads || [])
    } catch (e) { console.log(e) }
    setLoadingThreads(false)
  }

  async function loadThread(id: string) {
    try {
      const token = await SecureStore.getItemAsync("auth_token")
      if (!token) return
      const res = await fetch(`${API}/api/mobile/assistant/threads/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.thread?.messages) {
        setMessages(data.thread.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          actions: m.toolCalls ? JSON.parse(m.toolCalls) : [],
        })))
        setThreadId(id)
      }
    } catch (e) { console.log(e) }
    setShowHistory(false)
  }

  function startNewChat() {
    setMessages([])
    setThreadId(null)
    setShowHistory(false)
  }

  async function handleSend() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: msg }])
    setLoading(true)
    try {
      const token = await SecureStore.getItemAsync("auth_token")
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
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="sparkles-outline" size={18} color="#F97316" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
                {projectName ? `${projectName}` : "Assistant"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={() => { setShowHistory(!showHistory); if (!showHistory) loadThreads() }}>
              <Ionicons name="time-outline" size={20} color={showHistory ? "#F97316" : "rgba(255,255,255,0.6)"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={startNewChat}>
              <Ionicons name="add-circle-outline" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>
        {threadId && !showHistory && (
          <TouchableOpacity onPress={startNewChat} style={{ marginTop: 8, alignSelf: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Continuing conversation — tap + for new</Text>
          </TouchableOpacity>
        )}
      </View>

      {showHistory ? (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1C1F26", marginBottom: 12 }}>Past conversations</Text>
          {loadingThreads ? (
            <ActivityIndicator color="#F97316" style={{ marginTop: 40 }} />
          ) : threads.length === 0 ? (
            <View style={{ alignItems: "center", padding: 40 }}>
              <Ionicons name="chatbubbles-outline" size={32} color="#D1D5DB" />
              <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 8 }}>No past conversations</Text>
            </View>
          ) : (
            threads.map(thread => (
              <TouchableOpacity
                key={thread.id}
                onPress={() => loadThread(thread.id)}
                style={{
                  backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8,
                  borderWidth: 1, borderColor: "#E8E6E1",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#1C1F26", flex: 1 }} numberOfLines={1}>
                    {thread.title || "Untitled"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {new Date(thread.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {thread._count?.messages || 0} messages
                  </Text>
                </View>
                {thread.messages?.[0] && (
                  <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }} numberOfLines={1}>
                    {thread.messages[0].content.substring(0, 80)}...
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 40, paddingBottom: 20 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Ionicons name="sparkles" size={28} color="#F97316" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C1F26", marginBottom: 4 }}>
                  {projectName ? `${projectName} Assistant` : "BuildTrack Assistant"}
                </Text>
                <Text style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 }}>
                  I can create notes, tasks, calendar events, and daily logs. Try a brain dump — paste your thoughts and I'll organize them into action items.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 16 }}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => { setInput(s); }}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: "white", borderWidth: 1, borderColor: "#E8E6E1" }}
                    >
                      <Text style={{ fontSize: 13, color: "#374151", fontWeight: "500" }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg, i) => (
              <View key={i} style={{ marginBottom: 12, alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <View style={{
                  maxWidth: "85%",
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: msg.role === "user" ? "#1C1F26" : "white",
                  borderWidth: msg.role === "user" ? 0 : 1,
                  borderColor: "#E8E6E1",
                  ...(msg.role === "user"
                    ? { borderBottomRightRadius: 4 }
                    : { borderBottomLeftRadius: 4 }),
                }}>
                  <Text style={{
                    fontSize: 14, lineHeight: 21,
                    color: msg.role === "user" ? "white" : "#374151",
                  }}>
                    {msg.content}
                  </Text>
                </View>

                {/* Action items */}
                {msg.actions?.length > 0 && (
                  <View style={{ marginTop: 6, maxWidth: "85%" }}>
                    {msg.actions.map((action: any, j: number) => (
                      <View key={j} style={{
                        flexDirection: "row", alignItems: "center", gap: 8,
                        padding: 10, backgroundColor: "#F0FDF4", borderRadius: 10,
                        borderWidth: 1, borderColor: "#DCFCE7", marginBottom: 4,
                      }}>
                        <Ionicons
                          name={(ACTION_ICON_MAP[action.type] || "pin-outline") as any}
                          size={16}
                          color="#16A34A"
                        />
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: "#374151" }}>
                          {action.title || action.summary || "Item created"}
                        </Text>
                        <Ionicons
                          name={action.success !== false ? "checkmark-circle" : "close-circle"}
                          size={16}
                          color={action.success !== false ? "#16A34A" : "#DC2626"}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {loading && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14 }}>
                <ActivityIndicator size="small" color="#F97316" />
                <Text style={{ fontSize: 13, color: "#9CA3AF" }}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={{
            flexDirection: "row", gap: 8, padding: 12, paddingBottom: Platform.OS === "ios" ? 28 : 12,
            backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E8E6E1",
          }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              placeholder={projectName ? `Ask about ${projectName}...` : "Ask me anything..."}
              placeholderTextColor="#9CA3AF"
              multiline
              style={{
                flex: 1, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12,
                fontSize: 14, color: "#1C1F26", maxHeight: 100,
                borderWidth: 1, borderColor: "#E8E6E1",
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: input.trim() ? "#F97316" : "#F3F4F6",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="send" size={18} color={input.trim() ? "white" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}