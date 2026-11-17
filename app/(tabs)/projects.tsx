import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert, Modal, Dimensions } from "react-native"
import { useEffect, useState, useRef, useCallback } from "react"
import { useFocusEffect } from "expo-router"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { toDateKey, dateKeyOf, parseDateOnly, parseTimeLabel } from "@/lib/dates"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Linking } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Screen, ScreenHeader, CircleButton, SegmentedControl, Card, Button, Chip, EmptyState } from "@/components/ui"
import { colors, type as typo, humanize } from "@/lib/theme"
import { showMenu } from "@/lib/menu"
import { loadCached } from "@/lib/cache"

const EVENT_TYPES = ["MEETING", "INSPECTION", "DELIVERY", "ORDER", "WORK", "OTHER"]
const SCREEN_WIDTH = Dimensions.get("window").width
const EVENT_COLORS: Record<string, string> = {
  MEETING: "#3B82F6",
  INSPECTION: "#F97316",
  DELIVERY: "#16A34A",
  ORDER: "#8B5CF6",
  WORK: "#D97706",
  MILESTONE: "#EC4899",
  DEADLINE: "#DC2626",
  OTHER: "#6B7280",
}
const EVENT_ICONS: Record<string, string> = {
  MEETING: "people-outline",
  INSPECTION: "search-outline",
  DELIVERY: "cube-outline",
  ORDER: "cart-outline",
  WORK: "hammer-outline",
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

// Same calendar day on this phone (not in UTC, which rolls over mid-afternoon in California).
function isSameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b)
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

  // Refresh whenever this tab comes back into view. The saved copy shows instantly in the meantime.
  useFocusEffect(useCallback(() => {
    if (token) {
      loadEvents()
      loadProjects()
      loadCalendarStatus()
    } else {
      setLoading(false)
    }
  }, [token]))

  async function loadProjects() {
    try {
      await loadCached("/api/mobile/projects", token, data => setProjects(data.projects || []))
    } catch (e) { console.log("Error loading projects:", e) }
  }

  // Shows "Sync" instead of "Connect" once Google Calendar is linked.
  async function loadCalendarStatus() {
    try {
      const res = await fetch(`${API_URL}/api/google-calendar/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setCalendarConnected(!!data.connected)
    } catch (e) { console.log("Error loading calendar status:", e) }
  }

  async function loadEvents() {
    try {
      const from = new Date()
      from.setMonth(from.getMonth() - 1)
      const to = new Date()
      to.setMonth(to.getMonth() + 3)
      await loadCached(`/api/mobile/schedule?from=${from.toISOString()}&to=${to.toISOString()}`, token, data => {
        setEvents(data.events || [])
        setLoading(false)
      }, "schedule-events")
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
    // Event dates are calendar days from the server; compare day to day.
    const key = toDateKey(day)
    return events.filter(e => dateKeyOf(e.date) === key)
  }

  function startEdit(event: any) {
    setEditingEvent(event)
    setTitle(event.title)
    setType(event.type)
    setNotes(event.notes || "")
    setProjectId(event.projectId || "")
    setLocationText(event.location || "")
    setSelectedDate(parseDateOnly(event.date))
    setStartTime(parseTimeLabel(event.startTime))
    setEndTime(parseTimeLabel(event.endTime))
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
          date: toDateKey(selectedDate),
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
      else Alert.alert("Error", data.error || "Could not update event")
    } catch (e) { Alert.alert("Error", "Connection error") }
  }

  async function connectCalendar() {
    try {
      const res = await fetch(`${API_URL}/api/google-calendar/connect`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      const url = data.authUrl || data.url
      if (url) Linking.openURL(url)
      else Alert.alert("Google Calendar", "Could not start the Google sign-in. Please try again.")
    } catch (e) { Alert.alert("Google Calendar", "Connection error") }
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
        const count = data.imported || 0
        Alert.alert("Synced", `${count} event${count === 1 ? "" : "s"} imported`)
        loadEvents()
      } else {
        Alert.alert("Google Calendar", data.error || "Could not sync")
      }
    } catch (e) { Alert.alert("Google Calendar", "Connection error") }
    setSyncing(false)
  }

  const dayEvents = eventsForDay(selectedDay)
  const projectsInView = [...new Set(events.filter(e => e.project).map(e => e.project.name))]

  // "Nov 15 – 21", or "Nov 29 – Dec 5" across a month boundary.
  const weekLabel = weekDays[0].getMonth() === weekDays[6].getMonth()
    ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].getDate()}`
    : `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  const canEdit = user?.role !== "CLIENT"

  function startAdd() {
    resetForm()
    setSelectedDate(selectedDay)
    setAdding(true)
  }

  function startReschedule(event: any) {
    const nextDay = parseDateOnly(event.date)
    nextDay.setDate(nextDay.getDate() + 1)
    setSelectedDate(nextDay)
    setTitle(event.title)
    setType(event.type)
    setNotes(event.notes || "")
    setProjectId(event.projectId || "")
    setAdding(true)
  }

  function openEventMenu(event: any) {
    showMenu(event.title, [
      { label: "Reschedule to next day", onPress: () => startReschedule(event) },
      { label: "Delete event", onPress: () => deleteEvent(event.id), destructive: true },
    ])
  }

  function openCalendarMenu() {
    showMenu("Google Calendar", calendarConnected
      ? [{ label: "Import from Google Calendar", onPress: syncFromGoogle }]
      : [{ label: "Connect Google Calendar", onPress: connectCalendar }])
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>

  return (
    <Screen
      tabBar
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents() }} tintColor={colors.accent} />}
    >
      <ScreenHeader
        title="Schedule"
        subtitle={`${events.length} event${events.length === 1 ? "" : "s"} · ${projectsInView.length} project${projectsInView.length === 1 ? "" : "s"}`}
        actions={
          <>
            {canEdit && <CircleButton icon="add" label="Add event" onPress={startAdd} />}
            <CircleButton icon="ellipsis-horizontal" label="Google Calendar options" onPress={openCalendarMenu} disabled={syncing} />
          </>
        }
      >
        <SegmentedControl
          options={[{ key: "week", label: "Calendar" }, { key: "gantt", label: "Gantt" }]}
          value={viewMode}
          onChange={setViewMode}
        />
      </ScreenHeader>

      {/* Add/Edit Form */}
      {adding && (
        <View style={s.addCard}>
          <View style={s.addHeader}>
            <Text style={s.addTitle}>{editingEvent ? "Edit event" : "New event"}</Text>
            <TouchableOpacity onPress={() => { resetForm(); setAdding(false) }} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Title *</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Site inspection, delivery..." placeholderTextColor={colors.chevron} />
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
                    <Ionicons name={(EVENT_ICONS[t] || "ellipse-outline") as any} size={14} color={type === t ? EVENT_COLORS[t] : colors.textSecondary} />
                    <Text style={[s.typeBtnText, type === t && { color: EVENT_COLORS[t] }]}>{humanize(t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Date *</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setActivePicker("date")}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={s.pickerBtnText}>
                {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.timeRow}>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Start</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setActivePicker("start")}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={s.pickerBtnText}>
                  {startTime ? startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Set time"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>End</Text>
              <TouchableOpacity style={s.pickerBtn} onPress={() => setActivePicker("end")}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
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
                  style={[s.typeBtn, !projectId && { backgroundColor: colors.tintSoft, borderColor: colors.tint }]}
                  onPress={() => setProjectId("")}
                >
                  <Text style={[s.typeBtnText, !projectId && { color: colors.tint }]}>None</Text>
                </TouchableOpacity>
                {projects.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.typeBtn, projectId === p.id && { backgroundColor: colors.tintSoft, borderColor: colors.tint }]}
                    onPress={() => setProjectId(p.id)}
                  >
                    <Text style={[s.typeBtnText, projectId === p.id && { color: colors.tint }]} numberOfLines={1}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={s.field}>
            <Text style={s.label}>Location</Text>
            <TextInput style={s.input} value={locationText} onChangeText={setLocationText} placeholder="Address or description" placeholderTextColor={colors.chevron} />
          </View>
          <View style={s.field}>
            <Text style={s.label}>Notes</Text>
            <TextInput style={[s.input, { height: 70, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} placeholder="Additional details..." placeholderTextColor={colors.chevron} multiline />
          </View>
          <View style={s.formBtns}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => { resetForm(); setAdding(false) }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveEvent} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>{editingEvent ? "Save changes" : "Add event"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {viewMode !== "gantt" ? (
        <>
          {/* Week */}
          <Card style={s.weekCard}>
            <View style={s.weekNav}>
              <Pressable onPress={() => shiftWeek(-1)} style={s.weekArrow} accessibilityRole="button" accessibilityLabel="Previous week">
                <Ionicons name="chevron-back" size={20} color={colors.tint} />
              </Pressable>
              <Pressable onPress={() => { setWeekBase(new Date()); setSelectedDay(new Date()) }} accessibilityRole="button" accessibilityLabel={`Week of ${weekLabel}. Go to today`}>
                <Text style={typo.headline}>{weekLabel}</Text>
              </Pressable>
              <Pressable onPress={() => shiftWeek(1)} style={s.weekArrow} accessibilityRole="button" accessibilityLabel="Next week">
                <Ionicons name="chevron-forward" size={20} color={colors.tint} />
              </Pressable>
            </View>
            <View style={s.weekStrip}>
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selectedDay)
                const count = eventsForDay(day).length
                return (
                  <Pressable
                    key={i}
                    style={s.dayCell}
                    onPress={() => setSelectedDay(day)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${isToday ? ", today" : ""}, ${count} event${count === 1 ? "" : "s"}`}
                  >
                    <Text style={[s.dayName, (isSelected || isToday) && { color: colors.tint, fontWeight: "600" }]}>
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </Text>
                    <View style={[s.dayCircle, isSelected && s.dayCircleSelected]}>
                      <Text style={[s.dayNum, isSelected && { color: colors.white, fontWeight: "600" }, isToday && !isSelected && { color: colors.tint, fontWeight: "700" }]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View style={[s.dayDot, count > 0 && { backgroundColor: colors.accent }]} />
                  </Pressable>
                )
              })}
            </View>
          </Card>

          {/* Selected day */}
          <View style={s.dayHeader}>
            <Text style={typo.title2} accessibilityRole="header">
              {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Text style={typo.subhead}>{dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}</Text>
          </View>

          {dayEvents.length === 0 ? (
            <EmptyState icon="calendar-outline" title="Nothing scheduled" subtitle={canEdit ? "Tap + to add an event." : undefined} />
          ) : (
            dayEvents.map(event => {
              const color = EVENT_COLORS[event.type] || "#6B7280"
              const iconName = EVENT_ICONS[event.type] || "ellipse-outline"
              const meta = [
                humanize(event.type),
                event.startTime ? `${event.startTime}${event.endTime ? ` – ${event.endTime}` : ""}` : null,
              ].filter(Boolean).join(" · ")
              return (
                <Card key={event.id} style={[s.eventCard, event.completed && { opacity: 0.6 }]}>
                  <View style={s.eventTop}>
                    <View style={[s.eventIconBox, { backgroundColor: color + "1F" }]}>
                      <Ionicons name={iconName as any} size={20} color={color} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[typo.headline, event.completed && { textDecorationLine: "line-through" }]}>{event.title}</Text>
                      <Text style={typo.footnote}>
                        {meta}
                        {event.project ? <Text style={{ color: colors.tint, fontWeight: "600" }}>{meta ? " · " : ""}{event.project.name}</Text> : null}
                      </Text>
                      {!!event.location && (
                        <View style={s.eventLocation}>
                          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                          <Text style={typo.footnote}>{event.location}</Text>
                        </View>
                      )}
                      {!!event.notes && <Text style={s.eventNotes}>{event.notes}</Text>}
                    </View>
                  </View>
                  {canEdit && (
                    <View style={s.eventActions}>
                      {event.completed ? (
                        <View style={{ flex: 1, justifyContent: "center" }}><Chip label="Completed" tone="success" /></View>
                      ) : (
                        <Button label="Mark complete" icon="checkmark" tone="success" onPress={() => completeEvent(event.id)} style={{ flex: 1 }} />
                      )}
                      <Button label="Edit" onPress={() => startEdit(event)} />
                      <Pressable
                        onPress={() => openEventMenu(event)}
                        accessibilityRole="button"
                        accessibilityLabel="More: reschedule, delete"
                        style={({ pressed }) => [s.moreBtn, pressed && { opacity: 0.55 }]}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
                      </Pressable>
                    </View>
                  )}
                </Card>
              )
            })
          )}
        </>
      ) : (
        /* Gantt Chart View */
        <Card style={{ padding: 16 }}>
        <View>
          <Text style={[typo.headline, { marginBottom: 12 }]}>Project timeline</Text>
          {(() => {
            const sortedEvents = [...events].filter(e => e.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            if (sortedEvents.length === 0) return <Text style={[typo.subhead, { textAlign: "center", padding: 40 }]}>No events to display</Text>
            const minDate = parseDateOnly(sortedEvents[0].date)
            const maxDate = parseDateOnly(sortedEvents[sortedEvents.length - 1].date)
            const totalDays = Math.max(Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1, 7)
            const barWidth = SCREEN_WIDTH - 172
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
                    <Text key={i} style={{ position: "absolute", left: m.offset, fontSize: 12, color: colors.textSecondary, fontWeight: "600" }}>{m.label}</Text>
                  ))}
                </View>
                {Object.entries(byProject).map(([projectName, projectEvents]) => (
                  <View key={projectName} style={{ marginBottom: 16 }}>
                    <Text style={[typo.footnote, { fontWeight: "600", color: colors.text, marginBottom: 6 }]}>{projectName}</Text>
                    {projectEvents.map((event) => {
                      const startDay = Math.ceil((parseDateOnly(event.date).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
                      const endDay = event.endDate ? Math.ceil((parseDateOnly(event.endDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) : startDay + 1
                      const duration = Math.max(endDay - startDay, 1)
                      const left = (startDay / totalDays) * barWidth
                      const width = Math.max((duration / totalDays) * barWidth, 20)
                      const color = EVENT_COLORS[event.type] || "#6B7280"
                      const isPast = dateKeyOf(event.date) < toDateKey(new Date())
                      return (
                        <TouchableOpacity key={event.id} onPress={() => Alert.alert(event.title, `${humanize(event.type)}\n${parseDateOnly(event.date).toLocaleDateString()}${event.notes ? `\n\n${event.notes}` : ""}`)} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4, height: 28 }}>
                          <Text style={{ width: 96, fontSize: 12, color: colors.textSecondary, paddingRight: 4 }} numberOfLines={1}>{event.title}</Text>
                          <View style={{ flex: 1, position: "relative", height: 22 }}>
                            <View style={{ position: "absolute", left, width, height: 20, borderRadius: 4, backgroundColor: color + (isPast ? "40" : "CC"), borderLeftWidth: 3, borderLeftColor: color, justifyContent: "center", paddingHorizontal: 6 }}>
                              {width > 60 && <Text style={{ fontSize: 11, color: "white", fontWeight: "600" }} numberOfLines={1}>{parseDateOnly(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>}
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                ))}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }}>
                  {Object.entries(EVENT_COLORS).slice(0, 6).map(([t, color]) => (
                    <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{humanize(t)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          })()}
        </View>
        </Card>
      )}

      {/* Date/Time Picker Modal */}
      <Modal visible={!!activePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {activePicker === "date" ? "Date" : activePicker === "start" ? "Start time" : "End time"}
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
    </Screen>
  )
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  // Week
  weekCard: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 12 },
  weekNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weekArrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  weekStrip: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center", gap: 4 },
  dayName: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  dayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dayCircleSelected: { backgroundColor: colors.charcoal },
  dayNum: { fontSize: 17, fontWeight: "500", color: colors.text },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" },

  dayHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: 4, gap: 8 },

  // Event card
  eventCard: { padding: 16, gap: 14 },
  eventTop: { flexDirection: "row", gap: 12 },
  eventIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  eventLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventNotes: { fontSize: 15, lineHeight: 21, color: "#3A404B", marginTop: 4 },
  eventActions: { flexDirection: "row", gap: 8 },
  moreBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.fillSubtle, alignItems: "center", justifyContent: "center" },

  // Add/Edit form
  addCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20 },
  addHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  addTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
  field: { marginBottom: 14 },
  label: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: { backgroundColor: colors.fillSubtle, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: colors.text },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.card },
  typeBtnText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  pickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.fillSubtle, borderRadius: 12, paddingHorizontal: 14, height: 46 },
  pickerBtnText: { fontSize: 17, color: colors.text },
  timeRow: { flexDirection: "row", gap: 12 },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: colors.fillSubtle, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 17, fontWeight: "600", color: colors.text },
  saveBtn: { flex: 1, backgroundColor: colors.charcoal, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: colors.white, fontSize: 17, fontWeight: "600" },

  // Date/time picker sheet
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  modalDone: { height: 44, paddingHorizontal: 8, justifyContent: "center" },
  modalDoneText: { color: colors.tint, fontWeight: "600", fontSize: 17 },
})
