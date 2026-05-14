import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function LogsScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const [summary, setSummary] = useState("")
  const [crew, setCrew] = useState("")
  const [hours, setHours] = useState("")
  const [weather, setWeather] = useState("Clear")

  useEffect(() => {
    if (token && id) loadLogs()
  }, [token, id])

  async function loadLogs() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (e) {
      console.log("Error loading logs:", e)
    }
    setLoading(false)
  }

  async function saveLog() {
    if (!summary || !crew || !hours) {
      Alert.alert("Error", "Summary, crew and hours are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/logs`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary,
          crew,
          hoursWorked: parseInt(hours),
          weather,
          date: new Date().toISOString().split("T")[0]
        })
      })
      const data = await res.json()
      if (data.log) {
        setLogs(prev => [data.log, ...prev])
        setSummary("")
        setCrew("")
        setHours("")
        setWeather("Clear")
        setAdding(false)
      } else {
        Alert.alert("Error", "Could not save log")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Daily Logs</Text>

        {adding && (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>New Log</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Summary *</Text>
              <TextInput style={[styles.input, styles.multiline]} value={summary} onChangeText={setSummary} placeholder="What was done today..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Crew *</Text>
              <TextInput style={styles.input} value={crew} onChangeText={setCrew} placeholder="John, Mike, Sarah" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Hours Worked *</Text>
              <TextInput style={styles.input} value={hours} onChangeText={setHours} placeholder="8" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Weather</Text>
              <View style={styles.weatherRow}>
                {["Clear", "Cloudy", "Rain", "Hot"].map(w => (
                  <TouchableOpacity key={w} style={[styles.weatherBtn, weather === w && styles.weatherBtnActive]} onPress={() => setWeather(w)}>
                    <Text style={[styles.weatherBtnText, weather === w && styles.weatherBtnTextActive]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveLog} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save Log</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {logs.length === 0 && !adding ? (
           <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySub}>Scan a receipt or add manually</Text>
          </View>
        ) : (
          logs.map(log => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <Text style={styles.logDate}>{new Date(log.date).toLocaleDateString()}</Text>
                <Text style={styles.logWeather}>{log.weather}</Text>
              </View>
              <Text style={styles.logSummary}>{log.summary}</Text>
              <View style={styles.logMeta}>
                <Text style={styles.logMetaText}>👷 {log.crew}</Text>
                <Text style={styles.logMetaText}>⏱ {log.hoursWorked}hrs</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {!adding && (
        <View style={styles.fab}>
          <TouchableOpacity style={styles.fabBtn} onPress={() => setAdding(true)}>
            <Text style={styles.fabText}>Add Daily Log</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 120, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { marginBottom: 20 },
  backText: { color: "#F97316", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", marginBottom: 20 },
  addCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E8E6E1" },
  addTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  multiline: { height: 80, textAlignVertical: "top" },
  weatherRow: { flexDirection: "row", gap: 8 },
  weatherBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  weatherBtnActive: { backgroundColor: "#F97316", borderColor: "#F97316" },
  weatherBtnText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  weatherBtnTextActive: { color: "white" },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  logCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  logTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  logDate: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  logWeather: { fontSize: 12, color: "#9CA3AF" },
  logSummary: { fontSize: 14, color: "#374151", marginBottom: 10, lineHeight: 20 },
  logMeta: { flexDirection: "row", gap: 14 },
  logMetaText: { fontSize: 12, color: "#6B7280" },
  fab: { position: "absolute", bottom: 30, left: 20, right: 20 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})