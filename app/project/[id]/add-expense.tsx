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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Add Expense</Text>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Vendor *</Text>
          <TextInput style={styles.input} value={vendor} onChangeText={setVendor} placeholder="Home Depot" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Lumber, screws, etc." placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Amount *</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Expense</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { padding: 20, paddingBottom: 40, paddingTop: 60 },
  backBtn: { marginBottom: 20 },
  backText: { color: "#F97316", fontSize: 16, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A1A", marginBottom: 24 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  input: { backgroundColor: "white", borderRadius: 10, padding: 13, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  saveBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
})