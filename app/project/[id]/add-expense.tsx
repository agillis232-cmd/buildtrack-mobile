import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"

export default function AddExpenseScreen() {
  const { id, prefill } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const prefillData = prefill ? JSON.parse(decodeURIComponent(prefill as string)) : {}

  const [vendor, setVendor] = useState(prefillData.vendor || "")
  const [description, setDescription] = useState(prefillData.description || "")
  const [amount, setAmount] = useState(prefillData.amount?.toString() || "")
  const [date, setDate] = useState(prefillData.date || new Date().toISOString().split("T")[0])
  const [categories, setCategories] = useState<any[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [showCategories, setShowCategories] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
        if (data.categories?.length > 0 && !categoryId) {
          setCategoryId(data.categories[0].id)
        }
      }
    } catch (e) { console.log("Error loading categories:", e) }
  }

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
        body: JSON.stringify({ vendor, description, amount: parseFloat(amount), date, categoryId: categoryId || undefined })
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

  const selectedCategory = categories.find(c => c.id === categoryId)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add expense</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Vendor *</Text>
            <TextInput
              value={vendor}
              onChangeText={setVendor}
              placeholder="e.g. Home Depot"
              placeholderTextColor="#999"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Lumber for framing"
              placeholderTextColor="#999"
              style={styles.input}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                style={[styles.input, { fontSize: 20, fontWeight: "700" }]}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </View>
          </View>

          {/* Category picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              onPress={() => setShowCategories(!showCategories)}
              style={[styles.input, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {selectedCategory && (
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedCategory.color || "#6B7280" }} />
                )}
                <Text style={{ fontSize: 14, color: selectedCategory ? "#1C1F26" : "#999" }}>
                  {selectedCategory?.name || "Select category"}
                </Text>
              </View>
              <Ionicons name={showCategories ? "chevron-up" : "chevron-down"} size={16} color="#999" />
            </TouchableOpacity>

            {showCategories && (
              <View style={styles.categoryList}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => { setCategoryId(cat.id); setShowCategories(false) }}
                    style={[styles.categoryItem, categoryId === cat.id && styles.categoryItemSelected]}
                  >
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cat.color || "#6B7280" }} />
                    <Text style={[styles.categoryItemText, categoryId === cat.id && { color: "#F97316", fontWeight: "700" }]}>
                      {cat.name}
                    </Text>
                    {categoryId === cat.id && <Ionicons name="checkmark" size={16} color="#F97316" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity onPress={save} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Save expense</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 40 },
  headerBanner: {
    backgroundColor: "#1C1F26", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    position: "relative", overflow: "hidden",
  },
  headerCircle: {
    position: "absolute", top: -60, right: -60, width: 200, height: 200,
    borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)",
  },
  backBtn: { marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "white", letterSpacing: -0.5 },
  card: {
    backgroundColor: "white", margin: 16, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: "#E8E6E1",
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 14,
    borderWidth: 1, borderColor: "#E8E6E1", color: "#1C1F26",
  },
  row: { flexDirection: "row", gap: 12 },
  categoryList: {
    marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E8E6E1",
    backgroundColor: "white", overflow: "hidden",
  },
  categoryItem: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  categoryItemSelected: { backgroundColor: "#FFF7ED" },
  categoryItemText: { flex: 1, fontSize: 14, color: "#374151" },
  saveBtn: {
    backgroundColor: "#F97316", marginHorizontal: 16, padding: 16,
    borderRadius: 12, alignItems: "center",
  },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
})