import { useState, useEffect } from "react"
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native"
import { useAuth } from "@/lib/auth"

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://buildtrackpro.app"

export default function SubDailyLogScreen() {
  const { user, token } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workPerformed, setWorkPerformed] = useState("")
  const [crewSize, setCrewSize] = useState("")
  const [hoursWorked, setHoursWorked] = useState("")
  const [materials, setMaterials] = useState("")
  const [notes, setNotes] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/sub/projects`, { headers: { "Authorization": `Bearer ${token}` } })
      const data = await res.json()
      setProjects(data.projects || [])
      if (data.projects?.length > 0) setSelectedProject(data.projects[0].projectId)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function submitLog() {
    if (!workPerformed.trim() || !selectedProject) {
      Alert.alert("Required", "Please select a project and describe work performed")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/sub/daily-log`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          workPerformed, crewSize: parseInt(crewSize) || 0,
          hoursWorked: parseFloat(hoursWorked) || 0,
          materials, notes,
        }),
      })
      const data = await res.json()
      if (data.log) {
        setSaved(true)
        setWorkPerformed(""); setCrewSize(""); setHoursWorked(""); setMaterials(""); setNotes("")
        setTimeout(() => setSaved(false), 3000)
      } else {
        Alert.alert("Error", data.error || "Could not save log")
      }
    } catch (e) { Alert.alert("Error", "Connection error") }
    setSaving(false)
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <Text style={styles.title}>Daily Log</Text>
        <Text style={styles.subtitle}>{today}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {saved && (
          <View style={{ backgroundColor: "#F0FDF4", borderRadius: 10, padding: 14, marginBottom: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#16A34A" }}>Log saved successfully!</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>PROJECT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {projects.map(p => (
                <TouchableOpacity key={p.projectId} onPress={() => setSelectedProject(p.projectId)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: selectedProject === p.projectId ? "#F97316" : "#F3F4F6" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: selectedProject === p.projectId ? "white" : "#6B7280" }}>{p.projectName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.label}>WORK PERFORMED *</Text>
          <TextInput value={workPerformed} onChangeText={setWorkPerformed} placeholder="Describe today's work..."
            placeholderTextColor="#9CA3AF" multiline numberOfLines={4} textAlignVertical="top"
            style={[styles.input, { minHeight: 100 }]} />

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CREW SIZE</Text>
              <TextInput value={crewSize} onChangeText={setCrewSize} placeholder="0" keyboardType="number-pad"
                placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>HOURS WORKED</Text>
              <TextInput value={hoursWorked} onChangeText={setHoursWorked} placeholder="0" keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          </View>

          <Text style={styles.label}>MATERIALS USED</Text>
          <TextInput value={materials} onChangeText={setMaterials} placeholder="List materials used today..."
            placeholderTextColor="#9CA3AF" multiline numberOfLines={2} textAlignVertical="top"
            style={[styles.input, { minHeight: 60 }]} />

          <Text style={styles.label}>NOTES</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Weather, delays, issues..."
            placeholderTextColor="#9CA3AF" multiline numberOfLines={2} textAlignVertical="top"
            style={[styles.input, { minHeight: 60 }]} />

          <TouchableOpacity onPress={submitLog} disabled={saving}
            style={{ backgroundColor: "#F97316", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4, opacity: saving ? 0.6 : 1 }}>
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>{saving ? "Saving..." : "Submit Daily Log"}</Text>
          </TouchableOpacity>
        </View>
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
  card: { backgroundColor: "white", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E8E6E1" },
  label: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 14, color: "#1A1A1A" },
})
