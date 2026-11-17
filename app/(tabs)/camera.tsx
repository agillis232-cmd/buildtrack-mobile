import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, Alert, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"
import { toDateKey } from "@/lib/dates"
import { loadCached } from "@/lib/cache"
import { Screen, ScreenHeader, SectionHeader, Card } from "@/components/ui"
import { colors, type, type as typography, humanize } from "@/lib/theme"

type IconName = keyof typeof Ionicons.glyphMap


export default function QuickActionsScreen() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [scannedExpense, setScannedExpense] = useState<any>(null)

  const isAdminOrPM = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"

  useEffect(() => {
    if (token) loadProjects()
  }, [token])

  async function loadProjects() {
    try {
      await loadCached("/api/mobile/projects", token, data => setProjects(data.projects || []))
    } catch (e) {
      console.log("Error loading projects:", e)
    }
    setLoading(false)
  }

  function requireProject(action: string) {
    setPendingAction(action)
    setShowProjectPicker(true)
  }

  async function handleProjectSelected(project: any) {
    setShowProjectPicker(false)
    if (!pendingAction) return

    switch (pendingAction) {
      case "photo":
        await takePhoto(project)
        break
      case "log":
        router.push(`/project/${project.id}/logs` as any)
        break
      case "expense":
        router.push(`/project/${project.id}/expenses` as any)
        break
      case "expense-scan":
        // Open the new-expense form already filled in from the scanned receipt.
        router.push((scannedExpense
          ? `/project/${project.id}/add-expense?prefill=${encodeURIComponent(JSON.stringify(scannedExpense))}`
          : `/project/${project.id}/add-expense`) as any)
        setScannedExpense(null)
        break
      case "change-order":
        router.push(`/project/${project.id}/change-orders` as any)
        break
      case "message":
        router.push(`/project/${project.id}/messages` as any)
        break
    }
    setPendingAction(null)
  }

  async function takePhoto(project: any) {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow camera access")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 })
    if (result.canceled || !result.assets?.length) return

    setUploading(true)
    try {
      const signRes = await fetch(`${API_URL}/api/mobile/cloudinary-sign`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ folder: `buildtrack/projects/${project.id}` }),
      })
      const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json()

      const formData = new FormData()
      formData.append("file", { uri: result.assets[0].uri, type: "image/jpeg", name: "photo.jpg" } as any)
      formData.append("signature", signature)
      formData.append("timestamp", String(timestamp))
      formData.append("api_key", apiKey)
      formData.append("folder", folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })
      const cloudData = await uploadRes.json()

      const res = await fetch(`${API_URL}/api/mobile/projects/${project.id}/photos`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cloudinaryUrl: cloudData.secure_url, publicId: cloudData.public_id }),
      })
      const data = await res.json()
      if (data.photo) {
        Alert.alert("Success!", `Photo uploaded to ${project.name}`, [
          { text: "View Photos", onPress: () => router.push(`/project/${project.id}/photos` as any) },
          { text: "Done" }
        ])
      } else {
        Alert.alert("Error", "Could not upload photo")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setUploading(false)
  }
  async function scanReceipt() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow camera access")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
    if (result.canceled) return

    setScanning(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/scan-receipt`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: result.assets[0].base64 })
      })
      const data = await res.json()
      if (data.expense) {
        // Keep what was read off the receipt, then ask which project it belongs to.
        setScannedExpense(data.expense)
        setPendingAction("expense-scan")
        setShowProjectPicker(true)
      } else {
        Alert.alert("Could not read receipt", "Try again with the whole receipt in frame, or log the expense by hand.")
      }
    } catch (e) {
      Alert.alert("Error", "Could not scan receipt")
    }
    setScanning(false)
  }

  const [scanningOverhead, setScanningOverhead] = useState(false)
  const [overheadScanned, setOverheadScanned] = useState<any>(null)
  const [showOverheadModal, setShowOverheadModal] = useState(false)
  const [overheadCategories, setOverheadCategories] = useState<any[]>([])
  const [selectedOverheadCat, setSelectedOverheadCat] = useState("")
  const [savingOverhead, setSavingOverhead] = useState(false)

  async function scanOverheadReceipt() {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) { Alert.alert("Permission needed", "Please allow camera access"); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 })
    if (result.canceled || !result.assets?.length) return

    setScanningOverhead(true)
    try {
      // Upload to Cloudinary first
      const signRes = await fetch(`${API_URL}/api/mobile/cloudinary-sign`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "buildtrack/overhead-receipts" }),
      })
      const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json()

      const formData = new FormData()
      formData.append("file", { uri: result.assets[0].uri, type: "image/jpeg", name: "receipt.jpg" } as any)
      formData.append("signature", signature)
      formData.append("timestamp", String(timestamp))
      formData.append("api_key", apiKey)
      formData.append("folder", folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData })
      const cloudData = await uploadRes.json()

      // Scan with AI
      const scanRes = await fetch(`${API_URL}/api/mobile/overhead`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ scanReceipt: true, receiptUrl: cloudData.secure_url }),
      })
      const scanData = await scanRes.json()

      if (scanData.scanned) {
        setOverheadScanned({ ...scanData.scanned, receiptUrl: cloudData.secure_url })
        // Load categories
        const catRes = await fetch(`${API_URL}/api/mobile/overhead`, {
          headers: { "Authorization": `Bearer ${token}` },
        })
        const catData = await catRes.json()
        setOverheadCategories(catData.categories || [])
        if (catData.categories?.length > 0) setSelectedOverheadCat(catData.categories[0].id)
        setShowOverheadModal(true)
      } else {
        Alert.alert("Could not read receipt", scanData.error || "Try again with the whole receipt in frame.")
      }
    } catch (e: any) {
      console.log("Overhead receipt scan failed:", e)
      Alert.alert("Could not scan receipt", "Check your connection and try again.")
    }
    setScanningOverhead(false)
  }
  async function saveOverheadExpense() {
    if (!overheadScanned || !selectedOverheadCat) return
    setSavingOverhead(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/overhead`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedOverheadCat,
          vendor: overheadScanned.vendor || "Unknown",
          description: overheadScanned.description || "",
          amount: overheadScanned.amount || 0,
          date: overheadScanned.date || toDateKey(new Date()),
          receiptUrl: overheadScanned.receiptUrl,
          receiptName: "receipt.jpg",
        }),
      })
      const data = await res.json()
      if (data.expense) {
        Alert.alert("Saved!", `$${data.expense.amount.toLocaleString()} added to overhead`)
        setShowOverheadModal(false)
        setOverheadScanned(null)
      } else {
        Alert.alert("Error", data.error || "Could not save")
      }
    } catch (e) { Alert.alert("Error", "Connection error") }
    setSavingOverhead(false)
  }

  const actions = [
    {
      label: "Take photo",
      sub: "Capture & attach to a project",
      color: "#3B82F6",
      icon: "camera-outline" as IconName,
      onPress: () => requireProject("photo"),
      loading: uploading,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "Add daily log",
      sub: "Log today's site activity",
      color: "#16A34A",
      icon: "document-text-outline" as IconName,
      onPress: () => requireProject("log"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "Scan receipt",
      sub: "Read a receipt into an expense",
      color: "#8B5CF6",
      icon: "scan-outline" as IconName,
      onPress: scanReceipt,
      loading: scanning,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "Log expense",
      sub: "Add an expense to a project",
      color: "#F97316",
      icon: "wallet-outline" as IconName,
      onPress: () => requireProject("expense"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "New change order",
      sub: "Create a change order",
      color: "#DC2626",
      icon: "swap-horizontal-outline" as IconName,
      onPress: () => requireProject("change-order"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER"],
    },
    {
      label: "Send message",
      sub: "Message a project team",
      color: "#EC4899",
      icon: "chatbubble-outline" as IconName,
      onPress: () => requireProject("message"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "Overhead receipt",
      sub: "Scan a receipt for company overhead",
      color: "#DC2626",
      icon: "receipt-outline" as IconName,
      onPress: scanOverheadReceipt,
      loading: scanningOverhead,
      roles: ["ADMIN", "PROJECT_MANAGER"],
    },
    {
      label: "New project",
      sub: "Create a new project",
      color: "#1C1F26",
      icon: "business-outline" as IconName,
      onPress: () => router.push("/new-project" as any),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER"],
    },
  ].filter(a => a.roles.includes(user?.role || ""))

  const OFFICE_ACTIONS = ["New change order", "Overhead receipt", "New project"]
  const groups = [
    { title: "On site", items: actions.filter(a => !OFFICE_ACTIONS.includes(a.label)) },
    { title: "Office", items: actions.filter(a => OFFICE_ACTIONS.includes(a.label)) },
  ].filter(group => group.items.length > 0)

  return (
    <Screen tabBar>
      <ScreenHeader title="Quick add" subtitle="What do you need to do?" />

      {groups.map(group => (
        <View key={group.title} style={{ gap: 8 }}>
          <SectionHeader title={group.title} />
          <Card>
            {group.items.map((action, index) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                disabled={action.loading}
                accessibilityRole="button"
                accessibilityLabel={`${action.label}. ${action.sub}`}
                accessibilityState={{ busy: action.loading }}
                style={({ pressed }) => [styles.actionRow, index > 0 && styles.actionDivider, pressed && { backgroundColor: colors.fillSubtle }]}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={action.icon} size={22} color={colors.tint} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={type.headline}>{action.label}</Text>
                  <Text style={type.footnote}>{action.sub}</Text>
                </View>
                {action.loading
                  ? <ActivityIndicator color={colors.tint} size="small" />
                  : <Ionicons name="chevron-forward" size={16} color={colors.chevron} />}
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

    <Modal visible={showProjectPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choose a project</Text>
          <Text style={styles.modalSub}>Which project is this for?</Text>
          <ScrollView style={styles.projectList}>
            {loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
            ) : projects.length === 0 ? (
              <Text style={styles.noProjects}>No projects found</Text>
            ) : (
              projects.map(project => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectRow}
                  onPress={() => handleProjectSelected(project)}
                  activeOpacity={0.8}
                >
                  <View style={styles.projectRowLeft}>
                    <View style={[styles.projectDot, {
                      backgroundColor: project.status === "ACTIVE" ? colors.success : colors.chevron
                    }]} />
                    <View>
                      <Text style={styles.projectRowName}>{project.name}</Text>
                      <Text style={styles.projectRowSub}>{[[project.city, project.state].filter(Boolean).join(", "), humanize(project.status)].filter(Boolean).join(" · ")}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowProjectPicker(false); setPendingAction(null) }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Overhead Receipt Modal */}
    <Modal visible={showOverheadModal} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "80%" }}>
          <Text style={styles.modalTitle}>Overhead expense</Text>
          <Text style={styles.modalSub}>Check what was read from the receipt</Text>

          {overheadScanned && (
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Vendor</Text>
                  <Text style={typography.headline}>{overheadScanned.vendor || "Unknown"}</Text>
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Amount</Text>
                  <Text style={typography.title2}>${(overheadScanned.amount || 0).toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Date</Text>
                  <Text style={typography.body}>{overheadScanned.date || "Today"}</Text>
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Description</Text>
                  <Text style={typography.body}>{overheadScanned.description || "—"}</Text>
                </View>

                {overheadScanned.lineItems?.length > 0 && (
                  <View>
                    <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>Items ({overheadScanned.lineItems.length})</Text>
                    {overheadScanned.lineItems.map((item: any, i: number) => (
                      <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }}>
                        <View style={{ flex: 1 }}>
                          <Text style={typography.subhead}>{item.description}</Text>
                          <Text style={{ fontSize: 12, color: colors.tint, fontWeight: "600" }}>{item.materialTag || "Other"}</Text>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>${(item.amount || 0).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View>
                  <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {overheadCategories.map((cat: any) => (
                        <TouchableOpacity key={cat.id} onPress={() => setSelectedOverheadCat(cat.id)}
                          style={{ paddingHorizontal: 14, height: 36, justifyContent: "center", borderRadius: 18,
                            backgroundColor: selectedOverheadCat === cat.id ? colors.charcoal : colors.fillSubtle }}>
                          <Text style={{ fontSize: 14, fontWeight: "600",
                            color: selectedOverheadCat === cat.id ? colors.white : colors.text }}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={() => { setShowOverheadModal(false); setOverheadScanned(null) }}
              style={{ flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.fillSubtle, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveOverheadExpense} disabled={savingOverhead || !selectedOverheadCat}
              style={{ flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.charcoal, alignItems: "center", justifyContent: "center", opacity: savingOverhead || !selectedOverheadCat ? 0.5 : 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: colors.white }}>{savingOverhead ? "Saving…" : "Save expense"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  actionRow: { minHeight: 64, paddingVertical: 10, paddingLeft: 14, paddingRight: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  actionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.tintSoft, justifyContent: "center", alignItems: "center" },

  // "Choose a project" sheet
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "75%" },
  modalTitle: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 15, color: colors.textSecondary, marginBottom: 16 },
  projectList: { maxHeight: 400 },
  noProjects: { textAlign: "center", color: colors.textSecondary, fontSize: 15, marginTop: 20 },
  projectRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 60, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.fillSubtle, marginBottom: 8 },
  projectRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  projectRowName: { fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 2 },
  projectRowSub: { fontSize: 13, color: colors.textSecondary },
  cancelBtn: { backgroundColor: colors.fillSubtle, borderRadius: 12, height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelBtnText: { fontSize: 17, fontWeight: "600", color: colors.text },

  // Overhead receipt sheet
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
})
