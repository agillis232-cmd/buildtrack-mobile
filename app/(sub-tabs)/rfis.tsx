import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, StyleSheet } from "react-native"
import { useAuth } from "@/lib/auth"

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

  async function loadData() {
    try {
      const [rfiRes, projRes] = await Promise.all([
        fetch(`${API_URL}/api/sub/rfis`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_URL}/api/mobile/sub/projects`, { headers: { "Authorization": `Bearer ${token}` } }),
      ])
      const rfiData = await rfiRes.json()
      const projData = await projRes.json()
      setRfis(rfiData.rfis || [])
      setProjects(projData.projects || [])
      if (projData.projects?.length > 0) setSelectedProject(projData.projects[0].projectId)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function submitRfi() {
    if (!subject.trim() || !question.trim() || !selectedProject) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/sub/rfis`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject, subject, question }),
      })
      const data = await res.json()
      if (data.rfi) {
        setRfis(prev => [data.rfi, ...prev])
        setShowForm(false); setSubject(""); setQuestion("")
        Alert.alert("Sent!", "Your RFI has been submitted to the PM")
      }
    } catch (e) { Alert.alert("Error", "Could not submit RFI") }
    setSending(false)
  }

  const statusColor = (s: string) => s === "OPEN" ? "#2563EB" : s === "ANSWERED" ? "#16A34A" : "#6B7280"
  const statusBg = (s: string) => s === "OPEN" ? "#DBEAFE" : s === "ANSWERED" ? "#DCFCE7" : "#F3F4F6"

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <Text style={styles.title}>RFIs</Text>
        <Text style={styles.subtitle}>{rfis.length} request{rfis.length !== 1 ? "s" : ""} for information</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadData} tintColor="#F97316" />}>

        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={{ backgroundColor: "#F97316", borderRadius: 10, padding: 14, alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>{showForm ? "Cancel" : "New RFI"}</Text>
        </TouchableOpacity>

        {showForm && (
          <View style={{ backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#E8E6E1" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 4 }}>PROJECT</Text>
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1" }}>
              {projects.map(p => (
                <TouchableOpacity key={p.projectId} onPress={() => setSelectedProject(p.projectId)}
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: selectedProject === p.projectId ? "#FFF7ED" : "transparent" }}>
                  <Text style={{ fontSize: 13, fontWeight: selectedProject === p.projectId ? "700" : "400", color: selectedProject === p.projectId ? "#F97316" : "#1A1A1A" }}>{p.projectName}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 4 }}>SUBJECT</Text>
            <TextInput value={subject} onChangeText={setSubject} placeholder="Brief subject" placeholderTextColor="#9CA3AF"
              style={{ backgroundColor: "#F9FAFB", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1" }} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 4 }}>QUESTION</Text>
            <TextInput value={question} onChangeText={setQuestion} placeholder="Describe your question in detail..." placeholderTextColor="#9CA3AF"
              multiline numberOfLines={4} textAlignVertical="top"
              style={{ backgroundColor: "#F9FAFB", borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, minHeight: 100, borderWidth: 1, borderColor: "#E8E6E1" }} />
            <TouchableOpacity onPress={submitRfi} disabled={sending || !subject.trim() || !question.trim()}
              style={{ backgroundColor: subject.trim() && question.trim() ? "#F97316" : "#E8E6E1", borderRadius: 10, padding: 14, alignItems: "center" }}>
              <Text style={{ color: subject.trim() && question.trim() ? "white" : "#9CA3AF", fontSize: 14, fontWeight: "700" }}>{sending ? "Sending..." : "Submit RFI"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 40 }}>Loading...</Text>
        ) : rfis.length === 0 && !showForm ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 }}>No RFIs yet</Text>
            <Text style={{ fontSize: 13, color: "#9CA3AF" }}>Tap "New RFI" to ask a question</Text>
          </View>
        ) : (
          rfis.map((rfi: any) => (
            <View key={rfi.id} style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#F97316" }}>{rfi.rfiNumber}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1A1A1A" }}>{rfi.subject}</Text>
                </View>
                <View style={{ backgroundColor: statusBg(rfi.status), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: statusColor(rfi.status) }}>{rfi.status}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 18 }} numberOfLines={3}>{rfi.description || rfi.question}</Text>
              {rfi.answer && (
                <View style={{ marginTop: 8, padding: 10, backgroundColor: "#F0FDF4", borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#16A34A", marginBottom: 2 }}>Answer:</Text>
                  <Text style={{ fontSize: 13, color: "#374151" }}>{rfi.answer}</Text>
                </View>
              )}
              <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>{rfi.project?.name} - {new Date(rfi.createdAt).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  header: { backgroundColor: "#1C1F26", paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, overflow: "hidden" },
  headerCircle: { position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(249,115,22,0.08)" },
  title: { fontSize: 22, fontWeight: "800", color: "white", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  card: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
})
