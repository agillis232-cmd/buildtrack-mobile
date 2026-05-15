import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from "react-native"
import { useState } from "react"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import DateTimePicker from "@react-native-community/datetimepicker"

const PROJECT_TYPES = [
  "Full Renovation",
  "Kitchen & Bath Remodel",
  "Bath Remodel",
  "Kitchen Remodel",
  "ADU New Build",
  "New Construction",
  "Room Addition",
  "Master Bath Remodel",
  "Exterior Renovation",
  "Roofing",
  "Other",
]

const US_STATES = ["CA", "NV", "AZ", "OR", "WA", "TX", "FL", "NY", "CO", "UT"]

export default function NewProjectScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("CA")
  const [projectType, setProjectType] = useState("")
  const [contractValue, setContractValue] = useState("")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showStateModal, setShowStateModal] = useState(false)

  async function save() {
    if (!name || !address || !city || !projectType) {
      Alert.alert("Error", "Name, address, city and project type are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/new`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address,
          city,
          state,
          projectType,
          contractValue,
          startDate: startDate?.toISOString().split("T")[0],
          endDate: endDate?.toISOString().split("T")[0],
        })
      })
      const data = await res.json()
      if (data.project) {
        Alert.alert("Success", "Project created!", [
          { text: "View Project", onPress: () => router.replace(`/project/${data.project.id}` as any) },
          { text: "Back to Dashboard", onPress: () => router.replace("/(tabs)") }
        ])
      } else {
        Alert.alert("Error", data.error || "Could not create project")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Project</Text>
          <Text style={styles.subtitle}>Fill in the project details below</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Project Info</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Project Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="123 Main St Renovation" placeholderTextColor="#9CA3AF" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Project Type *</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowTypeModal(true)}>
              <Text style={[styles.selectBtnText, !projectType && styles.selectBtnPlaceholder]}>
                {projectType || "Select project type..."}
              </Text>
              <Text style={styles.selectArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contract Value ($)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={contractValue}
                onChangeText={setContractValue}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Location</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="123 Main Street" placeholderTextColor="#9CA3AF" />
          </View>

          <View style={styles.twoCol}>
            <View style={[styles.field, { flex: 2 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="San Jose" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>State</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setShowStateModal(true)}>
                <Text style={styles.selectBtnText}>{state}</Text>
                <Text style={styles.selectArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Timeline</Text>

          <View style={styles.twoCol}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setActivePicker("start")}>
                <Text style={[styles.selectBtnText, !startDate && styles.selectBtnPlaceholder]}>
                  {startDate ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Set date"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setActivePicker("end")}>
                <Text style={[styles.selectBtnText, !endDate && styles.selectBtnPlaceholder]}>
                  {endDate ? endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Set date"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Date picker modal */}
      {activePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{activePicker === "start" ? "Start Date" : "End Date"}</Text>
                <TouchableOpacity onPress={() => setActivePicker(null)} style={styles.modalDone}>
                  <Text style={styles.modalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={activePicker === "start" ? (startDate || new Date()) : (endDate || new Date())}
                mode="date"
                display="spinner"
                style={{ width: "100%" }}
                onChange={(_, date) => {
                  if (!date) return
                  if (activePicker === "start") setStartDate(date)
                  else setEndDate(date)
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Project type modal */}
      <Modal visible={showTypeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Project Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)} style={styles.modalDone}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {PROJECT_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionRow, projectType === type && styles.optionRowSelected]}
                  onPress={() => { setProjectType(type); setShowTypeModal(false) }}
                >
                  <Text style={[styles.optionText, projectType === type && styles.optionTextSelected]}>{type}</Text>
                  {projectType === type && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* State modal */}
      <Modal visible={showStateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)} style={styles.modalDone}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {US_STATES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.optionRow, state === s && styles.optionRowSelected]}
                  onPress={() => { setState(s); setShowStateModal(false) }}
                >
                  <Text style={[styles.optionText, state === s && styles.optionTextSelected]}>{s}</Text>
                  {state === s && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Create Project</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 120 },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  formCard: { backgroundColor: "white", borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  twoCol: { flexDirection: "row", gap: 12 },
  amountRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 10, borderWidth: 1, borderColor: "#E8E6E1", paddingLeft: 12 },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: "#374151", marginRight: 4 },
  amountInput: { flex: 1, backgroundColor: "transparent", borderWidth: 0, paddingLeft: 0 },
  selectBtn: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E8E6E1", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectBtnText: { fontSize: 15, color: "#1A1A1A", fontWeight: "500" },
  selectBtnPlaceholder: { color: "#9CA3AF" },
  selectArrow: { fontSize: 18, color: "#9CA3AF" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E8E6E1", flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 2, backgroundColor: "#F97316", borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  modalDone: { backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  modalDoneText: { color: "white", fontWeight: "700", fontSize: 14 },
  optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1" },
  optionRowSelected: { backgroundColor: "#FFF7ED", borderColor: "#F97316" },
  optionText: { fontSize: 15, color: "#1A1A1A", fontWeight: "500" },
  optionTextSelected: { color: "#F97316", fontWeight: "700" },
  optionCheck: { fontSize: 16, color: "#F97316", fontWeight: "700" },
})