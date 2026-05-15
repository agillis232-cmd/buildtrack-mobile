import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert, Modal } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import DateTimePicker from "@react-native-community/datetimepicker"

const EVENT_TYPES = ["MEETING", "INSPECTION", "DELIVERY", "ORDER", "OTHER"]

const EVENT_COLORS: Record<string, string> = {
  MEETING: "#3B82F6",
  INSPECTION: "#F97316",
  DELIVERY: "#16A34A",
  ORDER: "#8B5CF6",
  OTHER: "#6B7280",
}

export default function ScheduleScreen() {
  const { token } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [activePicker, setActivePicker] = useState<"date" | "start" | "end" | null>(null)

  const [title, setTitle] = useState("")
  const [type, setType] = useState("MEETING")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [projectId, setProjectId] = useState("")

  useEffect(() => {
    if (token) {
      loadEvents()
      loadProjects()
    }
  }, [token])

  async function loadEvents() {
    try {
      const from = new Date()
      from.setHours(0, 0, 0, 0)
      const to = new Date()
      to.setDate(to.getDate() + 30)
      const res = await fetch(`${API_URL}/api/mobile/schedule?from=${from.toISOString()}&to=${to.toISOString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setEvents(data.events || [])
    } catch (e) {
      console.log("Error loading events:", e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) {
      console.log("Error loading projects:", e)
    }
  }

  function resetForm() {
    setTitle("")
    setType("MEETING")
    setSelectedDate(new Date())
    setStartTime(null)
    setEndTime(null)
    setLocation("")
    setNotes("")
    setProjectId("")
    setEditingEvent(null)
  }

  function openEdit(event: any) {
    setTitle(event.title)
    setType(event.type)
    setSelectedDate(new Date(event.date))
    setLocation(event.location || "")
    setNotes(event.notes || "")
    setProjectId(event.projectId || "")
    setEditingEvent(event)
    setAdding(true)
  }

  async function saveEvent() {
    if (!title) {
      Alert.alert("Error", "Title is required")
      return
    }
    setSaving(true)
    try {
      const formatTime = (d: Date | null) => d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : ""
      const body = {
        title,
        type,
        date: selectedDate.toISOString().split("T")[0],
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        location,
        notes,
        projectId: projectId || null
      }

      const url = editingEvent
        ? `${API_URL}/api/mobile/schedule/${editingEvent.id}`
        : `${API_URL}/api/mobile/schedule`

      const res = await fetch(url, {
        method: editingEvent ? "PUT" : "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.event) {
        console.log("Saved event:", JSON.stringify(data.event))
        if (editingEvent) {
          setEvents(prev => prev.map(e => e.id === data.event.id ? data.event : e))
        } else {
          setEvents(prev => [...prev, data.event].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
        }
        resetForm()
        setAdding(false)
      } else {
        Alert.alert("Error", "Could not save event")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function deleteEvent(eventId: string) {
    Alert.alert("Delete Event", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/mobile/schedule/${eventId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            setEvents(prev => prev.filter(e => e.id !== eventId))
          } catch (e) {
            Alert.alert("Error", "Could not delete event")
          }
        }
      }
    ])
  }

  function onRefresh() {
    setRefreshing(true)
    loadEvents()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(dayAfter.getDate() + 2)

  const todayEvents = events.filter(e => {
    const d = e.date.split("T")[0]
    const t = today.toISOString().split("T")[0]
    return d === t
  })
  const tomorrowEvents = events.filter(e => {
    const d = e.date.split("T")[0]
    const t = tomorrow.toISOString().split("T")[0]
    return d === t
  })
  const upcomingEvents = events.filter(e => {
    const d = e.date.split("T")[0]
    const t = dayAfter.toISOString().split("T")[0]
    return d >= t
  })
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <Text style={styles.pageTitle}>Schedule</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        </View>

        {adding && (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>{editingEvent ? "Edit Event" : "New Event"}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Site inspection, delivery..." placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeRow}>
                  {EVENT_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, type === t && { backgroundColor: EVENT_COLORS[t] + "20", borderColor: EVENT_COLORS[t] }]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[styles.typeBtnText, type === t && { color: EVENT_COLORS[t] }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setActivePicker("date")}>
                <Text style={styles.pickerBtnText}>
                  {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Start Time</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setActivePicker("start")}>
                  <Text style={styles.pickerBtnText}>
                    {startTime ? startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "Set time"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>End Time</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setActivePicker("end")}>
                  <Text style={styles.pickerBtnText}>
                    {endTime ? endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "Set time"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Job site, office..." placeholderTextColor="#9CA3AF" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, projectId === "" && styles.typeBtnActive]}
                    onPress={() => setProjectId("")}
                  >
                    <Text style={[styles.typeBtnText, projectId === "" && styles.typeBtnTextActive]}>None</Text>
                  </TouchableOpacity>
                  {projects.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.typeBtn, projectId === p.id && styles.typeBtnActive]}
                      onPress={() => setProjectId(p.id)}
                    >
                      <Text style={[styles.typeBtnText, projectId === p.id && styles.typeBtnTextActive]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} placeholder="Additional details..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setAdding(false) }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEvent} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>{editingEvent ? "Update" : "Save"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Section title="Today" count={todayEvents.length}>
          {todayEvents.length === 0
            ? <Text style={styles.emptySection}>No events today</Text>
            : todayEvents.map(e => <EventCard key={e.id} event={e} onEdit={openEdit} onDelete={deleteEvent} />)
          }
        </Section>

        <Section title="Tomorrow" count={tomorrowEvents.length}>
          {tomorrowEvents.length === 0
            ? <Text style={styles.emptySection}>No events tomorrow</Text>
            : tomorrowEvents.map(e => <EventCard key={e.id} event={e} onEdit={openEdit} onDelete={deleteEvent} />)
          }
        </Section>

        {upcomingEvents.length > 0 && (
          <Section title="Upcoming" count={upcomingEvents.length}>
            {upcomingEvents.map(e => (
              <View key={e.id}>
                <Text style={styles.upcomingDate}>{formatDate(e.date)}</Text>
                <EventCard event={e} onEdit={openEdit} onDelete={deleteEvent} />
              </View>
            ))}
          </Section>
        )}
      </ScrollView>

      {adding && activePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activePicker === "date" ? "Select Date" : activePicker === "start" ? "Start Time" : "End Time"}
                </Text>
                <TouchableOpacity onPress={() => setActivePicker(null)} style={styles.modalDone}>
                  <Text style={styles.modalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={activePicker === "date" ? selectedDate : activePicker === "start" ? (startTime || new Date()) : (endTime || new Date())}
                mode={activePicker === "date" ? "date" : "time"}
                display="spinner"
                style={{ width: "100%" }}
                onChange={(_, date) => {
                  if (!date) return
                  if (activePicker === "date") setSelectedDate(date)
                  else if (activePicker === "start") setStartTime(date)
                  else setEndTime(date)
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {!adding && (
        <View style={styles.fab}>
          <TouchableOpacity style={styles.fabBtn} onPress={() => setAdding(true)}>
            <Text style={styles.fabText}>Add Event</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

function Section({ title, count, children }: { title: string, count: number, children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  )
}

function EventCard({ event, onEdit, onDelete }: { event: any, onEdit: (e: any) => void, onDelete: (id: string) => void }) {
  const color = EVENT_COLORS[event.type] || "#6B7280"
  const [expanded, setExpanded] = useState(false)

  return (
    <TouchableOpacity
      style={[styles.eventCard, { borderLeftColor: color }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.eventTop}>
        <View style={[styles.typePill, { backgroundColor: color + "20" }]}>
          <Text style={[styles.typePillText, { color }]}>{event.type}</Text>
        </View>
        {event.startTime && (
          <Text style={styles.eventTime}>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}</Text>
        )}
      </View>
      <Text style={styles.eventTitle}>{event.title}</Text>
      {event.project && <Text style={styles.eventProject}>{event.project.name}</Text>}
      {event.location && <Text style={styles.eventLocation}>{event.location}</Text>}
      {event.notes && <Text style={styles.eventNotes}>{event.notes}</Text>}

      {expanded && (
        <View style={styles.eventActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(event)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(event.id)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 120, paddingTop: 70 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: { fontSize: 28, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 0 },
  addCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "#E8E6E1" },
  addTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  multiline: { height: 80, textAlignVertical: "top" },
  pickerBtn: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E8E6E1" },
  pickerBtnText: { fontSize: 15, color: "#1A1A1A", fontWeight: "500" },
  timeRow: { flexDirection: "row", gap: 10 },
  typeRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  typeBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  typeBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  typeBtnTextActive: { color: "white" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  countBadge: { backgroundColor: "#F3F4F6", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  emptySection: { fontSize: 13, color: "#9CA3AF", fontStyle: "italic", paddingVertical: 8 },
  upcomingDate: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 6, marginTop: 4 },
  eventCard: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#E8E6E1", borderLeftWidth: 4 },
  eventTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  typePillText: { fontSize: 11, fontWeight: "700" },
  eventTime: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  eventTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  eventProject: { fontSize: 12, color: "#F97316", fontWeight: "600", marginBottom: 2 },
  eventLocation: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  eventNotes: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  eventActions: { flexDirection: "row", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  editBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 8, padding: 10, alignItems: "center" },
  editBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  deleteBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 8, padding: 10, alignItems: "center" },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
  fab: { position: "absolute", bottom: 30, left: 20, right: 20 },
  fabBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  modalDone: { backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalDoneText: { color: "white", fontWeight: "700", fontSize: 14 },
  headerBanner: { backgroundColor: "#1C1F26", marginHorizontal: -20, marginTop: -70, paddingHorizontal: 20, paddingTop: 70, paddingBottom: 24, marginBottom: 24, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
})