import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "Selected": { bg: "#DBEAFE", text: "#2563EB" },
  "Approved": { bg: "#DCFCE7", text: "#16A34A" },
  "Ordered": { bg: "#FEF3C7", text: "#D97706" },
  "Received": { bg: "#F3E8FF", text: "#7C3AED" },
  "Installed": { bg: "#D1FAE5", text: "#059669" },
}

export default function SpecBookScreen() {
  const { id } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [specBook, setSpecBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (token && id) loadSpecBook()
  }, [token, id])

  async function loadSpecBook() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/spec-book`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.specBook) {
        setSpecBook(data.specBook)
        const rooms = data.specBook.data?.rooms?.filter((r: any) => r.active) || []
        if (rooms.length > 0) setExpandedRoom(rooms[0].id)
      }
    } catch (e) { console.log("Spec book error:", e) }
    setLoading(false)
  }

  function getItemCode(roomCode: string, catKey: string, idx: number) {
    return `${roomCode}-${catKey}-${String(idx + 1).padStart(2, "0")}`
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.tint} /></View>

  if (!specBook) return (
    <View style={styles.center}>
      <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>No spec book for this project</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>Go back</Text>
      </TouchableOpacity>
    </View>
  )

  const rooms = (specBook.data?.rooms || []).filter((r: any) => r.active)
  const meta = specBook.meta || {}

  const filteredRooms = search
    ? rooms.map((r: any) => ({
        ...r,
        categories: r.categories.filter((c: any) => c.active).map((c: any) => ({
          ...c,
          items: c.items.filter((i: any) =>
            [i.name, i.brand, i.model, i.color, i.colorCode, i.supplier]
              .some((v: string) => v?.toLowerCase().includes(search.toLowerCase()))
          )
        })).filter((c: any) => c.items.length > 0)
      })).filter((r: any) => r.categories.length > 0)
    : rooms

  const totalItems = rooms.reduce((s: number, r: any) => s + r.categories.filter((c: any) => c.active).reduce((s2: number, c: any) => s2 + c.items.length, 0), 0)
  const filledItems = rooms.reduce((s: number, r: any) => s + r.categories.filter((c: any) => c.active).reduce((s2: number, c: any) => s2 + c.items.filter((i: any) => i.brand || i.model || i.color).length, 0), 0)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Spec Book</Text>
          <Text style={styles.headerSub}>{meta.projectName} · {filledItems}/{totalItems} specified</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${totalItems > 0 ? (filledItems / totalItems) * 100 : 0}%` }]} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search specs..." placeholderTextColor={colors.chevron} style={styles.searchInput} />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {filteredRooms.map((room: any) => (
          <View key={room.id} style={styles.roomCard}>
            <TouchableOpacity onPress={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)} style={styles.roomHeader}>
              <Ionicons name={expandedRoom === room.id ? "chevron-down" : "chevron-forward"} size={16} color={colors.textSecondary} />
              <Text style={styles.roomCode}>{room.code}</Text>
              <Text style={styles.roomName}>{room.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {room.categories.filter((c: any) => c.active).reduce((s: number, c: any) => s + c.items.length, 0)}
                </Text>
              </View>
            </TouchableOpacity>

            {expandedRoom === room.id && room.categories.filter((c: any) => c.active).map((cat: any) => (
              <View key={cat.key}>
                <View style={styles.catHeader}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catCount}>({cat.items.length})</Text>
                </View>

                {cat.items.map((item: any, idx: number) => {
                  const code = getItemCode(room.code, cat.key, idx)
                  const isExpanded = expandedItem === item.id
                  const hasSpecs = item.brand || item.model || item.color

                  return (
                    <TouchableOpacity key={item.id} onPress={() => setExpandedItem(isExpanded ? null : item.id)} activeOpacity={0.7}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemCode}>{code}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.name || "—"}</Text>
                          {!isExpanded && hasSpecs && (
                            <Text style={styles.itemPreview}>{[item.brand, item.model, item.color].filter(Boolean).join(" · ")}</Text>
                          )}
                        </View>
                        {item.swatch && item.swatch !== "#eae9e9" && (
                          <View style={[styles.swatch, { backgroundColor: item.swatch }]} />
                        )}
                        {item.status ? (
                          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status]?.bg || "#F3F4F6" }]}>
                            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status]?.text || "#6B7280" }]}>{item.status}</Text>
                          </View>
                        ) : null}
                      </View>

                      {isExpanded && (
                        <View style={styles.itemDetails}>
                          {[
                            { label: "Manufacturer", value: item.brand },
                            { label: "Model / SKU", value: item.model },
                            { label: "Color / Finish", value: item.color },
                            { label: "Color Code", value: item.colorCode },
                            { label: "Size", value: item.size },
                            { label: "Quantity", value: item.qty },
                            { label: "Location", value: item.location },
                            { label: "Supplier", value: item.supplier },
                            { label: "Lead Time", value: item.lead },
                            { label: "Installer", value: item.installer },
                          ].filter(f => f.value).map((f, i) => (
                            <View key={i} style={styles.detailField}>
                              <Text style={styles.detailLabel}>{f.label}</Text>
                              <Text style={styles.detailValue}>{f.value}</Text>
                            </View>
                          ))}
                          {item.notes ? (
                            <View style={styles.notesBox}>
                              <Text style={styles.detailLabel}>Notes</Text>
                              <Text style={styles.notesText}>{item.notes}</Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
  backBtn: { marginTop: 8, padding: 10 },
  backBtnText: { fontSize: 14, color: colors.tint, fontWeight: "600" },
  header: { flexDirection: "row", alignItems: "center", gap: 12 , paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerBack: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  headerSub: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
  progressWrap: { backgroundColor: colors.charcoal, paddingHorizontal: 16, paddingBottom: 12 },
  progressTrack: { height: 4, backgroundColor: colors.track, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  searchWrap: { flexDirection: "row", alignItems: "center", margin: 16, marginBottom: 8, backgroundColor: "white", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  roomCard: { marginBottom: 12, backgroundColor: "white", borderRadius: 12, overflow: "hidden" },
  roomHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 8 },
  roomCode: { fontSize: 13, fontWeight: "800", color: colors.tint, width: 36 },
  roomName: { fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 },
  badge: { backgroundColor: colors.fillSubtle, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  catHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "rgba(28,31,38,0.03)", borderBottomWidth: 1, borderBottomColor: colors.separator },
  catName: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  catCount: { fontSize: 11, color: colors.textSecondary },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.separator },
  itemCode: { fontSize: 11, fontWeight: "700", color: colors.tint, fontFamily: "monospace", width: 60 },
  itemName: { fontSize: 13, fontWeight: "600", color: colors.text },
  itemPreview: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  swatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  statusText: { fontSize: 11, fontWeight: "700" },
  itemDetails: { paddingHorizontal: 14, paddingBottom: 12, paddingLeft: 74, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailField: { width: "45%" },
  detailLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.text, marginTop: 1 },
  notesBox: { width: "100%", backgroundColor: "#FAFAF9", borderRadius: 6, padding: 8, marginTop: 4 },
  notesText: { fontSize: 12, color: colors.text, lineHeight: 18, marginTop: 2 },
})

