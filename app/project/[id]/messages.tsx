import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from "react-native"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function MessagesScreen() {
  const { id } = useLocalSearchParams()
  const { token, user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (token && id) loadMessages()
  }, [token, id])

  async function loadMessages() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/messages`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.log("Error loading messages:", e)
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!body.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body })
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, data.message])
        setBody("")
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      }
    } catch (e) {
      console.log("Error sending message:", e)
    }
    setSending(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Start the conversation</Text>
          </View>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user?.id
            return (
              <View key={msg.id} style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                {!isMe && <Text style={styles.senderName}>{msg.sender?.name || "Unknown"}</Text>}
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.body}</Text>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            )
          })
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending || !body.trim()}>
          {sending ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.sendText}>→</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E8E6E1" },
  backBtn: { marginBottom: 8 },
  backText: { color: "#F97316", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  content: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyCard: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF" },
  bubble: { maxWidth: "75%", marginBottom: 12, padding: 12, borderRadius: 16 },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: "#F97316", borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: "flex-start", backgroundColor: "white", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E8E6E1" },
  senderName: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 4 },
  bubbleText: { fontSize: 15, color: "#1A1A1A", lineHeight: 20 },
  bubbleTextMe: { color: "white" },
  bubbleTime: { fontSize: 10, color: "#9CA3AF", marginTop: 4, textAlign: "right" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)" },
  inputRow: { flexDirection: "row", padding: 12, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E8E6E1", gap: 10, alignItems: "flex-end" },
  input: { flex: 1, backgroundColor: "#F9FAFB", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, backgroundColor: "#F97316", borderRadius: 22, justifyContent: "center", alignItems: "center" },
  sendText: { color: "white", fontSize: 18, fontWeight: "700" },
})