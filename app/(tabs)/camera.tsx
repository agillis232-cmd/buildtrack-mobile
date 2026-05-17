import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from "react-native"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"

const ACTION_ICONS: Record<string, { lines: number[], circle?: boolean }> = {
  photo: { circle: true, lines: [14, 10] },
  log: { lines: [16, 12, 8] },
  receipt: { lines: [14, 12, 10, 8] },
  expense: { lines: [14, 10], circle: true },
  co: { lines: [16, 12, 8] },
  message: { lines: [14, 10], circle: true },
  project: { lines: [16, 12, 16] },
}

function ActionIcon({ type, color }: { type: string, color: string }) {
  return (
    <View style={{ gap: 4, alignItems: "flex-start", justifyContent: "center", flex: 1 }}>
      {type === "photo" && (
        <>
          <View style={{ width: 22, height: 16, borderRadius: 3, borderWidth: 2, borderColor: color, justifyContent: "center", alignItems: "center" }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
          </View>
        </>
      )}
      {type === "log" && (
        <>
          <View style={{ width: 18, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: color }} />
        </>
      )}
      {type === "receipt" && (
        <>
          <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: color }} />
        </>
      )}
      {type === "expense" && (
        <>
          <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "800", color }}>$</Text>
          </View>
        </>
      )}
      {type === "co" && (
        <>
          <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: color, marginLeft: 6 }} />
        </>
      )}
      {type === "message" && (
        <>
          <View style={{ width: 20, height: 14, borderRadius: 3, borderWidth: 2, borderColor: color }}>
            <View style={{ position: "absolute", bottom: -4, left: 3, width: 6, height: 4, backgroundColor: color, borderRadius: 1 }} />
          </View>
        </>
      )}
      {type === "project" && (
        <>
          <View style={{ width: 20, height: 14, borderRadius: 2, borderWidth: 2, borderColor: color }} />
          <View style={{ width: 8, height: 2, borderRadius: 1, backgroundColor: color, marginLeft: 6 }} />
        </>
      )}
    </View>
  )
}

export default function QuickActionsScreen() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const isAdminOrPM = user?.role === "ADMIN" || user?.role === "PROJECT_MANAGER"

  useEffect(() => {
    if (token) loadProjects()
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
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled) return

    setUploading(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${project.id}/photos`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: result.assets[0].base64 })
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
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 })
    if (result.canceled) return

    setScanning(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/scan-receipt`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: result.assets[0].base64 })
      })
      const data = await res.json()
      if (data.vendor) {
        setPendingAction("expense-scan")
        setShowProjectPicker(true)
      } else {
        Alert.alert("Error", "Could not scan receipt")
      }
    } catch (e) {
      Alert.alert("Error", "Could not scan receipt")
    }
    setScanning(false)
  }

  const actions = [
    {
      label: "Take Photo",
      sub: "Capture & attach to a project",
      color: "#3B82F6",
      iconType: "photo",
      onPress: () => requireProject("photo"),
      loading: uploading,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "Add Daily Log",
      sub: "Log today's site activity",
      color: "#16A34A",
      iconType: "log",
      onPress: () => requireProject("log"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "Scan Receipt",
      sub: "AI-powered expense scanning",
      color: "#8B5CF6",
      iconType: "receipt",
      onPress: scanReceipt,
      loading: scanning,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "Log Expense",
      sub: "Add an expense to a project",
      color: "#F97316",
      iconType: "expense",
      onPress: () => requireProject("expense"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "New Change Order",
      sub: "Create a change order",
      color: "#DC2626",
      iconType: "co",
      onPress: () => requireProject("change-order"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER"],
    },
    {
      label: "Send Message",
      sub: "Message a project team",
      color: "#EC4899",
      iconType: "message",
      onPress: () => requireProject("message"),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"],
    },
    {
      label: "New Project",
      sub: "Create a new project",
      color: "#1C1F26",
      iconType: "project",
      onPress: () => router.push("/new-project" as any),
      loading: false,
      roles: ["ADMIN", "PROJECT_MANAGER"],
    },
  ].filter(a => a.roles.includes(user?.role || ""))

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <Text style={styles.title}>Quick Actions</Text>
          <Text style={styles.subtitle}>What do you need to do?</Text>
        </View>

        <View style={styles.grid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionCard, { borderLeftColor: action.color }]}
              onPress={action.onPress}
              disabled={action.loading}
              activeOpacity={0.8}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.iconBox, { backgroundColor: action.color + "12" }]}>
                  <ActionIcon type={action.iconType} color={action.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionSub}>{action.sub}</Text>
                </View>
              </View>
              {action.loading
                ? <ActivityIndicator color={action.color} size="small" />
                : <Text style={[styles.actionArrow, { color: action.color }]}>›</Text>
              }
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showProjectPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Project</Text>
            <Text style={styles.modalSub}>Which project is this for?</Text>
            <ScrollView style={styles.projectList}>
              {loading ? (
                <ActivityIndicator color="#F97316" style={{ marginTop: 20 }} />
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
                        backgroundColor: project.status === "ACTIVE" ? "#16A34A" : "#9CA3AF"
                      }]} />
                      <View>
                        <Text style={styles.projectRowName}>{project.name}</Text>
                        <Text style={styles.projectRowSub}>{project.city}, {project.state} · {project.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.projectRowArrow}>›</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 40 },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  title: { fontSize: 28, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  grid: { paddingHorizontal: 16, gap: 10 },
  actionCard: { backgroundColor: "white", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#E8E6E1", borderLeftWidth: 4 },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", paddingHorizontal: 10 },
  actionLabel: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  actionSub: { fontSize: 12, color: "#9CA3AF" },
  actionArrow: { fontSize: 24, fontWeight: "300" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "75%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#9CA3AF", marginBottom: 16 },
  projectList: { maxHeight: 400 },
  noProjects: { textAlign: "center", color: "#9CA3AF", marginTop: 20 },
  projectRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 8 },
  projectRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  projectRowName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  projectRowSub: { fontSize: 12, color: "#9CA3AF" },
  projectRowArrow: { fontSize: 20, color: "#D1D5DB" },
  cancelBtn: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
})