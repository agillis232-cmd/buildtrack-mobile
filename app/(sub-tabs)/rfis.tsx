import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, StyleSheet } from "react-native"
import { useAuth } from "@/lib/auth"
import { colors } from "@/lib/theme"

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://buildtrackpro.app"

export default function SubRFIsScreen() {
  const { token } = useAuth()
  const [rfis, setRfis] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState("")
  const [question, setQuestion] = useState("")
  const [selectedProject, setSelectedProject] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => { loadData() }, [])

  // The latest reply on an RFI is its answer.
  function withAnswer(rfi: any) {
    const replies = rfi.responses || []
    return { ...rfi, answer: rfi.answer ?? replies[replies.length - 1]?.message }
  }

  async function loadData() {
    try {
      const [rfiRes, projRes] = await Promise.all([
        fetch(`${API_URL}/api/mobile/rfis`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_URL}/api/mobile/sub/projects`, { headers: { "Authorization": `Bearer ${token}` } }),
      ])
      const rfiData = await rfiRes.json()
      const projData = await projRes.json()
      setRfis((rfiData.rfis || []).map(withAnswer))
      setProjects(projData.projects || [])
      if (projData.projects?.length > 0) setSelectedProject(projData.projects[0].projectId)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function submitRfi() {
    if (!subject.trim() || !question.trim() || !selectedProject) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/rfis`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject, subject, description: question }),
      })
      const data = await res.json()
      if (data.rfi) {
        setRfis(prev => [withAnswer(data.rfi), ...prev])
        setShowForm(false); setSubject(""); setQuestion("")
        Alert.alert("Sent!", "Your RFI has been submitted to the PM")
      } else {
        Alert.alert("Error", data.error || "Could not submit RFI")
      }
    } catch (e) { Alert.alert("Error", "Could not submit RFI") }
    setSending(false)
  }

  const statusColor = (s: string) => s === "OPEN" ? "#2563EB" : s === "ANSWERED" ? "#16A34A" : "#6B7280"
  const statusBg = (s: string) => s === "OPEN" ? "#DBEAFE" : s === "ANSWERED" ? "#DCFCE7" : "#F3F4F6"

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RFIs</Text>
        <Text style={styles.subtitle}>{rfis.length} request{rfis.length !== 1 ? "s" : ""} for information</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadData} tintColor={colors.tint} />}>

        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={{ backgroundColor: colors.charcoal, borderRadius: 12, height: 50, justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>{showForm ? "Cancel" : "New RFI"}</Text>
        </TouchableOpacity>

        {showForm && (
          <View style={{ backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 4 }}>PROJECT</Text>
            <View style={{ backgroundColor: colors.fillSubtle, borderRadius: 8, marginBottom: 12 }}>
              {projects.map(p => (
                <TouchableOpacity key={p.projectId} onPress={() => setSelectedProject(p.projectId)}
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.separator, backgroundColor: selectedProject === p.projectId ? "#FFF7ED" : "transparent" }}>
                  <Text style={{ fontSize: 13, fontWeight: selectedProject === p.projectId ? "700" : "400", color: selectedProject === p.projectId ? "#F97316" : "#1A1A1A" }}>{p.projectName}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 4 }}>SUBJECT</Text>
            <TextInput value={subject} onChangeText={setSubject} placeholder="Brief subject" placeholderTextColor={colors.chevron}
              style={{ backgroundColor: colors.fillSubtle, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12 }} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 4 }}>QUESTION</Text>
            <TextInput value={question} onChangeText={setQuestion} placeholder="Describe your question in detail..." placeholderTextColor={colors.chevron}
              multiline numberOfLines={4} textAlignVertical="top"
              style={{ backgroundColor: colors.fillSubtle, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, minHeight: 100 }} />
            <TouchableOpacity onPress={submitRfi} disabled={sending || !subject.trim() || !question.trim()}
              style={{ backgroundColor: subject.trim() && question.trim() ? "#F97316" : "#E8E6E1", borderRadius: 10, padding: 14, alignItems: "center" }}>
              <Text style={{ color: subject.trim() && question.trim() ? "white" : colors.textSecondary, fontSize: 14, fontWeight: "700" }}>{sending ? "Sending..." : "Submit RFI"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 40 }}>Loading...</Text>
        ) : rfis.length === 0 && !showForm ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 4 }}>No RFIs yet</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Tap "New RFI" to ask a question</Text>
          </View>
        ) : (
          rfis.map((rfi: any) => (
            <View key={rfi.id} style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.tint }}>{rfi.rfiNumber}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{rfi.subject}</Text>
                </View>
                <View style={{ backgroundColor: statusBg(rfi.status), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor(rfi.status) }}>{rfi.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }} numberOfLines={3}>{rfi.description || rfi.question}</Text>
              {rfi.answer && (
                <View style={{ marginTop: 8, padding: 10, backgroundColor: "#F0FDF4", borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success, marginBottom: 2 }}>Answer:</Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{rfi.answer}</Text>
                </View>
              )}
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>{rfi.project?.name} - {new Date(rfi.createdAt).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "800", color: colors.text, marginBottom: 4, letterSpacing: -0.6 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  card: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10 },
})
