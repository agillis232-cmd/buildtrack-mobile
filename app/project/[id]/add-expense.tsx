import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native"
import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

export default function AddExpenseScreen() {
  const { id, prefill } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()

  const prefillData = prefill ? JSON.parse(decodeURIComponent(prefill as string)) : {}

  const [vendor, setVendor] = useState(prefillData.vendor || "")
  const [description, setDescription] = useState(prefillData.description || "")
  const [amount, setAmount] = useState(prefillData.amount?.toString() || "")
  const [date, setDate] = useState(prefillData.date || new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)

  const isScanned = !!prefill

  async function save() {
    if (!vendor || !amount) {
      Alert.alert("Error", "Vendor and amount are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/expenses`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ vendor, description, amount: parseFloat(amount), date })
      })
      if (res.ok) {
        router.back()
      } else {
        Alert.alert("Error", "Could not save expense")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Expense</Text>
          {isScanned && (
            <View style={styles.scannedBadge}>
              <Text style={styles.scannedText}>Receipt scanned — review & confirm</Text>
            </View>
          )}
        </View>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Vendor *</Text>
            <TextInput
              style={styles.input}
              value={vendor}
              onChangeText={setVendor}
              placeholder="Home Depot, Lowes..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Lumber, screws, paint..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.twoCol}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Amount *</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Expense</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 120 },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 8 },
  scannedBadge: { backgroundColor: "rgba(249,115,22,0.2)", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(249,115,22,0.3)" },
  scannedText: { fontSize: 12, color: "#F97316", fontWeight: "600" },
  formCard: { backgroundColor: "white", borderRadius: 16, padding: 20, marginHorizontal: 16, borderWidth: 1, borderColor: "#E8E6E1", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  multiline: { height: 80, textAlignVertical: "top" },
  twoCol: { flexDirection: "row", gap: 12 },
  amountRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 10, borderWidth: 1, borderColor: "#E8E6E1", paddingLeft: 12 },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: "#374151", marginRight: 4 },
  amountInput: { flex: 1, backgroundColor: "transparent", borderWidth: 0, paddingLeft: 0 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E8E6E1", flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 2, backgroundColor: "#F97316", borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
})