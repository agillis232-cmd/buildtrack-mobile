import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from "react-native"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import AsyncStorage from "@react-native-async-storage/async-storage"
import DatePicker from "@/components/DatePicker"
import { colors } from "@/lib/theme"
import { CircleButton } from "@/components/ui"

const DEFAULT_CATEGORIES = [
  "Demolition & Site Preparation",
  "Foundation & Structural",
  "Framing & Building Envelope",
  "Kitchen & Finishes",
  "Flooring & Refinishing",
  "Electrical & Systems",
  "Mechanical & Roofing",
  "Exterior Finishes & Site Work",
  "Plumbing",
]

const UNITS = ["ea", "sqft", "lnft", "hrs", "lot", "allow"]

interface LineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  excluded: boolean
}

interface Category {
  name: string
  lineItems: LineItem[]
}

export default function NewEstimateScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [savedCategories, setSavedCategories] = useState<string[]>([])

  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [projectAddress, setProjectAddress] = useState("")
  const [projectId, setProjectId] = useState("")
  const [notes, setNotes] = useState("")
  const [excludedItems, setExcludedItems] = useState("")

  const [categories, setCategories] = useState<Category[]>([
    { name: "Demolition & Site Preparation", lineItems: [] },
  ])

  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [validUntil, setValidUntil] = useState("")

  useEffect(() => {
    if (token) loadProjects()
    loadSavedCategories()
  }, [token])

  async function loadProjects() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (e) {
      console.log("Error loading projects:", e)
    }
  }

  async function loadSavedCategories() {
    try {
      const saved = await AsyncStorage.getItem("custom_estimate_categories")
      console.log("Loaded saved categories:", saved)
      if (saved) setSavedCategories(JSON.parse(saved))
    } catch (e) {
      console.log("Error loading categories:", e)
    }
  }

  async function saveCustomCategory(name: string) {
    try {
      const all = [...new Set([...savedCategories, name])]
      console.log("Saving categories:", all)
      setSavedCategories(all)
      await AsyncStorage.setItem("custom_estimate_categories", JSON.stringify(all))
    } catch (e) {
      console.log("Error saving category:", e)
    }
  }

  function addCategory(name: string) {
    setCategories(prev => [...prev, { name, lineItems: [] }])
    setShowCategoryPicker(false)
    setNewCategoryName("")
    if (!DEFAULT_CATEGORIES.includes(name)) {
      saveCustomCategory(name)
    }
  }

  function removeCategory(index: number) {
    setCategories(prev => prev.filter((_, i) => i !== index))
  }

  function addLineItem(catIndex: number) {
    setCategories(prev => prev.map((cat, i) => {
      if (i !== catIndex) return cat
      return { ...cat, lineItems: [...cat.lineItems, { description: "", quantity: 1, unit: "ea", unitPrice: 0, excluded: false }] }
    }))
  }

  function updateLineItem(catIndex: number, itemIndex: number, field: string, value: any) {
    setCategories(prev => prev.map((cat, i) => {
      if (i !== catIndex) return cat
      return { ...cat, lineItems: cat.lineItems.map((item, j) => j !== itemIndex ? item : { ...item, [field]: value }) }
    }))
  }

  function removeLineItem(catIndex: number, itemIndex: number) {
    setCategories(prev => prev.map((cat, i) => {
      if (i !== catIndex) return cat
      return { ...cat, lineItems: cat.lineItems.filter((_, j) => j !== itemIndex) }
    }))
  }

  function calculateTotal() {
    return categories.reduce((sum, cat) => {
      return sum + cat.lineItems.reduce((s, item) => {
        if (item.excluded) return s
        return s + (item.quantity * item.unitPrice)
      }, 0)
    }, 0)
  }

  async function saveEstimate() {
    if (!clientName) {
      Alert.alert("Error", "Client name is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/estimates`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
       body: JSON.stringify({
          clientName, clientEmail, clientPhone, clientAddress,
          projectAddress, projectId: projectId || null,
          notes, excludedItems,
          validUntil: validUntil || null,
          categories: categories.map(cat => ({
            name: cat.name,
            lineItems: cat.lineItems.map(item => ({
              ...item,
              total: item.quantity * item.unitPrice
            }))
          }))
        })
      })
      const data = await res.json()
      if (data.estimate) {
        Alert.alert("Estimate Created!", `${data.estimate.estimateNumber} — $${data.estimate.total.toLocaleString()}`, [
          { text: "View Estimate", onPress: () => router.replace(`/estimate/${data.estimate.id}` as any) },
          { text: "Back to Estimates", onPress: () => router.replace("/estimates" as any) }
        ])
      } else {
        Alert.alert("Error", data.error || "Could not create estimate")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  const total = calculateTotal()
  const customSaved = savedCategories.filter(c => !DEFAULT_CATEGORIES.includes(c))

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <CircleButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text style={styles.title}>New Estimate</Text>
          {total > 0 && (
            <Text style={styles.totalPreview}>Total: ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Client Information</Text>
          <View style={styles.card}>
            <Field label="Client Name *" value={clientName} onChange={setClientName} placeholder="Henderson Residence" />
            <Field label="Client Email" value={clientEmail} onChange={setClientEmail} placeholder="client@email.com" keyboardType="email-address" />
            <Field label="Client Phone" value={clientPhone} onChange={setClientPhone} placeholder="(408) 555-0000" keyboardType="phone-pad" />
            <Field label="Client Address" value={clientAddress} onChange={setClientAddress} placeholder="123 Main St, City, CA" />
            <Field label="Project Address" value={projectAddress} onChange={setProjectAddress} placeholder="Project site address" last />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Link to Project (optional)</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowProjectPicker(true)}>
            <Text style={[styles.selectBtnText, !projectId && styles.placeholder]}>
              {projectId ? projects.find(p => p.id === projectId)?.name || "Select project..." : "Select project..."}
            </Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Scope of Work</Text>

          {categories.map((cat, catIndex) => (
            <View key={catIndex} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <TouchableOpacity onPress={() => removeCategory(catIndex)}>
                  <Text style={styles.removeCat}>✕</Text>
                </TouchableOpacity>
              </View>

              {cat.lineItems.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.lineItemRow}>
                  <View style={styles.lineItemTop}>
                    <TextInput
                      style={[styles.input, styles.descInput]}
                      value={item.description}
                      onChangeText={v => updateLineItem(catIndex, itemIndex, "description", v)}
                      placeholder="Description of work..."
                      placeholderTextColor={colors.chevron}
                      multiline
                    />
                    <TouchableOpacity onPress={() => removeLineItem(catIndex, itemIndex)} style={styles.removeItem}>
                      <Text style={styles.removeItemText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.lineItemNumbers}>
                    <View style={styles.numField}>
                      <Text style={styles.numLabel}>Qty</Text>
                      <TextInput
                        style={styles.numInput}
                        value={item.quantity.toString()}
                        onChangeText={v => updateLineItem(catIndex, itemIndex, "quantity", parseFloat(v) || 0)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.numField}>
                      <Text style={styles.numLabel}>Unit</Text>
                      <TouchableOpacity style={styles.unitBtn} onPress={() => {
                        const currentIndex = UNITS.indexOf(item.unit)
                        const nextUnit = UNITS[(currentIndex + 1) % UNITS.length]
                        updateLineItem(catIndex, itemIndex, "unit", nextUnit)
                      }}>
                        <Text style={styles.unitBtnText}>{item.unit}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.numField}>
                      <Text style={styles.numLabel}>Unit Price</Text>
                      <TextInput
                        style={styles.numInput}
                        value={item.unitPrice.toString()}
                        onChangeText={v => updateLineItem(catIndex, itemIndex, "unitPrice", parseFloat(v) || 0)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.numField}>
                      <Text style={styles.numLabel}>Total</Text>
                      <Text style={styles.numTotal}>${(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.excludedBtn, item.excluded && styles.excludedBtnActive]}
                    onPress={() => updateLineItem(catIndex, itemIndex, "excluded", !item.excluded)}
                  >
                    <Text style={[styles.excludedBtnText, item.excluded && styles.excludedBtnTextActive]}>
                      {item.excluded ? "Excluded (Owner Provided)" : "Mark as Excluded"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addItemBtn} onPress={() => addLineItem(catIndex)}>
                <Text style={styles.addItemBtnText}>+ Add Line Item</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addCategoryBtn} onPress={() => setShowCategoryPicker(true)}>
            <Text style={styles.addCategoryBtnText}>+ Add Category</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Valid Until (optional)</Text>
          <DatePicker label="" value={validUntil} onChange={setValidUntil} placeholder="Select expiry date..." />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes & Exclusions</Text>
          <View style={styles.card}>
            <View style={styles.fieldInner}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Timeline, special conditions..."
                placeholderTextColor={colors.chevron}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.fieldInner}>
              <Text style={styles.fieldLabel}>Items Excluded from Quote</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={excludedItems}
                onChangeText={setExcludedItems}
                placeholder="Pendant lights, granite slabs..."
                placeholderTextColor={colors.chevron}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {total > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Estimate Total</Text>
            <Text style={styles.totalValue}>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={saveEstimate} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Create Estimate</Text>}
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Category</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {DEFAULT_CATEGORIES.filter(c => !categories.find(cat => cat.name === c)).map(cat => (
                <TouchableOpacity key={cat} style={styles.catOption} onPress={() => addCategory(cat)}>
                  <Text style={styles.catOptionText}>{cat}</Text>
                </TouchableOpacity>
              ))}
              {customSaved.filter(c => !categories.find(cat => cat.name === c)).length > 0 && (
                <Text style={styles.savedLabel}>Your Saved Categories</Text>
              )}
              {customSaved.filter(c => !categories.find(cat => cat.name === c)).map(cat => (
                <TouchableOpacity key={cat} style={[styles.catOption, styles.catOptionSaved]} onPress={() => addCategory(cat)}>
                  <Text style={[styles.catOptionText, styles.catOptionTextSaved]}>{cat} ★</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.orLabel}>Or enter custom category:</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Custom category name..."
              placeholderTextColor={colors.chevron}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCategoryPicker(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              {newCategoryName.length > 0 && (
                <TouchableOpacity style={styles.saveBtn} onPress={() => addCategory(newCategoryName)}>
                  <Text style={styles.saveBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Picker Modal */}
      <Modal visible={showProjectPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Link to Project</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity style={styles.catOption} onPress={() => { setProjectId(""); setShowProjectPicker(false) }}>
                <Text style={styles.catOptionText}>None</Text>
              </TouchableOpacity>
              {projects.map(p => (
                <TouchableOpacity key={p.id} style={[styles.catOption, projectId === p.id && styles.catOptionActive]} onPress={() => { setProjectId(p.id); setShowProjectPicker(false) }}>
                  <Text style={[styles.catOptionText, projectId === p.id && styles.catOptionTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProjectPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Field({ label, value, onChange, placeholder, keyboardType, last }: any) {
  return (
    <View style={[styles.fieldInner, !last && { borderBottomWidth: 1, borderBottomColor: colors.separator }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.chevron}
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 120 },
  headerBanner: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  headerCircle: { display: "none" },
  backBtn: { marginBottom: 12 },
  backText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "700", color: colors.text, letterSpacing: -0.6, marginBottom: 4 },
  totalPreview: { fontSize: 18, fontWeight: "700", color: colors.tint, marginTop: 8 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginBottom: 8 },
  card: { backgroundColor: "white", borderRadius: 14, overflow: "hidden" },
  fieldInner: { padding: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  fieldInput: { fontSize: 15, color: colors.text },
  input: { backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text },
  multiline: { height: 80, textAlignVertical: "top" },
  selectBtn: { backgroundColor: "white", borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectBtnText: { fontSize: 15, color: colors.text, fontWeight: "500" },
  placeholder: { color: colors.textSecondary },
  arrow: { fontSize: 18, color: colors.textSecondary },
  categoryCard: { backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 12 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.separator },
  categoryName: { fontSize: 14, fontWeight: "700", color: colors.text, flex: 1 },
  removeCat: { fontSize: 16, color: colors.danger, fontWeight: "700", paddingLeft: 10 },
  lineItemRow: { backgroundColor: colors.fillSubtle, borderRadius: 10, padding: 12, marginBottom: 8 },
  lineItemTop: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  descInput: { flex: 1, backgroundColor: "transparent", borderWidth: 0, padding: 0, fontSize: 14, minHeight: 40 },
  removeItem: { padding: 4 },
  removeItemText: { fontSize: 14, color: colors.danger, fontWeight: "700" },
  lineItemNumbers: { flexDirection: "row", gap: 8 },
  numField: { flex: 1, alignItems: "center" },
  numLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", marginBottom: 4 },
  numInput: { backgroundColor: "white", borderRadius: 6, padding: 6, fontSize: 13, color: colors.text, width: "100%", textAlign: "center" },
  numTotal: { fontSize: 13, fontWeight: "700", color: colors.tint, marginTop: 6 },
  unitBtn: { backgroundColor: "white", borderRadius: 6, padding: 6, width: "100%", alignItems: "center" },
  unitBtnText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  excludedBtn: { marginTop: 8, paddingVertical: 6, alignItems: "center", borderRadius: 6, backgroundColor: colors.fillSubtle },
  excludedBtnActive: { backgroundColor: "#FEF3C7" },
  excludedBtnText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  excludedBtnTextActive: { color: "#D97706" },
  addItemBtn: { marginTop: 8, paddingVertical: 10, alignItems: "center", borderRadius: 8, borderStyle: "dashed" },
  addItemBtnText: { fontSize: 13, color: colors.tint, fontWeight: "600" },
  addCategoryBtn: { backgroundColor: "white", borderRadius: 14, padding: 16, alignItems: "center", borderStyle: "dashed" },
  addCategoryBtnText: { fontSize: 14, color: colors.tint, fontWeight: "600" },
  totalCard: { backgroundColor: colors.charcoal, borderRadius: 14, padding: 20, marginHorizontal: 16, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  totalValue: { fontSize: 24, fontWeight: "700", color: "white" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "white", borderTopWidth: 1, borderTopColor: colors.separator, flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: colors.fillSubtle, borderRadius: 12, padding: 14, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { flex: 2, backgroundColor: colors.charcoal, borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "75%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 },
  catOption: { padding: 14, borderRadius: 10, backgroundColor: colors.fillSubtle, marginBottom: 8 },
  catOptionActive: { backgroundColor: colors.tintSoft, borderColor: "#F97316" },
  catOptionSaved: { borderColor: "#F97316", backgroundColor: colors.tintSoft },
  catOptionText: { fontSize: 14, color: colors.text, fontWeight: "500" },
  catOptionTextActive: { color: colors.tint, fontWeight: "700" },
  catOptionTextSaved: { color: colors.tint, fontWeight: "600" },
  savedLabel: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, marginVertical: 10 },
  orLabel: { fontSize: 12, color: colors.textSecondary, marginVertical: 12, textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
})