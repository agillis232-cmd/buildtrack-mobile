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
  start.setDate(start.getDate() - start.getDay())
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function isSameDay(a: Date, b: Date) {
  return a.toISOString().split("T")[0] === b.toISOString().split("T")[0]
}

export default function ScheduleScreen() {
  const { token, user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<"week" | "gantt">("week")
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [weekBase, setWeekBase] = useState(new Date())

  const [title, setTitle] = useState("")
  const [type, setType] = useState("MEETING")
  const [notes, setNotes] = useState("")
  const [projectId, setProjectId] = useState("")
  const [locationText, setLocationText] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [activePicker, setActivePicker] = useState<"date" | "start" | "end" | null>(null)
  const [projects, setProjects] = useState<any[]>([])

  const today = new Date()
  const weekDays = getWeekDays(weekBase)

  useEffect(() => {
    if (token) {
      loadEvents()
      loadProjects()
    } else {
      setLoading(false)
    }
  }, [token])

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) { console.log("Error loading projects:", e) }
  }

  async function loadEvents() {
    try {
      const from = new Date()
      from.setMonth(from.getMonth() - 1)
      const to = new Date()
      to.setMonth(to.getMonth() + 3)
      const res = await fetch(`${API_URL}/api/mobile/schedule?from=${from.toISOString()}&to=${to.toISOString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setEvents(data.events || [])
    } catch (e) { console.log("Error loading events:", e) }
    setLoading(false)
    setRefreshing(false)
  }

  function shiftWeek(dir: number) {
    const d = new Date(weekBase)
    d.setDate(d.getDate() + dir * 7)
    setWeekBase(d)
  }

  function resetForm() {
    setTitle("")
    setType("MEETING")
    setNotes("")
    setProjectId("")
    setLocationText("")
    setSelectedDate(new Date())
    setStartTime(null)
    setEndTime(null)
    setEditingEvent(null)
  }

  function eventsForDay(day: Date) {
    return events.filter(e => isSameDay(new Date(e.date), day))
  }

  function startEdit(event: any) {
    setEditingEvent(event)
    setTitle(event.title)
    setType(event.type)
    setNotes(event.notes || "")
    setProjectId(event.projectId || "")
    setLocationText(event.location || "")
    setSelectedDate(new Date(event.date))
    setStartTime(event.startTime ? new Date(`2000-01-01T${event.startTime}`) : null)
    setEndTime(event.endTime ? new Date(`2000-01-01T${event.endTime}`) : null)
    setAdding(true)
  }

  async function saveEvent() {
    if (!title) { Alert.alert("Error", "Title is required"); return }
    setSaving(true)
    try {
      const url = editingEvent
        ? `${API_URL}/api/mobile/schedule/${editingEvent.id}`
        : `${API_URL}/api/mobile/schedule`
      const res = await fetch(url, {
        method: editingEvent ? "PATCH" : "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title, type, notes: notes || null,
          projectId: projectId || null,
          location: locationText || null,
          date: selectedDate.toISOString().split("T")[0],
          startTime: startTime ? startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : null,
          endTime: endTime ? endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : null,
        })
      })
      const data = await res.json()
      if (data.event) {
        if (editingEvent) {
          setEvents(prev => prev.map(e => e.id === data.event.id ? data.event : e))
        } else {
          setEvents(prev => [...prev, data.event].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
        }
        resetForm()
        setAdding(false)
      } else { Alert.alert("Error", "Could not save event") }
    } catch (e) { Alert.alert("Error", "Connection error") }
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
          } catch (e) { Alert.alert("Error", "Connection error") }
        }
      }
    ])
  }

  async function completeEvent(eventId: string) {
    try {
      const res = await fetch(`${API_URL}/api/mobile/schedule/${eventId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true })
      })
      const data = await res.json()
      if (data.event) setEvents(prev => prev.map(e => e.id === eventId ? data.event : e))
    } catch (e) { console.log(e) }
  }

  async function connectCalendar() {
    try {
      const res = await fetch(`${API_URL}/api/google-calendar/auth-url`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.url) Linking.openURL(data.url)
    } catch (e) { console.log(e) }
  }

  async function syncFromGoogle() {
    setSyncing(true)
    try {
      const res = await fetch(`${API_URL}/api/google-calendar/sync`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.synced) {
        Alert.alert("Synced", `${data.synced} events imported`)
        loadEvents()
      }
    } catch (e) { console.log(e) }
    setSyncing(false)
  }

  const dayEvents = eventsForDay(selectedDay)
  const projectsInView = [...new Set(events.filter(e => e.project).map(e => e.project.name))]

  if (loading) return <View style={s.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents() }} tintColor="#F97316" />}
      >
        {/* Header Banner */}
        <View style={s.headerBanner}>
          <View style={s.headerCircle} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={s.headerTitle}>Schedule</Text>
              <Text style={s.headerSub}>{events.length} events across {projectsInView.length} projects</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                {(["week", "gantt"] as const).map(mode => (
                  <TouchableOpacity key={mode} onPress={() => setViewMode(mode)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, backgroundColor: viewMode === mode ? "#F97316" : "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: viewMode === mode ? "#F97316" : "rgba(255,255,255,0.15)" }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: viewMode === mode ? "white" : "rgba(255,255,255,0.5)" }}>{mode === "week" ? "Calendar" : "Gantt"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
        </View>

        {viewMode !== "gantt" ? (
          <>
            {/* Week Navigation */}
            <View style={s.weekNav}>
              <TouchableOpacity onPress={() => shiftWeek(-1)} style={s.weekArrow}>
                <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setWeekBase(new Date())}>
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
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.dayCell, isSelected && s.dayCellSelected, isToday && !isSelected && s.dayCellToday]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[s.dayName, isSelected && s.dayNameSelected]}>{day.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}</Text>
                    <Text style={[s.dayNum, isSelected && s.dayNumSelected, isToday && !isSelected && s.dayNumToday]}>{day.getDate()}</Text>
                    {dayEvts.length > 0 && (
                      <View style={{ flexDirection: "row", gap: 2, marginTop: 3 }}>
                        {dayEvts.slice(0, 3).map((e, j) => (
                          <View key={j} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSelected ? "white" : EVENT_COLORS[e.type] || "#6B7280" }} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Day Header */}
            <View style={s.dayHeader}>
              <Text style={s.dayHeaderText}>
                {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </Text>
              <Text style={s.dayHeaderCount}>{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</Text>
            </View>

            {/* Day Events */}
            {dayEvents.length === 0 ? (
              <View style={s.emptyDay}>
                <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
                <Text style={s.emptyDayText}>No events this day</Text>
              </View>
            ) : (
              dayEvents.map(event => {
                const color = EVENT_COLORS[event.type] || "#6B7280"
                const iconName = EVENT_ICONS[event.type] || "ellipse-outline"
                return (
                  <View key={event.id} style={[s.eventCard, { borderLeftColor: color, opacity: event.completed ? 0.5 : 1 }]}>
                    <View style={s.eventTop}>
                      <View style={[s.eventIconBox, { backgroundColor: color + "15" }]}>
                        <Ionicons name={iconName as any} size={18} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.eventTitle, event.completed && { textDecorationLine: "line-through" }]}>{event.title}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                          <Text style={s.eventType}>{event.type}</Text>
                          {event.startTime && <Text style={s.eventTime}>{event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}</Text>}
                        </View>
                        {event.project && (
                          <Text style={s.eventProject}>{event.project.name}</Text>
                        )}
                        {event.location && <Text style={s.eventLocation}>{event.location}</Text>}
                        {event.notes && <Text style={s.eventNotes}>{event.notes}</Text>}
                      </View>
                    </View>
                    <View style={s.eventActions}>
                      {!event.completed && (
                        <TouchableOpacity style={s.actionBtn} onPress={() => completeEvent(event.id)}>
                          <Ionicons name="checkmark-outline" size={14} color="#16A34A" />
                          <Text style={[s.actionBtnText, { color: "#16A34A" }]}>Complete</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={s.actionBtn} onPress={() => startEdit(event)}>
                        <Ionicons name="pencil-outline" size={14} color="#374151" />
                        <Text style={s.actionBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtn} onPress={() => {
                        setSelectedDate(new Date(new Date(event.date).getTime() + 86400000))
                        setTitle(event.title)
                        setType(event.type)
                        setNotes(event.notes || "")
                        setProjectId(event.projectId || "")
                        setAdding(true)
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
          </>
        ) : (
          /* Gantt Chart View */
          <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "white", marginBottom: 12 }}>Project timeline</Text>
            {(() => {
              const sortedEvents = [...events].filter(e => e.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              if (sortedEvents.length === 0) return <Text style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 40 }}>No events to display</Text>
              const minDate = new Date(sortedEvents[0].date)
              const maxDate = new Date(sortedEvents[sortedEvents.length - 1].date)
              const totalDays = Math.max(Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1, 7)
              const barWidth = SCREEN_WIDTH - 140
              const byProject: Record<string, any[]> = {}
              sortedEvents.forEach(e => {
                const pName = e.project?.name || "No project"
                if (!byProject[pName]) byProject[pName] = []
                byProject[pName].push(e)
              })
              const months: { label: string; offset: number }[] = []
              const mStart = new Date(minDate)
              while (mStart <= maxDate) {
                const dayOffset = Math.ceil((mStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
                months.push({ label: mStart.toLocaleDateString("en-US", { month: "short" }), offset: (dayOffset / totalDays) * barWidth })
                mStart.setMonth(mStart.getMonth() + 1)
                mStart.setDate(1)
              }
              return (
                <View>
                  <View style={{ flexDirection: "row", marginLeft: 100, marginBottom: 8, height: 16, position: "relative" }}>
                    {months.map((m, i) => (
                      <Text key={i} style={{ position: "absolute", left: m.offset, fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>{m.label}</Text>
                    ))}
                  </View>
                  {Object.entries(byProject).map(([projectName, projectEvents]) => (
                    <View key={projectName} style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>{projectName}</Text>
                      {projectEvents.map((event) => {
                        const startDay = Math.ceil((new Date(event.date).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
                        const endDay = event.endDate ? Math.ceil((new Date(event.endDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) : startDay + 1
                        const duration = Math.max(endDay - startDay, 1)
                        const left = (startDay / totalDays) * barWidth
                        const width = Math.max((duration / totalDays) * barWidth, 20)
                        const color = EVENT_COLORS[event.type] || "#6B7280"
                        const isPast = new Date(event.date) < new Date()
                        return (
                          <TouchableOpacity key={event.id} onPress={() => Alert.alert(event.title, `${event.type}\n${new Date(event.date).toLocaleDateString()}${event.notes ? `\n\n${event.notes}` : ""}`)} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, height: 28 }}>
                            <Text style={{ width: 96, fontSize: 10, color: "rgba(255,255,255,0.4)", paddingRight: 4 }} numberOfLines={1}>{event.title}</Text>
                            <View style={{ flex: 1, position: "relative", height: 22 }}>
                              <View style={{ position: "absolute", left, width, height: 20, borderRadius: 4, backgroundColor: color + (isPast ? "40" : "CC"), borderLeftWidth: 3, borderLeftColor: color, justifyContent: "center", paddingHorizontal: 6 }}>
                                {width > 50 && <Text style={{ fontSize: 8, color: "white", fontWeight: "600" }} numberOfLines={1}>{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>}
                              </View>
                            </View>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  ))}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
                    {Object.entries(EVENT_COLORS).slice(0, 6).map(([t, color]) => (
                      <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                        <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            })()}
          </View>
        )}

        {/* Add/Edit Form */}
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
                  <TouchableOpacity
                    style={[s.typeBtn, !projectId && { backgroundColor: "#F9731620", borderColor: "#F97316" }]}
                    onPress={() => setProjectId("")}
                  >
                    <Text style={[s.typeBtnText, !projectId && { color: "#F97316" }]}>None</Text>
                  </TouchableOpacity>
                  {projects.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[s.typeBtn, projectId === p.id && { backgroundColor: "#F9731620", borderColor: "#F97316" }]}
                      onPress={() => setProjectId(p.id)}
                    >
                      <Text style={[s.typeBtnText, projectId === p.id && { color: "#F97316" }]} numberOfLines={1}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={s.field}>
              <Text style={s.label}>Location</Text>
              <TextInput style={s.input} value={locationText} onChangeText={setLocationText} placeholder="Address or description" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={s.field}>
              <Text style={s.label}>Notes</Text>
              <TextInput style={[s.input, { height: 70, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} placeholder="Additional details..." placeholderTextColor="#9CA3AF" multiline />
            </View>
            <View style={s.formBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { resetForm(); setAdding(false) }}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveEvent} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.saveBtnText}>{editingEvent ? "Save Changes" : "Create Event"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Date/Time Picker Modal */}
        <Modal visible={!!activePicker} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {activePicker === "date" ? "Select Date" : activePicker === "start" ? "Start Time" : "End Time"}
                </Text>
                <TouchableOpacity style={s.modalDone} onPress={() => setActivePicker(null)}>
                  <Text style={s.modalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              {activePicker === "date" && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(e: any, date?: Date) => { if (date) setSelectedDate(date) }}
                />
              )}
              {activePicker === "start" && (
                <DateTimePicker
                  value={startTime || new Date()}
                  mode="time"
                  display="spinner"
                  onChange={(e: any, date?: Date) => { if (date) setStartTime(date) }}
                />
              )}
              {activePicker === "end" && (
                <DateTimePicker
                  value={endTime || new Date()}
                  mode="time"
                  display="spinner"
                  onChange={(e: any, date?: Date) => { if (date) setEndTime(date) }}
                />
              )}
            </View>
          </View>
        </Modal>

      </ScrollView>

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
  headerBanner: { backgroundColor: "#1C1F26", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "white", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8 },
  syncChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#4285F4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  connectChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  syncChipText: { color: "white", fontSize: 12, fontWeight: "600" },

  // Week nav
  weekNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 16, marginTop: 16 },
  weekArrow: { padding: 4 },
  weekLabel: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)" },

  // Week strip
  weekStrip: { flexDirection: "row", gap: 4, marginBottom: 12, paddingHorizontal: 16 },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)" },
  dayCellSelected: { backgroundColor: "#F97316" },
  dayCellToday: { borderWidth: 1, borderColor: "rgba(249,115,22,0.5)" },
  dayName: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: "600", marginBottom: 2 },
  dayNameSelected: { color: "rgba(255,255,255,0.8)" },
  dayNum: { fontSize: 16, fontWeight: "700", color: "white" },
  dayNumSelected: { color: "white" },
  dayNumToday: { color: "#F97316" },

  // Day header
  dayHeader: { paddingHorizontal: 16, marginBottom: 12 },
  dayHeaderText: { fontSize: 16, fontWeight: "700", color: "white" },
  dayHeaderCount: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  // Empty day
  emptyDay: { alignItems: "center", padding: 40, marginHorizontal: 16, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  emptyDayText: { fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 8 },

  // Event card
  eventCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  eventTop: { flexDirection: "row", gap: 12, marginBottom: 10 },
  eventIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  eventTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  eventType: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  eventTime: { fontSize: 11, color: "#6B7280" },
  eventProject: { fontSize: 12, color: "#F97316", fontWeight: "600", marginTop: 3 },
  eventLocation: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  eventNotes: { fontSize: 12, color: "#6B7280", marginTop: 4, lineHeight: 18 },
  eventActions: { flexDirection: "row", gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F3F4F6" },
  actionBtnDanger: { backgroundColor: "#FEE2E2" },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },

  // Add/Edit form
  addCard: { backgroundColor: "white", borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E8E6E1", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  addHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  addTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: "#E8E6E1", backgroundColor: "#F9FAFB" },
  typeBtnText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  pickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E8E6E1" },
  pickerBtnText: { fontSize: 14, color: "#374151" },
  timeRow: { flexDirection: "row", gap: 12 },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
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
