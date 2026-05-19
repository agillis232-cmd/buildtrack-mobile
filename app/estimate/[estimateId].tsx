import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Linking } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6B7280",
  SENT: "#3B82F6",
  APPROVED: "#16A34A",
  DECLINED: "#DC2626",
  CONVERTED: "#8B5CF6",
}

export default function EstimateDetailScreen() {
  const { estimateId } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [estimate, setEstimate] = useState<any>(null)
  const [schedule, setSchedule] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [projectWeeks, setProjectWeeks] = useState("12")
  const [startDate, setStartDate] = useState("")
  const [generatingSchedule, setGeneratingSchedule] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendTo, setSendTo] = useState("")
  const [sendMessage, setSendMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (token && estimateId) {
      loadEstimate()
      loadSchedule()
    }
  }, [token, estimateId])

  async function loadEstimate() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/estimates/${estimateId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setEstimate(data.estimate)
    } catch (e) {
      console.log("Error loading estimate:", e)
    }
    setLoading(false)
  }

  async function loadSchedule() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/estimates/${estimateId}/payment-schedule`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setSchedule(data.schedule)
    } catch (e) {
      console.log("Error loading schedule:", e)
    }
  }

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`${API_URL}/api/mobile/estimates/${estimateId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (data.estimate) {
        setEstimate(data.estimate)
        setShowStatusModal(false)
      }
    } catch (e) {
      Alert.alert("Error", "Could not update status")
    }
  }

  async function generateSchedule() {
    if (!projectWeeks) {
      Alert.alert("Error", "Please enter project duration in weeks")
      return
    }
    setGeneratingSchedule(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/estimates/${estimateId}/payment-schedule`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          projectWeeks: parseInt(projectWeeks),
          startDate: startDate || null
        })
      })
      const data = await res.json()
      if (data.schedule) {
        setSchedule(data.schedule)
        setShowScheduleModal(false)
      }
    } catch (e) {
      Alert.alert("Error", "Could not generate schedule")
    }
    setGeneratingSchedule(false)
  }
  async function sendEstimate() {
    if (!sendTo) {
      Alert.alert("Error", "Please enter an email address")
      return
    }
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/estimates/${estimateId}/send`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendTo, message: sendMessage })
      })
      const data = await res.json()
      if (data.success) {
        setEstimate((prev: any) => ({ ...prev, status: "SENT" }))
        setShowSendModal(false)
        Alert.alert("Sent!", `Estimate emailed to ${sendTo}`)
      } else {
        Alert.alert("Error", "Could not send email")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSending(false)
  }

  async function deleteEstimate() {
    Alert.alert("Delete Estimate", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await fetch(`${API_URL}/api/mobile/estimates/${estimateId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            router.replace("/estimates" as any)
          } catch (e) {
            Alert.alert("Error", "Could not delete estimate")
          }
        }
      }
    ])
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>
  if (!estimate) return <View style={styles.center}><Text style={styles.errorText}>Estimate not found</Text></View>

  const statusColor = STATUS_COLORS[estimate.status] || "#6B7280"

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBanner}>
          <View style={styles.headerCircle} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTop}>
            <Text style={styles.estimateNumber}>{estimate.estimateNumber}</Text>
            <TouchableOpacity
              style={[styles.statusBadge, { backgroundColor: statusColor + "30" }]}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>{estimate.status}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.clientName}>{estimate.clientName}</Text>
          {estimate.projectAddress && <Text style={styles.projectAddress}>{estimate.projectAddress}</Text>}
          <Text style={styles.total}>${estimate.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>

        {/* Client Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Client Details</Text>
          {estimate.clientEmail && <Row label="Email" value={estimate.clientEmail} />}
          {estimate.clientPhone && <Row label="Phone" value={estimate.clientPhone} />}
          {estimate.clientAddress && <Row label="Address" value={estimate.clientAddress} />}
          {estimate.project && <Row label="Project" value={estimate.project.name} last />}
        </View>

        {/* Line Items by Category */}
        {estimate.categories?.map((cat: any) => (
          <View key={cat.id} style={styles.categoryCard}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            {cat.lineItems?.map((item: any) => (
              <View key={item.id} style={[styles.lineItem, item.excluded && styles.lineItemExcluded]}>
                <View style={styles.lineItemLeft}>
                  <Text style={[styles.lineItemDesc, item.excluded && styles.lineItemDescExcluded]}>
                    {item.excluded ? "⊘ " : ""}{item.description}
                  </Text>
                  <Text style={styles.lineItemDetail}>
                    {item.quantity} {item.unit} × ${item.unitPrice.toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.lineItemTotal, item.excluded && styles.lineItemTotalExcluded]}>
                  {item.excluded ? "Excl." : `$${item.total.toLocaleString()}`}
                </Text>
              </View>
            ))}
            <View style={styles.catTotal}>
              <Text style={styles.catTotalLabel}>Category Total</Text>
              <Text style={styles.catTotalValue}>
                ${cat.lineItems?.filter((i: any) => !i.excluded).reduce((sum: number, i: any) => sum + i.total, 0).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}

        {/* Excluded items */}
        {estimate.excludedItems && (
          <View style={styles.excludedCard}>
            <Text style={styles.cardTitle}>Materials Excluded (Owner Provided)</Text>
            <Text style={styles.excludedText}>{estimate.excludedItems}</Text>
          </View>
        )}

        {/* Notes */}
        {estimate.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{estimate.notes}</Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Estimate Total</Text>
          <Text style={styles.totalValue}>${estimate.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>

        {/* Payment Schedule */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Payment Schedule</Text>
            <TouchableOpacity style={styles.generateBtn} onPress={() => setShowScheduleModal(true)}>
              <Text style={styles.generateBtnText}>{schedule ? "Regenerate" : "Generate"}</Text>
            </TouchableOpacity>
          </View>

          {schedule ? (
            schedule.payments?.map((payment: any) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <Text style={styles.paymentNumber}>Payment {payment.number}</Text>
                  <Text style={styles.paymentDesc}>{payment.description}</Text>
                  {payment.dueDate && (
                    <Text style={styles.paymentDate}>
                      Due: {new Date(payment.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  )}
                </View>
                <Text style={styles.paymentAmount}>${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
              </View>
            ))
          ) : (
            <View style={styles.noSchedule}>
              <Text style={styles.noScheduleText}>No payment schedule yet. Tap Generate to create one based on project duration.</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
         <TouchableOpacity style={styles.sendBtn} onPress={() => { setSendTo(estimate.clientEmail || ""); setShowSendModal(true) }}>
            <Text style={styles.sendBtnText}>Email to Client</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.pdfBtn} 
            onPress={() => Linking.openURL(`https://buildtrackpro.app/estimates/${estimateId}`)}
          >
            <Text style={styles.pdfBtnText}>View / Print PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={deleteEstimate}>
            <Text style={styles.deleteBtnText}>Delete Estimate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Status Modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Status</Text>
            {["DRAFT", "SENT", "APPROVED", "DECLINED"].map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOption, estimate.status === s && { backgroundColor: STATUS_COLORS[s] + "20", borderColor: STATUS_COLORS[s] }]}
                onPress={() => updateStatus(s)}
              >
                <Text style={[styles.statusOptionText, estimate.status === s && { color: STATUS_COLORS[s] }]}>{s}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStatusModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Schedule Modal */}
      <Modal visible={showScheduleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Generate Payment Schedule</Text>
            <Text style={styles.modalSub}>Based on your standard payment structure: $1,000 deposit + equal bi-weekly payments</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Project Duration (weeks)</Text>
              <TextInput
                style={styles.input}
                value={projectWeeks}
                onChangeText={setProjectWeeks}
                keyboardType="number-pad"
                placeholder="12"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Start Date (optional)</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {projectWeeks && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewText}>• $1,000 deposit</Text>
                <Text style={styles.previewText}>• {Math.ceil(parseInt(projectWeeks) / 2) - 1} progress payments of ~${Math.round((estimate.total - 1000) / Math.ceil(parseInt(projectWeeks) / 2)).toLocaleString()}</Text>
                <Text style={styles.previewText}>• Split final payment</Text>
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowScheduleModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={generateSchedule} disabled={generatingSchedule}>
                {generatingSchedule ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Generate</Text>}
              </TouchableOpacity>
            </View>
          </View>
          <Modal visible={showSendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Email Estimate</Text>
            <Text style={styles.modalSub}>Send {estimate?.estimateNumber} to client</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>To *</Text>
              <TextInput
                style={styles.input}
                value={sendTo}
                onChangeText={setSendTo}
                placeholder="client@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Message (optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={sendMessage}
                onChangeText={setSendMessage}
                placeholder="Please review the attached estimate..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSendModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={sendEstimate} disabled={sending}>
                {sending ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Send Email</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        </View>
      </Modal>
    </View>
  )
}

function Row({ label, value, last }: { label: string, value: string, last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#6B7280" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 16, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  estimateNumber: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusText: { fontSize: 12, fontWeight: "700" },
  clientName: { fontSize: 22, fontWeight: "700", color: "white", marginBottom: 4 },
  projectAddress: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 },
  total: { fontSize: 28, fontWeight: "700", color: "#F97316" },
  infoCard: { backgroundColor: "white", borderRadius: 14, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden" },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, padding: 14, paddingBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 13, color: "#6B7280" },
  rowValue: { fontSize: 13, fontWeight: "600", color: "#1A1A1A", maxWidth: "60%", textAlign: "right" },
  categoryCard: { backgroundColor: "white", borderRadius: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden" },
  categoryName: { fontSize: 13, fontWeight: "700", color: "#1A1A1A", padding: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", textTransform: "uppercase", letterSpacing: 0.3 },
  lineItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  lineItemExcluded: { opacity: 0.5 },
  lineItemLeft: { flex: 1, marginRight: 8 },
  lineItemDesc: { fontSize: 13, color: "#1A1A1A", marginBottom: 2 },
  lineItemDescExcluded: { textDecorationLine: "line-through" },
  lineItemDetail: { fontSize: 11, color: "#9CA3AF" },
  lineItemTotal: { fontSize: 13, fontWeight: "700", color: "#1A1A1A" },
  lineItemTotalExcluded: { color: "#9CA3AF", fontStyle: "italic" },
  catTotal: { flexDirection: "row", justifyContent: "space-between", padding: 14, backgroundColor: "#F9FAFB" },
  catTotalLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  catTotalValue: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  excludedCard: { backgroundColor: "white", borderRadius: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden" },
  excludedText: { fontSize: 13, color: "#6B7280", padding: 14, paddingTop: 0, lineHeight: 20 },
  notesCard: { backgroundColor: "white", borderRadius: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden" },
  notesText: { fontSize: 13, color: "#374151", padding: 14, paddingTop: 0, lineHeight: 20 },
  totalCard: { backgroundColor: "#1C1F26", borderRadius: 14, marginHorizontal: 16, marginBottom: 16, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  totalValue: { fontSize: 24, fontWeight: "700", color: "white" },
  scheduleSection: { marginHorizontal: 16, marginBottom: 16 },
  scheduleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  scheduleTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  generateBtn: { backgroundColor: "#F97316", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  generateBtnText: { color: "white", fontSize: 12, fontWeight: "700" },
  paymentRow: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  paymentLeft: { flex: 1 },
  paymentNumber: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 2 },
  paymentDesc: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", marginBottom: 2 },
  paymentDate: { fontSize: 11, color: "#9CA3AF" },
  paymentAmount: { fontSize: 16, fontWeight: "700", color: "#F97316" },
  noSchedule: { backgroundColor: "white", borderRadius: 12, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  noScheduleText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  actions: { paddingHorizontal: 16, marginBottom: 20 },
  deleteBtn: { backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#FECACA" },
  deleteBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", marginBottom: 8 },
  modalSub: { fontSize: 13, color: "#9CA3AF", marginBottom: 20, lineHeight: 20 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  previewBox: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#E8E6E1" },
  previewTitle: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 8 },
  previewText: { fontSize: 13, color: "#374151", marginBottom: 4 },
  statusOption: { padding: 14, borderRadius: 10, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E8E6E1", marginBottom: 8 },
  statusOptionText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  pdfBtn: { backgroundColor: "#1C1F26", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 10 },
  pdfBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  sendBtn: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 10 },
  sendBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
})