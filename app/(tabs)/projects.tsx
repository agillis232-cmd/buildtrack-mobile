import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert, Modal, Dimensions } from "react-native"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Linking } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const EVENT_TYPES = ["MEETING", "INSPECTION", "DELIVERY", "ORDER", "OTHER"]
const SCREEN_WIDTH = Dimensions.get("window").width

const EVENT_COLORS: Record<string, string> = {
  MEETING: "#3B82F6",
  INSPECTION: "#F97316",
  DELIVERY: "#16A34A",
  ORDER: "#8B5CF6",
  MILESTONE: "#EC4899",
  DEADLINE: "#DC2626",
  OTHER: "#6B7280",
}

const EVENT_ICONS: Record<string, string> = {
  MEETING: "people-outline",
  INSPECTION: "search-outline",
  DELIVERY: "cube-outline",
  ORDER: "cart-outline",
  MILESTONE: "flag-outline",
  DEADLINE: "alarm-outline",
  OTHER: "ellipse-outline",
}

function getWeekDays(baseDate: Date) {
  const start = new Date(baseDate)
  start.setDate(start.getDate() - start.getDay()) // Sunday
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

function isSameDay(a: Date, b: Date) {
  return a.toISOString().split("T")[0] === b.toISOString().split("T")[0]
}

function formatDateKey(d: Date) {
  return d.toISOString().split("T")[0]
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
  const [viewMode, setViewMode] = useState<"week" | "day">("week")
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [weekBase, setWeekBase] = useState(new Date())

  const [title, setTitle] = useState("")
  const [type, setType] = useState("MEETING")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [projectId, setProjectId] = useState("")
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekDays = getWeekDays(weekBase)

  useEffect(() => {
    if (token) {
      loadEvents()
      loadProjects()
      checkCalendarStatus()
    }
  }, [token])

  async function loadEvents() {
    try {
      const from = new Date()
      from.setDate(from.getDate() - 30)
      const to = new Date()
      to.setDate(to.getDate() + 60)
      const res = await fetch(`${API_URL}/api/mobile/schedule?from=${from.toISOString()}&to=${to.toISOString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setEvents(data.events || [])
    } catch (e) { console.log("Error loading events:", e) }
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
    } catch (e) { console.log(e) }
  }

  async function checkCalendarStatus() {
    try {
      const res = await fetch(`${API_URL}/api/google-calendar/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setCalendarConnected(data.connected)
    } catch (e) { console.log(e) }
  }

  async function syncFromGoogle() {
    setSyncing(true)
    try {
      const res = await fetch(`${API_URL}/api/google-calendar/sync`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull" })
      })
      const data = await res.json()
      if (data.success) {
        Alert.alert("Synced!", `Imported ${data.imported} event${data.imported !== 1 ? "s" : ""}`)
        loadEvents()
      }
    } catch (e) { Alert.alert("Error", "Could not sync") }
    setSyncing(false)
  }

  async function connectCalendar() {
    try {
      const res = await fetch(`${API_URL}/api/google-calendar/connect`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.authUrl) Linking.openURL(data.authUrl)
    } catch (e) { Alert.alert("Error", "Could not connect") }
  }

  function resetForm() {
    setTitle(""); setType("MEETING"); setSelectedDate(new Date())
    setStartTime(null); setEndTime(null); setLocation(""); setNotes("")
    setProjectId(""); setEditingEvent(null)
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
    if (!title) { Alert.alert("Error", "Title is required"); return }
    setSaving(true)
    try {
      const formatTime = (d: Date | null) => d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : ""
      const body = {
        title, type,
        date: selectedDate.toISOString().split("T")[0],
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        location, notes,
        projectId: projectId || null
      }
      const url = editingEvent ? `${API_URL}/api/mobile/schedule/${editingEvent.id}` : `${API_URL}/api/mobile/schedule`
      const res = await fetch(url, {
        method: editingEvent ? "PUT" : "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.event) {
        if (editingEvent) {
          setEvents(prev => prev.map(e => e.id === data.event.id ? data.event : e))
        } else {
          setEvents(prev => [...prev, data.event].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
        }
        resetForm(); setAdding(false)
      } else { Alert.alert("Error", "Could not save event") }
    } catch (e) { Alert.alert("Error", "Connection error") }
    setSaving(false)
  }

  async function deleteEvent(eventId: string) {
    Alert.alert("Delete Event", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await fetch(`${API_URL}/api/mobile/schedule/${eventId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
          })
          setEvents(prev => prev.filter(e => e.id !== eventId))
        } catch (e) { Alert.alert("Error", "Could not delete") }
      }}
    ])
  }

  function shiftWeek(dir: number) {
    const d = new Date(weekBase)
    d.setDate(d.getDate() + dir * 7)
    setWeekBase(d)
  }

  function goToToday() {
    setWeekBase(new Date())
    setSelectedDay(new Date())
  }

  // Get events for a specific day
  function eventsForDay(day: Date) {
    const key = formatDateKey(day)
    return events.filter(e => e.date?.split("T")[0] === key)
  }

  // Get events for the selected day
  const dayEvents = eventsForDay(selectedDay)

  // Unique projects in current events for legend
  const projectsInView = [...new Set(events.filter(e => e.project).map(e => e.project.name))]

  if (loading) return <View style={s.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents() }} tintColor="#F97316" />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerCircle} />
          <View style={s.headerTop}>
            <View>
              <Text style={s.headerTitle}>Schedule</Text>
              <Text style={s.headerSub}>{events.length} events across {projectsInView.length} projects</Text>
            </View>
            <View style={s.headerActions}>
              {calendarConnected ? (
                <TouchableOpacity style={s.syncChip} onPress={syncFromGoogle} disabled={syncing}>
                  {syncing ? <ActivityIndicator color="white" size="small" /> : (
                    <>
                      <Ionicons name="sync-outline" size={14} color="white" />
                      <Text style={s.syncChipText}>Sync</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.connectChip} onPress={connectCalendar}>
                  <Ionicons name="logo-google" size={14} color="white" />
                  <Text style={s.syncChipText}>Connect</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Week Navigation */}
          <View style={s.weekNav}>
            <TouchableOpacity onPress={() => shiftWeek(-1)} style={s.weekArrow}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday}>
              <Text style={s.weekLabel}>
                {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => shiftWeek(1)} style={s.weekArrow}>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Week Strip */}
          <View style={s.weekStrip}>
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today)
              const isSelected = isSameDay(day, selectedDay)
              const dayEvts = eventsForDay(day)
              const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

              return (
                <TouchableOpacity
                  key={i}
                  style={[s.dayCell, isSelected && s.dayCellSelected, isToday && !isSelected && s.dayCellToday]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[s.dayName, isSelected && s.dayNameSelected]}>{dayNames[i]}</Text>
                  <Text style={[s.dayNum, isSelected && s.dayNumSelected, isToday && !isSelected && s.dayNumToday]}>{day.getDate()}</Text>
                  {/* Event dots */}
                  <View style={s.dotRow}>
                    {dayEvts.slice(0, 3).map((evt, j) => (
                      <View key={j} style={[s.dot, { backgroundColor: EVENT_COLORS[evt.type] || "#6B7280" }]} />
                    ))}
                    {dayEvts.length > 3 && <Text style={s.dotMore}>+</Text>}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Day Header */}
        <View style={s.dayHeader}>
          <Text style={s.dayHeaderText}>
            {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
          <Text style={s.dayHeaderCount}>{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</Text>
        </View>

        {/* Day Timeline */}
        {dayEvents.length === 0 ? (
          <View style={s.emptyDay}>
            <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
            <Text style={s.emptyDayTitle}>No events</Text>
            <Text style={s.emptyDaySub}>Tap + to add an event for this day</Text>
          </View>
        ) : (
          dayEvents.sort((a, b) => {
            if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
            return 0
          }).map(event => {
            const color = EVENT_COLORS[event.type] || "#6B7280"
            const iconName = EVENT_ICONS[event.type] || "ellipse-outline"
            return (
              <View key={event.id} style={[s.eventCard, { borderLeftColor: color }]}>
                <View style={s.eventRow}>
                  <View style={[s.eventIconBox, { backgroundColor: color + "15" }]}>
                    <Ionicons name={iconName as any} size={18} color={color} />
                  </View>
                  <View style={s.eventContent}>
                    <View style={s.eventTopRow}>
                      <Text style={s.eventTitle}>{event.title}</Text>
                      {event.startTime && (
                        <Text style={s.eventTime}>
                          {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
                        </Text>
                      )}
                    </View>
                    {event.project && (
                      <View style={s.eventProjectRow}>
                        <Ionicons name="folder-outline" size={11} color="#F97316" />
                        <Text style={s.eventProject}>{event.project.name}</Text>
                      </View>
                    )}
                    {event.location && (
                      <View style={s.eventProjectRow}>
                        <Ionicons name="location-outline" size={11} color="#6B7280" />
                        <Text style={s.eventLocation}>{event.location}</Text>
                      </View>
                    )}
                    {event.notes && <Text style={s.eventNotes}>{event.notes}</Text>}
                  </View>
                </View>

                {/* Actions */}
                <View style={s.eventActions}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(event)}>
                    <Ionicons name="create-outline" size={14} color="#374151" />
                    <Text style={s.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => {
                    setSelectedDate(new Date(new Date(event.date).getTime() + 86400000))
                    openEdit(event)
                  }}>
                    <Ionicons name="arrow-forward-outline" size={14} color="#374151" />
                    <Text style={s.actionBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => deleteEvent(event.id)}>
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                    <Text style={[s.actionBtnText, { color: "#DC2626" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}

        {/* Add/Edit Form Modal */}
        {adding && (
          <View style={s.addCard}>
            <View style={s.addHeader}>
              <Text style={s.addTitle}>{editingEvent ? "Edit Event" : "New Event"}</Text>
              <TouchableOpacity onPress={() => { resetForm(); setAdding(false) }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Title *</Text>
              <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Site inspection, delivery..." placeholderTextColor="#9CA3AF" />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.typeRow}>
                  {EVENT_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeBtn, type === t && { backgroundColor: EVENT_COLORS[t] + "20", borderColor: EVENT_COLORS[t] }]}
                      onPress={() => setType(t)}
                    >
                      <Ionicons name={(EVENT_ICONS[t] || "ellipse-outline") as any} size={14} color={type === t ? EVENT_COLORS[t] : "#6B7280"} />
                      <Text style={[s.typeBtnText, type === t && { color: EVENT_COLORS[t] }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Date *</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setActivePicker("date")}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={s.pickerBtnText}>
                  {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.timeRow}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>Start</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setActivePicker("start")}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={s.pickerBtnText}>
                    {startTime ? startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Set time"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>End</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setActivePicker("end")}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={s.pickerBtnText}>
                    {endTime ? endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Set time"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.typeRow}>
                  <TouchableOpacity style={[s.typeBtn, !projectId && s.typeBtnActive]} onPress={() => setProjectId("")}>
                    <Text style={[s.typeBtnText, !projectId && s.typeBtnTextActive]}>None</Text>
                  </TouchableOpacity>
                  {projects.map(p => (
                    <TouchableOpacity key={p.id} style={[s.typeBtn, projectId === p.id && s.typeBtnActive]} onPress={() => setProjectId(p.id)}>
                      <Text style={[s.typeBtnText, projectId === p.id && s.typeBtnTextActive]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Location</Text>
              <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Job site, office..." placeholderTextColor="#9CA3AF" />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Notes</Text>
              <TextInput style={[s.input, { height: 70, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} placeholder="Details..." placeholderTextColor="#9CA3AF" multiline />
            </View>

            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { resetForm(); setAdding(false) }}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveEvent} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={s.saveBtnText}>{editingEvent ? "Update" : "Save"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Date/Time Picker Modal */}
      {adding && activePicker && (
        <Modal transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {activePicker === "date" ? "Select Date" : activePicker === "start" ? "Start Time" : "End Time"}
                </Text>
                <TouchableOpacity onPress={() => setActivePicker(null)} style={s.modalDone}>
                  <Text style={s.modalDoneText}>Done</Text>
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

      {/* FAB */}
      {!adding && (
        <TouchableOpacity style={s.fab} onPress={() => { setSelectedDate(selectedDay); setAdding(true) }}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={s.fabText}>Add Event</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  scrollContent: { paddingBottom: 120 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: { backgroundColor: "#1C1F26", paddingTop: 60, paddingBottom: 8, paddingHorizontal: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "white", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  syncChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#4285F4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  connectChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  syncChipText: { color: "white", fontSize: 12, fontWeight: "600" },

  // Week nav
  weekNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  weekArrow: { padding: 4 },
  weekLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)" },

  // Week strip
  weekStrip: { flexDirection: "row", gap: 4, marginBottom: 12 },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)" },
  dayCellSelected: { backgroundColor: "#F97316" },
  dayCellToday: { backgroundColor: "rgba(249,115,22,0.2)" },
  dayName: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.4)", marginBottom: 4 },
  dayNameSelected: { color: "rgba(255,255,255,0.8)" },
  dayNum: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.7)", marginBottom: 4 },
  dayNumSelected: { color: "white" },
  dayNumToday: { color: "#F97316" },
  dotRow: { flexDirection: "row", gap: 2, height: 6, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotMore: { fontSize: 8, color: "rgba(255,255,255,0.4)", fontWeight: "700" },

  // Day header
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  dayHeaderText: { fontSize: 16, fontWeight: "700", color: "#1C1F26" },
  dayHeaderCount: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },

  // Empty day
  emptyDay: { alignItems: "center", paddingTop: 40, paddingBottom: 20 },
  emptyDayTitle: { fontSize: 16, fontWeight: "700", color: "#9CA3AF", marginTop: 12 },
  emptyDaySub: { fontSize: 13, color: "#D1D5DB", marginTop: 4 },

  // Event card
  eventCard: { backgroundColor: "white", borderRadius: 12, marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1", borderLeftWidth: 4, overflow: "hidden" },
  eventRow: { flexDirection: "row", padding: 14, gap: 12 },
  eventIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  eventContent: { flex: 1 },
  eventTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  eventTitle: { fontSize: 15, fontWeight: "700", color: "#1C1F26", flex: 1, marginRight: 8 },
  eventTime: { fontSize: 12, color: "#6B7280", fontWeight: "600", backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  eventProjectRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  eventProject: { fontSize: 12, color: "#F97316", fontWeight: "600" },
  eventLocation: { fontSize: 12, color: "#6B7280" },
  eventNotes: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },

  // Event actions
  eventActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  actionBtnDanger: { borderLeftWidth: 1, borderLeftColor: "#F3F4F6" },

  // Add card
  addCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 20, marginBottom: 20, borderWidth: 1, borderColor: "#E8E6E1" },
  addHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  addTitle: { fontSize: 17, fontWeight: "700", color: "#1C1F26" },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  pickerBtn: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E8E6E1", flexDirection: "row", alignItems: "center", gap: 8 },
  pickerBtnText: { fontSize: 15, color: "#1A1A1A", fontWeight: "500" },
  timeRow: { flexDirection: "row", gap: 10 },
  typeRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  typeBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  typeBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  typeBtnTextActive: { color: "white" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  modalDone: { backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalDoneText: { color: "white", fontWeight: "700", fontSize: 14 },

  // FAB
  fab: { position: "absolute", bottom: 30, left: 20, right: 20, backgroundColor: "#F97316", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#F97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabText: { color: "white", fontSize: 15, fontWeight: "700" },
})