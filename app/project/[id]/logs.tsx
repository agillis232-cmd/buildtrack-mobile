import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"
import { loadCached } from "@/lib/cache"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

const WEATHER_OPTIONS = ["Clear", "Partly Cloudy", "Cloudy", "Rain", "Snow", "Windy", "Hot", "Cold"]
const DELAY_REASONS = ["None", "Weather", "Material delay", "Sub no-show", "Inspection delay", "Client decision", "Permit issue", "Other"]

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export default function LogsScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewingLog, setViewingLog] = useState<any>(null)
  const [editingLog, setEditingLog] = useState<any>(null)
  const [showMore, setShowMore] = useState(false)

  // Form fields
  const [date, setDate] = useState(todayString())
  const [summary, setSummary] = useState("")
  const [crew, setCrew] = useState("")
  const [hours, setHours] = useState("8")
  const [weather, setWeather] = useState("Clear")
  const [temperature, setTemperature] = useState("")
  const [windConditions, setWindConditions] = useState("")
  const [workAreas, setWorkAreas] = useState("")
  const [subsOnSite, setSubsOnSite] = useState("")
  const [visitors, setVisitors] = useState("")
  const [materialsReceived, setMaterialsReceived] = useState("")
  const [equipmentUsed, setEquipmentUsed] = useState("")
  const [issues, setIssues] = useState("")
  const [safetyIncidents, setSafetyIncidents] = useState("")
  const [delayHours, setDelayHours] = useState("0")
  const [delayReason, setDelayReason] = useState("None")
  const [notes, setNotes] = useState("")
  const [entries, setEntries] = useState<{ time: string; description: string }[]>([])

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    try {
      await loadCached(`/api/mobile/projects/${id}/logs`, token, data => {
        setLogs(data.logs || [])
        setLoading(false)
      })
    } catch (e) { console.log(e) }
    setLoading(false)
  }

  function resetForm() {
    setDate(todayString()); setSummary(""); setCrew(""); setHours("8"); setWeather("Clear")
    setTemperature(""); setWindConditions(""); setWorkAreas(""); setSubsOnSite("")
    setVisitors(""); setMaterialsReceived(""); setEquipmentUsed(""); setIssues("")
    setSafetyIncidents(""); setDelayHours("0"); setDelayReason("None"); setNotes("")
    setEntries([]); setShowMore(false)
  }

  function startEdit(log: any) {
    setEditingLog(log)
    setDate(log.date.split("T")[0])
    setSummary(log.summary || "")
    setCrew(log.crew || "")
    setHours(String(log.hoursWorked || 8))
    setWeather(log.weather || "Clear")
    setTemperature(log.temperature || "")
    setWindConditions(log.windConditions || "")
    setWorkAreas(log.workAreas || "")
    setSubsOnSite(log.subsOnSite || "")
    setVisitors(log.visitors || "")
    setMaterialsReceived(log.materialsReceived || "")
    setEquipmentUsed(log.equipmentUsed || "")
    setIssues(log.issues || "")
    setSafetyIncidents(log.safetyIncidents || "")
    setDelayHours(String(log.delayHours || 0))
    setDelayReason(log.delayReason || "None")
    setNotes(log.notes || "")
    setEntries(log.entries?.map((e: any) => ({ time: e.time, description: e.description })) || [])
    setShowMore(true)
    setAdding(true)
    setViewingLog(null)
  }

  async function saveLog() {
    if (!summary || !crew) {
      Alert.alert("Error", "Summary and crew are required")
      return
    }
    setSaving(true)
    try {
      const url = editingLog
        ? `${API_URL}/api/mobile/projects/${id}/logs/${editingLog.id}`
        : `${API_URL}/api/mobile/projects/${id}/logs`
      
      const res = await fetch(url, {
        method: editingLog ? "PATCH" : "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date, summary, crew, hoursWorked: parseInt(hours) || 0, weather,
          temperature: temperature || null, windConditions: windConditions || null,
          workAreas: workAreas || null, subsOnSite: subsOnSite || null,
          visitors: visitors || null, materialsReceived: materialsReceived || null,
          equipmentUsed: equipmentUsed || null, issues: issues || null,
          safetyIncidents: safetyIncidents || null,
          delayHours: parseFloat(delayHours) || 0, delayReason: delayReason || null,
          notes: notes || null,
          entries: entries.filter(e => e.time && e.description),
        })
      })
      const data = await res.json()
      if (data.log) {
        if (editingLog) {
          setLogs(prev => prev.map(l => l.id === data.log.id ? { ...l, ...data.log } : l))
        } else {
          setLogs(prev => [data.log, ...prev])
        }
        resetForm()
        setAdding(false)
        setEditingLog(null)
      } else {
        Alert.alert("Error", data.error || "Could not save log")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function deleteLog(logId: string) {
    Alert.alert("Delete Log", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/daily-logs/${logId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
              setLogs(prev => prev.filter(l => l.id !== logId))
              setViewingLog(null)
            } else Alert.alert("Error", "Could not delete")
          } catch (e) { Alert.alert("Error", "Connection error") }
        }
      }
    ])
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.tint} /></View>

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text style={s.headerTitle}>Daily logs</Text>
          <Text style={s.headerSub}>{logs.length} logs filed</Text>
        </View>

        {/* Add/Edit form */}
        {adding && (
          <View style={s.formCard}>
            <View style={s.formHeader}>
              <Text style={s.formTitle}>{editingLog ? "Edit log" : "New daily log"}</Text>
              <TouchableOpacity onPress={() => { setAdding(false); setEditingLog(null); resetForm() }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Date */}
            <View style={s.field}>
              <Text style={s.label}>Date</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={s.input} />
            </View>

            {/* Crew & Hours */}
            <View style={s.row}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Crew on site *</Text>
                <TextInput value={crew} onChangeText={setCrew} placeholder="e.g. 4 crew + 2 subs" style={s.input} />
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Hours</Text>
                <TextInput value={hours} onChangeText={setHours} keyboardType="numeric" style={s.input} />
              </View>
            </View>

            {/* Weather */}
            <View style={s.field}>
              <Text style={s.label}>Weather</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.weatherRow}>
                  {WEATHER_OPTIONS.map(w => (
                    <TouchableOpacity key={w} onPress={() => setWeather(w)} style={[s.weatherBtn, weather === w && s.weatherBtnActive]}>
                      <Text style={[s.weatherText, weather === w && s.weatherTextActive]}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Summary */}
            <View style={s.field}>
              <Text style={s.label}>Work summary *</Text>
              <TextInput value={summary} onChangeText={setSummary} placeholder="Describe work completed..." multiline numberOfLines={4} style={[s.input, { height: 100, textAlignVertical: "top" }]} />
            </View>

            {/* Timeline entries */}
            <View style={s.field}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={s.label}>Timeline entries</Text>
                <TouchableOpacity onPress={() => setEntries(prev => [...prev, { time: "", description: "" }])}>
                  <Text style={{ fontSize: 12, color: colors.tint, fontWeight: "600" }}>+ Add entry</Text>
                </TouchableOpacity>
              </View>
              {entries.map((entry, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <TextInput value={entry.time} onChangeText={t => setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, time: t } : e))} placeholder="8:00 AM" style={[s.input, { width: 80, fontSize: 12 }]} />
                  <TextInput value={entry.description} onChangeText={t => setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, description: t } : e))} placeholder="Activity" style={[s.input, { flex: 1, fontSize: 12 }]} />
                  <TouchableOpacity onPress={() => setEntries(prev => prev.filter((_, idx) => idx !== i))}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Show more toggle */}
            <TouchableOpacity onPress={() => setShowMore(!showMore)} style={s.showMoreBtn}>
              <Text style={s.showMoreText}>{showMore ? "Show less" : "Show more fields"}</Text>
              <Ionicons name={showMore ? "chevron-up" : "chevron-down"} size={14} color={colors.tint} />
            </TouchableOpacity>

            {showMore && (
              <>
                {/* Temperature & Wind */}
                <View style={s.row}>
                  <View style={[s.field, { flex: 1 }]}>
                    <Text style={s.label}>Temperature</Text>
                    <TextInput value={temperature} onChangeText={setTemperature} placeholder="85°F / 62°F" style={s.input} />
                  </View>
                  <View style={[s.field, { flex: 1 }]}>
                    <Text style={s.label}>Wind</Text>
                    <TextInput value={windConditions} onChangeText={setWindConditions} placeholder="Light 5-10mph" style={s.input} />
                  </View>
                </View>

                {/* Work areas */}
                <View style={s.field}>
                  <Text style={s.label}>Work areas</Text>
                  <TextInput value={workAreas} onChangeText={setWorkAreas} placeholder="Kitchen, 2nd floor bath" style={s.input} />
                </View>

                {/* Subs & Visitors */}
                <View style={s.field}>
                  <Text style={s.label}>Subcontractors on site</Text>
                  <TextInput value={subsOnSite} onChangeText={setSubsOnSite} placeholder="ABC Plumbing, XYZ Electric" multiline style={[s.input, { height: 60, textAlignVertical: "top" }]} />
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Visitors / inspections</Text>
                  <TextInput value={visitors} onChangeText={setVisitors} placeholder="City inspector — rough plumbing" multiline style={[s.input, { height: 60, textAlignVertical: "top" }]} />
                </View>

                {/* Materials & Equipment */}
                <View style={s.row}>
                  <View style={[s.field, { flex: 1 }]}>
                    <Text style={s.label}>Materials received</Text>
                    <TextInput value={materialsReceived} onChangeText={setMaterialsReceived} placeholder="Lumber, drywall" multiline style={[s.input, { height: 60, textAlignVertical: "top" }]} />
                  </View>
                  <View style={[s.field, { flex: 1 }]}>
                    <Text style={s.label}>Equipment used</Text>
                    <TextInput value={equipmentUsed} onChangeText={setEquipmentUsed} placeholder="Excavator, pump" multiline style={[s.input, { height: 60, textAlignVertical: "top" }]} />
                  </View>
                </View>

                {/* Delays */}
                <View style={s.row}>
                  <View style={[s.field, { flex: 1 }]}>
                    <Text style={s.label}>Delay hours</Text>
                    <TextInput value={delayHours} onChangeText={setDelayHours} keyboardType="numeric" style={s.input} />
                  </View>
                  <View style={[s.field, { flex: 2 }]}>
                    <Text style={s.label}>Delay reason</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={s.weatherRow}>
                        {DELAY_REASONS.map(r => (
                          <TouchableOpacity key={r} onPress={() => setDelayReason(r)} style={[s.weatherBtn, delayReason === r && { backgroundColor: "#DC2626", borderColor: "#DC2626" }]}>
                            <Text style={[s.weatherText, delayReason === r && { color: "white" }]}>{r}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                {/* Issues */}
                <View style={s.field}>
                  <Text style={s.label}>Issues / problems</Text>
                  <TextInput value={issues} onChangeText={setIssues} placeholder="Any issues or concerns..." multiline style={[s.input, { height: 60, textAlignVertical: "top" }]} />
                </View>

                {/* Safety */}
                <View style={s.field}>
                  <Text style={[s.label, { color: colors.danger }]}>Safety incidents</Text>
                  <TextInput value={safetyIncidents} onChangeText={setSafetyIncidents} placeholder="Document any safety incidents..." multiline style={[s.input, { height: 60, textAlignVertical: "top", borderColor: safetyIncidents ? "#FECACA" : "#E8E6E1" }]} />
                </View>

                {/* Notes */}
                <View style={s.field}>
                  <Text style={s.label}>Additional notes</Text>
                  <TextInput value={notes} onChangeText={setNotes} placeholder="Any other notes..." multiline style={[s.input, { height: 60, textAlignVertical: "top" }]} />
                </View>
              </>
            )}

            {/* Buttons */}
            <View style={s.formBtns}>
              <TouchableOpacity onPress={() => { setAdding(false); setEditingLog(null); resetForm() }} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveLog} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.6 }]}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.saveBtnText}>{editingLog ? "Save changes" : "File log"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Log list */}
        {logs.length === 0 && !adding ? (
          <View style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={36} color={colors.chevron} />
            <Text style={s.emptyTitle}>No daily logs yet</Text>
            <Text style={s.emptySub}>Tap the button below to file your first daily log</Text>
          </View>
        ) : (
          logs.map(log => (
            <TouchableOpacity key={log.id} style={s.logCard} onPress={() => setViewingLog(log)} activeOpacity={0.8}>
              <View style={s.logTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.logDate}>
                    {new Date(log.date.split("T")[0] + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Text>
                  <Text style={s.logMeta}>
                    {log.weather} · {log.hoursWorked}h · {log.crew}
                  </Text>
                  {log.createdBy?.name && <Text style={s.logCreator}>by {log.createdBy.name}</Text>}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {log.issues && <Ionicons name="warning-outline" size={14} color="#D97706" />}
                  {log.signedBy && <Ionicons name="checkmark-circle" size={14} color={colors.success} />}
                  {log.photos?.length > 0 && (
                    <View style={s.photoBadge}>
                      <Ionicons name="camera-outline" size={10} color={colors.textSecondary} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600" }}>{log.photos.length}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={colors.chevron} />
                </View>
              </View>
              <Text style={s.logSummary} numberOfLines={2}>{log.summary}</Text>
              {log.entries?.length > 0 && (
                <View style={s.entryPreview}>
                  {log.entries.slice(0, 2).map((e: any) => (
                    <Text key={e.id} style={s.entryText}><Text style={{ color: colors.tint, fontWeight: "600" }}>{e.time}</Text> — {e.description}</Text>
                  ))}
                  {log.entries.length > 2 && <Text style={s.entryMore}>+{log.entries.length - 2} more</Text>}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      {!adding && (
        <View style={s.fab}>
          <TouchableOpacity onPress={() => { resetForm(); setAdding(true) }} style={s.fabBtn}>
            <Text style={s.fabText}>+ New daily log</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View detail modal */}
      <Modal visible={!!viewingLog} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {viewingLog && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <View>
                      <Text style={s.modalTitle}>Daily report</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {new Date(viewingLog.date.split("T")[0] + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setViewingLog(null)}>
                      <Ionicons name="close" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Signature status */}
                  {viewingLog.signedBy ? (
                    <View style={s.signedBanner}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={{ fontSize: 12, color: colors.success, fontWeight: "600" }}>Signed by {viewingLog.signedBy}</Text>
                    </View>
                  ) : (
                    <View style={s.unsignedBanner}>
                      <Ionicons name="warning-outline" size={14} color="#D97706" />
                      <Text style={{ fontSize: 12, color: "#D97706", fontWeight: "600" }}>Unsigned</Text>
                    </View>
                  )}

                  {/* KPIs */}
                  <View style={s.kpiRow}>
                    <View style={s.kpi}><Text style={s.kpiLabel}>Crew</Text><Text style={s.kpiValue}>{viewingLog.crew}</Text></View>
                    <View style={s.kpi}><Text style={s.kpiLabel}>Hours</Text><Text style={s.kpiValue}>{viewingLog.hoursWorked}h</Text></View>
                    <View style={s.kpi}><Text style={s.kpiLabel}>Weather</Text><Text style={s.kpiValue}>{viewingLog.weather}</Text></View>
                  </View>

                  {viewingLog.temperature && <Text style={s.detailText}>Temp: {viewingLog.temperature}{viewingLog.windConditions ? ` · Wind: ${viewingLog.windConditions}` : ""}</Text>}

                  {/* Summary */}
                  <View style={s.section}>
                    <Text style={s.sectionLabel}>Work summary</Text>
                    <View style={s.sectionBox}><Text style={s.sectionText}>{viewingLog.summary}</Text></View>
                  </View>

                  {/* Timeline */}
                  {viewingLog.entries?.length > 0 && (
                    <View style={s.section}>
                      <Text style={s.sectionLabel}>Timeline</Text>
                      {viewingLog.entries.map((e: any) => (
                        <View key={e.id} style={s.timelineEntry}>
                          <Text style={s.timelineTime}>{e.time}</Text>
                          <Text style={s.timelineDesc}>{e.description}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Detail sections */}
                  {[
                    { label: "Subcontractors on site", value: viewingLog.subsOnSite },
                    { label: "Visitors / inspections", value: viewingLog.visitors },
                    { label: "Materials received", value: viewingLog.materialsReceived },
                    { label: "Equipment used", value: viewingLog.equipmentUsed },
                    { label: "Work areas", value: viewingLog.workAreas },
                    { label: "Notes", value: viewingLog.notes },
                  ].filter(s => s.value).map((section, i) => (
                    <View key={i} style={s.section}>
                      <Text style={s.sectionLabel}>{section.label}</Text>
                      <Text style={s.detailText}>{section.value}</Text>
                    </View>
                  ))}

                  {/* Issues */}
                  {viewingLog.issues && (
                    <View style={s.issueBox}>
                      <Text style={s.issueLabel}>Issues</Text>
                      <Text style={s.issueText}>{viewingLog.issues}</Text>
                    </View>
                  )}

                  {viewingLog.delayHours > 0 && (
                    <Text style={[s.detailText, { color: colors.danger, fontWeight: "600" }]}>Delay: {viewingLog.delayHours}h — {viewingLog.delayReason || "Not specified"}</Text>
                  )}

                  {viewingLog.safetyIncidents && (
                    <View style={s.safetyBox}>
                      <Text style={s.safetyLabel}>Safety incident</Text>
                      <Text style={s.safetyText}>{viewingLog.safetyIncidents}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={s.modalActions}>
                    <TouchableOpacity onPress={() => startEdit(viewingLog)} style={s.modalEditBtn}>
                      <Ionicons name="pencil-outline" size={16} color={colors.text} />
                      <Text style={s.modalEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteLog(viewingLog.id)} style={s.modalDeleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={s.modalDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  headerTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6 },
  headerSub: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
  formCard: { backgroundColor: "white", margin: 16, borderRadius: 16, padding: 20 },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  formTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 4 },
  input: { backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 12, fontSize: 14, color: colors.text },
  row: { flexDirection: "row", gap: 10 },
  weatherRow: { flexDirection: "row", gap: 6 },
  weatherBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: colors.fillSubtle },
  weatherBtnActive: { backgroundColor: colors.charcoal, borderColor: "#F97316" },
  weatherText: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  weatherTextActive: { color: "white" },
  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, padding: 10, marginBottom: 12 },
  showMoreText: { fontSize: 13, color: colors.tint, fontWeight: "600" },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 14, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 1, backgroundColor: colors.charcoal, borderRadius: 10, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 10, marginBottom: 4 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },
  logCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10 },
  logTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  logDate: { fontSize: 14, fontWeight: "700", color: colors.text },
  logMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  logCreator: { fontSize: 11, color: colors.chevron, marginTop: 1 },
  logSummary: { fontSize: 13, color: colors.text, lineHeight: 20 },
  photoBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.fillSubtle, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  entryPreview: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.separator },
  entryText: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  entryMore: { fontSize: 11, color: colors.tint, fontWeight: "600", marginTop: 2 },
  fab: { position: "absolute", bottom: 30, left: 16, right: 16 },
  fabBtn: { backgroundColor: colors.charcoal, borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  signedBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, backgroundColor: "#DCFCE7", marginBottom: 12 },
  unsignedBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, backgroundColor: "#FEF3C7", marginBottom: 12 },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpi: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.fillSubtle, alignItems: "center" },
  kpiLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  kpiValue: { fontSize: 15, fontWeight: "700", color: colors.text },
  section: { marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  sectionBox: { padding: 12, borderRadius: 8, backgroundColor: colors.fillSubtle },
  sectionText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  detailText: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  timelineEntry: { flexDirection: "row", gap: 8, marginBottom: 4, alignItems: "flex-start" },
  timelineTime: { fontSize: 12, fontWeight: "600", color: colors.tint, minWidth: 65 },
  timelineDesc: { fontSize: 12, color: colors.text, flex: 1 },
  issueBox: { padding: 12, borderRadius: 8, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A", marginBottom: 12 },
  issueLabel: { fontSize: 11, fontWeight: "600", color: "#D97706", marginBottom: 4 },
  issueText: { fontSize: 13, color: "#92400E", lineHeight: 20 },
  safetyBox: { padding: 12, borderRadius: 8, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA", marginBottom: 12 },
  safetyLabel: { fontSize: 11, fontWeight: "600", color: colors.danger, marginBottom: 4 },
  safetyText: { fontSize: 13, color: "#7F1D1D", lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.separator },
  modalEditBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, backgroundColor: colors.fillSubtle },
  modalEditText: { fontSize: 14, fontWeight: "600", color: colors.text },
  modalDeleteBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, backgroundColor: "#FEE2E2" },
  modalDeleteText: { fontSize: 14, fontWeight: "600", color: colors.danger },
})