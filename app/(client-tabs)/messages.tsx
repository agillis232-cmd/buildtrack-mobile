import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from "react-native"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { colors, TAB_BAR_HEIGHT, tabBarBottom } from "@/lib/theme"
import { useKeyboardVisible } from "@/lib/useKeyboardVisible"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function ClientMessagesScreen() {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState("")
  const insets = useSafeAreaInsets()
  const keyboardVisible = useKeyboardVisible()
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (token) loadMessages()
  }, [token])

  async function loadMessages() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/client/project`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProjectId(data.project?.id)
      setMessages(data.project?.messages || [])
    } catch (e) {
      console.log("Error loading messages:", e)
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!body.trim() || !projectId) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
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

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.tint} /></View>

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Communicate with your project team</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Start a conversation with your project team</Text>
          </View>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user?.id
            return (
              <View key={msg.id} style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
                {!isMe && (
                  <View style={styles.senderAvatar}>
                    <Text style={styles.senderAvatarText}>{msg.sender?.name?.charAt(0).toUpperCase() || "?"}</Text>
                  </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  {!isMe && <Text style={styles.senderName}>{msg.sender?.name}</Text>}
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.body}</Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      <View style={[styles.inputBar, !keyboardVisible && { marginBottom: tabBarBottom(insets.bottom) + TAB_BAR_HEIGHT + 8 }]}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Type a message..."
          placeholderTextColor={colors.chevron}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !body.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={sending || !body.trim()}
        >
          {sending ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.sendBtnText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6, marginBottom: 2 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  bubbleWrapper: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end", gap: 8 },
  bubbleWrapperMe: { justifyContent: "flex-end" },
  bubbleWrapperThem: { justifyContent: "flex-start" },
  senderAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.charcoal, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  senderAvatarText: { fontSize: 12, fontWeight: "700", color: "white" },
  bubble: { maxWidth: "72%", borderRadius: 18, padding: 12 },
  bubbleMe: { backgroundColor: colors.charcoal, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "white", borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 4 },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  bubbleTextMe: { color: "white" },
  bubbleTime: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: "right" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)" },
  inputBar: { flexDirection: "row", padding: 12, backgroundColor: "white", borderTopWidth: 1, borderTopColor: colors.separator, gap: 10, alignItems: "flex-end" },
  input: { flex: 1, backgroundColor: colors.fillSubtle, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.charcoal, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#E8E6E1" },
  sendBtnText: { color: "white", fontWeight: "700", fontSize: 14 },
})