import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { Ionicons } from "@expo/vector-icons"
import { toDateKey } from "@/lib/dates"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

export default function AddExpenseScreen() {
  const { id, prefill } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const prefillData = prefill ? JSON.parse(decodeURIComponent(prefill as string)) : {}

  const [vendor, setVendor] = useState(prefillData.vendor || "")
  const [description, setDescription] = useState(prefillData.description || "")
  const [amount, setAmount] = useState(prefillData.amount?.toString() || "")
  const [date, setDate] = useState(prefillData.date || toDateKey(new Date()))
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
          <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
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
                    <Text style={[styles.categoryItemText, categoryId === cat.id && { color: colors.tint, fontWeight: "700" }]}>
                      {cat.name}
                    </Text>
                    {categoryId === cat.id && <Ionicons name="checkmark" size={16} color={colors.tint} />}
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  headerBanner: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  backBtn: { marginBottom: 12 },
  headerTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6 },
  card: {
    backgroundColor: "white", margin: 16, borderRadius: 14, padding: 20,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 12, fontSize: 14, color: colors.text,
  },
  row: { flexDirection: "row", gap: 12 },
  categoryList: {
    marginTop: 8, borderRadius: 10,
    backgroundColor: "white", overflow: "hidden", zIndex: 10, position: "relative",
    marginBottom: 60,
  },
  categoryItem: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
    borderBottomWidth: 1, borderBottomColor: colors.separator,
  },
  categoryItemSelected: { backgroundColor: colors.tintSoft },
  categoryItemText: { flex: 1, fontSize: 14, color: colors.text },
  saveBtn: {
    backgroundColor: colors.charcoal, marginHorizontal: 16, padding: 16,
    borderRadius: 12, alignItems: "center",
  },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
})