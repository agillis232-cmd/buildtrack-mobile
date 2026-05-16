import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

const ROLES = ["ADMIN", "PROJECT_MANAGER", "FIELD_WORKER"]

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#16A34A",
  PENDING: "#D97706",
  REJECTED: "#DC2626",
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#8B5CF6",
  PROJECT_MANAGER: "#3B82F6",
  FIELD_WORKER: "#F97316",
  CLIENT: "#16A34A",
}

export default function AdminUsersScreen() {
  const { token, user } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "ACTIVE">("ALL")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (token) {
      loadUsers()
      loadProjects()
    }
  }, [token])

  async function loadUsers() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setUsers(data.users || [])
    } catch (e) {
      console.log("Error loading users:", e)
    }
    setLoading(false)
  }

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

  async function approveUser(userId: string) {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" })
      })
      const data = await res.json()
      if (data.user) {
        setUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, status: "ACTIVE" } : u))
        if (selectedUser?.id === userId) setSelectedUser((prev: any) => ({ ...prev, status: "ACTIVE" }))
      }
    } catch (e) {
      Alert.alert("Error", "Could not approve user")
    }
    setSaving(false)
  }

  async function rejectUser(userId: string) {
    Alert.alert("Reject User", "Are you sure you want to reject this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject", style: "destructive", onPress: async () => {
          setSaving(true)
          try {
            const res = await fetch(`${API_URL}/api/mobile/admin/users/${userId}`, {
              method: "PATCH",
              headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ status: "REJECTED" })
            })
            const data = await res.json()
            if (data.user) {
              setUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, status: "REJECTED" } : u))
              if (selectedUser?.id === userId) setSelectedUser((prev: any) => ({ ...prev, status: "REJECTED" }))
            }
          } catch (e) {
            Alert.alert("Error", "Could not reject user")
          }
          setSaving(false)
        }
      }
    ])
  }

  async function updateRole(userId: string, role: string) {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      })
      const data = await res.json()
      if (data.user) {
        setUsers(prev => prev.map(u => u.id === data.user.id ? { ...u, role } : u))
        if (selectedUser?.id === userId) setSelectedUser((prev: any) => ({ ...prev, role }))
      }
    } catch (e) {
      Alert.alert("Error", "Could not update role")
    }
    setSaving(false)
  }

  async function toggleAssignment(userId: string, projectId: string, isAssigned: boolean) {
    try {
      const res = await fetch(`${API_URL}/api/mobile/admin/assignments`, {
        method: isAssigned ? "DELETE" : "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userId, projectId })
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => {
          if (u.id !== userId) return u
          const assignments = isAssigned
            ? u.assignments.filter((a: any) => a.projectId !== projectId)
            : [...u.assignments, { projectId, project: projects.find(p => p.id === projectId) }]
          return { ...u, assignments }
        }))
        if (selectedUser?.id === userId) {
          setSelectedUser((prev: any) => {
            const assignments = isAssigned
              ? prev.assignments.filter((a: any) => a.projectId !== projectId)
              : [...prev.assignments, { projectId, project: projects.find(p => p.id === projectId) }]
            return { ...prev, assignments }
          })
        }
      }
    } catch (e) {
      Alert.alert("Error", "Could not update assignment")
    }
  }

  async function deleteUser(userId: string) {
    Alert.alert("Delete User", "This cannot be undone. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/mobile/admin/users/${userId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            setUsers(prev => prev.filter(u => u.id !== userId))
            setSelectedUser(null)
          } catch (e) {
            Alert.alert("Error", "Could not delete user")
          }
        }
      }
    ])
  }

  const filtered = users.filter(u => {
    if (filter === "PENDING") return u.status === "PENDING"
    if (filter === "ACTIVE") return u.status === "ACTIVE"
    return true
  })

  const pendingCount = users.filter(u => u.status === "PENDING").length

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Team Management</Text>
          <Text style={styles.subtitle}>{users.length} team members</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>{pendingCount} pending approval{pendingCount > 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(["ALL", "PENDING", "ACTIVE"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "ALL" ? "All" : f === "PENDING" ? `Pending (${pendingCount})` : "Active"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySub}>No {filter.toLowerCase()} users</Text>
          </View>
        ) : (
          filtered.map(u => (
            <TouchableOpacity
              key={u.id}
              style={styles.userCard}
              onPress={() => setSelectedUser(u)}
              activeOpacity={0.8}
            >
              <View style={styles.userLeft}>
                {u.avatarUrl ? (
                  <Image source={{ uri: u.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: ROLE_COLORS[u.role] || "#6B7280" }]}>
                    <Text style={styles.avatarText}>{u.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[u.role] + "20" }]}>
                      <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[u.role] }]}>{u.role.replace("_", " ")}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[u.status] + "20" }]}>
                      <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[u.status] }]}>{u.status}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {u.status === "PENDING" && (
                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => approveUser(u.id)}>
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectUser(u.id)}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* User detail modal */}
      <Modal visible={!!selectedUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView>
              <View style={styles.modalUserHeader}>
                {selectedUser?.avatarUrl ? (
                  <Image source={{ uri: selectedUser.avatarUrl }} style={styles.modalAvatar} />
                ) : (
                  <View style={[styles.modalAvatarFallback, { backgroundColor: ROLE_COLORS[selectedUser?.role] || "#6B7280" }]}>
                    <Text style={styles.modalAvatarText}>{selectedUser?.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.modalName}>{selectedUser?.name}</Text>
                <Text style={styles.modalEmail}>{selectedUser?.email}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedUser?.status] + "20" }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[selectedUser?.status] }]}>{selectedUser?.status}</Text>
                  </View>
                </View>
              </View>

              {/* Approval actions */}
              {selectedUser?.status === "PENDING" && (
                <View style={styles.approvalSection}>
                  <Text style={styles.sectionTitle}>Approval</Text>
                  <View style={styles.approvalBtns}>
                    <TouchableOpacity style={styles.approveFullBtn} onPress={() => approveUser(selectedUser.id)} disabled={saving}>
                      {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.approveFullBtnText}>Approve Access</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectFullBtn} onPress={() => rejectUser(selectedUser.id)} disabled={saving}>
                      <Text style={styles.rejectFullBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Role */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Role</Text>
                <View style={styles.roleRow}>
                  {ROLES.map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleBtn, selectedUser?.role === r && { backgroundColor: ROLE_COLORS[r] + "20", borderColor: ROLE_COLORS[r] }]}
                      onPress={() => updateRole(selectedUser.id, r)}
                      disabled={saving}
                    >
                      <Text style={[styles.roleBtnText, selectedUser?.role === r && { color: ROLE_COLORS[r] }]}>
                        {r.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Project assignments - only for field workers */}
              {selectedUser?.role === "FIELD_WORKER" && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Project Assignments</Text>
                  {projects.map(project => {
                    const isAssigned = selectedUser?.assignments?.some((a: any) => a.projectId === project.id)
                    return (
                      <TouchableOpacity
                        key={project.id}
                        style={[styles.projectRow, isAssigned && styles.projectRowAssigned]}
                        onPress={() => toggleAssignment(selectedUser.id, project.id, isAssigned)}
                      >
                        <Text style={[styles.projectRowText, isAssigned && styles.projectRowTextAssigned]}>{project.name}</Text>
                        <View style={[styles.assignToggle, isAssigned && styles.assignToggleActive]}>
                          <Text style={[styles.assignToggleText, isAssigned && styles.assignToggleTextActive]}>
                            {isAssigned ? "Assigned" : "Assign"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {/* Danger zone */}
              {selectedUser?.id !== user?.id && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Danger Zone</Text>
                  <TouchableOpacity style={styles.deleteUserBtn} onPress={() => deleteUser(selectedUser.id)}>
                    <Text style={styles.deleteUserBtnText}>Delete User Account</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedUser(null)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 10 },
  pendingBanner: { backgroundColor: "rgba(217,119,6,0.2)", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(217,119,6,0.3)" },
  pendingBannerText: { fontSize: 12, color: "#D97706", fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 99, backgroundColor: "white", borderWidth: 1, borderColor: "#E8E6E1", alignItems: "center" },
  filterBtnActive: { backgroundColor: "#1C1F26", borderColor: "#1C1F26" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterTextActive: { color: "white" },
  emptyCard: { backgroundColor: "white", borderRadius: 14, padding: 40, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1", marginHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#9CA3AF" },
  userCard: { backgroundColor: "white", borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1" },
  userLeft: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "white" },
  userName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  userEmail: { fontSize: 12, color: "#9CA3AF", marginBottom: 6 },
  badgeRow: { flexDirection: "row", gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  roleBadgeText: { fontSize: 10, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  quickActions: { flexDirection: "row", gap: 8 },
  approveBtn: { flex: 1, backgroundColor: "#DCFCE7", borderRadius: 8, padding: 8, alignItems: "center" },
  approveBtnText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  rejectBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 8, padding: 8, alignItems: "center" },
  rejectBtnText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalUserHeader: { alignItems: "center", marginBottom: 20 },
  modalAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  modalAvatarFallback: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  modalAvatarText: { fontSize: 28, fontWeight: "700", color: "white" },
  modalName: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  modalEmail: { fontSize: 14, color: "#9CA3AF", marginBottom: 8 },
  approvalSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  approvalBtns: { flexDirection: "row", gap: 10 },
  approveFullBtn: { flex: 2, backgroundColor: "#16A34A", borderRadius: 12, padding: 14, alignItems: "center" },
  approveFullBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  rejectFullBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14, alignItems: "center" },
  rejectFullBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 15 },
  section: { marginBottom: 20 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E8E6E1" },
  roleBtnText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  projectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 6 },
  projectRowAssigned: { backgroundColor: "#FFF7ED", borderColor: "#F97316" },
  projectRowText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  projectRowTextAssigned: { color: "#1A1A1A", fontWeight: "700" },
  assignToggle: { backgroundColor: "#F3F4F6", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  assignToggleActive: { backgroundColor: "#F97316" },
  assignToggleText: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  assignToggleTextActive: { color: "white" },
  deleteUserBtn: { backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#FECACA" },
  deleteUserBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 15 },
  closeBtn: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  closeBtnText: { color: "#6B7280", fontWeight: "600", fontSize: 15 },
})