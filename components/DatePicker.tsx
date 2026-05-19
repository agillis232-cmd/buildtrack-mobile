import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"

interface DatePickerProps {
  label: string
  value: string
  onChange: (date: string) => void
  placeholder?: string
}

export default function DatePicker({ label, value, onChange, placeholder }: DatePickerProps) {
  const [show, setShow] = useState(false)
  const date = value ? new Date(value) : new Date()

  function handleChange(_: any, selected?: Date) {
    if (Platform.OS === "android") setShow(false)
    if (selected) {
      onChange(selected.toISOString().split("T")[0])
    }
  }

  const displayValue = value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : placeholder || "Select date..."

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.btn} onPress={() => setShow(true)}>
        <Text style={[styles.btnText, !value && styles.placeholder]}>{displayValue}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <Modal visible={show} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{label}</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleChange}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleChange}
          />
        )
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  btn: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E8E6E1", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  btnText: { fontSize: 15, color: "#1A1A1A" },
  placeholder: { color: "#9CA3AF" },
  icon: { fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  cancelText: { fontSize: 15, color: "#6B7280" },
  doneText: { fontSize: 15, color: "#F97316", fontWeight: "700" },
})