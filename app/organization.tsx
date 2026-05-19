import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from "react-native"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"
import * as ImagePicker from "expo-image-picker"

export default function OrganizationScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editing, setEditing] = useState(false)

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zip, setZip] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [insuranceInfo, setInsuranceInfo] = useState("")

  useEffect(() => {
    if (token) loadOrg()
  }, [token])

  async function loadOrg() {
    try {
      const res = await fetch(`${API_URL}/api/mobile/organization`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.organization) {
        setOrg(data.organization)
        setName(data.organization.name || "")
        setAddress(data.organization.address || "")
        setCity(data.organization.city || "")
        setState(data.organization.state || "")
        setZip(data.organization.zip || "")
        setPhone(data.organization.phone || "")
        setEmail(data.organization.email || "")
        setWebsite(data.organization.website || "")
        setLicenseNumber(data.organization.licenseNumber || "")
        setInsuranceInfo(data.organization.insuranceInfo || "")
      }
    } catch (e) {
      console.log("Error loading org:", e)
    }
    setLoading(false)
  }

  async function saveOrg() {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/organization`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, city, state, zip, phone, email, website, licenseNumber, insuranceInfo })
      })
      const data = await res.json()
      if (data.organization) {
        setOrg(data.organization)
        setEditing(false)
        Alert.alert("Saved!", "Company profile updated")
      } else {
        Alert.alert("Error", "Could not save")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function uploadLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true, quality: 0.8, allowsEditing: true, aspect: [1, 1]
    })
    if (result.canceled) return

    setUploadingLogo(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/organization/logo`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: result.assets[0].base64 })
      })
      const data = await res.json()
      if (data.logoUrl) {
        setOrg((prev: any) => ({ ...prev, logo: data.logoUrl }))
        Alert.alert("Success!", "Logo updated")
      } else {
        Alert.alert("Error", "Could not upload logo")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setUploadingLogo(false)
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#F97316" /></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBanner}>
        <View style={styles.headerCircle} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Company Profile</Text>
        <Text style={styles.subtitle}>Used on estimates, invoices and reports</Text>
      </View>

      {/* Logo */}
      <View style={styles.logoCard}>
        <TouchableOpacity onPress={uploadLogo} disabled={uploadingLogo} style={styles.logoWrapper}>
          {org?.logo ? (
            <Image source={{ uri: org.logo }} style={styles.logoImage} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>TAP TO ADD LOGO</Text>
            </View>
          )}
          {uploadingLogo && (
            <View style={styles.logoOverlay}>
              <ActivityIndicator color="white" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.logoHint}>Tap to upload your company logo</Text>
      </View>

      {/* Details */}
      {!editing ? (
        <View style={styles.section}>
          <View style={styles.card}>
            <Row label="Company Name" value={org?.name || "-"} />
            <Row label="Address" value={org?.address ? `${org.address}, ${org.city}, ${org.state} ${org.zip}` : "-"} />
            <Row label="Phone" value={org?.phone || "-"} />
            <Row label="Email" value={org?.email || "-"} />
            <Row label="Website" value={org?.website || "-"} />
            <Row label="License #" value={org?.licenseNumber || "-"} />
            <Row label="Insurance" value={org?.insuranceInfo || "-"} last />
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit Company Info</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.formCard}>
            <Field label="Company Name" value={name} onChange={setName} placeholder="Watt House" />
            <Field label="Street Address" value={address} onChange={setAddress} placeholder="123 Main St" />
            <View style={styles.twoCol}>
              <View style={{ flex: 2 }}>
                <Field label="City" value={city} onChange={setCity} placeholder="San Jose" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="State" value={state} onChange={setState} placeholder="CA" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="ZIP" value={zip} onChange={setZip} placeholder="95101" />
              </View>
            </View>
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="(408) 555-0000" keyboardType="phone-pad" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="info@company.com" keyboardType="email-address" />
            <Field label="Website" value={website} onChange={setWebsite} placeholder="www.company.com" />
            <Field label="License Number" value={licenseNumber} onChange={setLicenseNumber} placeholder="CA License #" />
            <Field label="Insurance Info" value={insuranceInfo} onChange={setInsuranceInfo} placeholder="Policy number or carrier" />

            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveOrg} disabled={saving}>
                {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

function Row({ label, value, last }: { label: string, value: string, last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

function Field({ label, value, onChange, placeholder, keyboardType }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F4F0" },
  content: { paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBanner: { backgroundColor: "#1C1F26", padding: 20, paddingTop: 60, paddingBottom: 24, marginBottom: 20, position: "relative", overflow: "hidden" },
  headerCircle: { position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(249,115,22,0.08)" },
  backBtn: { marginBottom: 12 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  logoCard: { backgroundColor: "white", borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 16, alignItems: "center", borderWidth: 1, borderColor: "#E8E6E1" },
  logoWrapper: { position: "relative", marginBottom: 10 },
  logoImage: { width: 120, height: 120, borderRadius: 16, resizeMode: "contain" },
  logoPlaceholder: { width: 120, height: 120, borderRadius: 16, backgroundColor: "#F3F4F6", borderWidth: 2, borderColor: "#E8E6E1", borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
  logoPlaceholderText: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", textAlign: "center" },
  logoOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, justifyContent: "center", alignItems: "center" },
  logoHint: { fontSize: 12, color: "#9CA3AF" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  card: { backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E8E6E1", overflow: "hidden", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 14, color: "#6B7280", flex: 1 },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", maxWidth: "55%", textAlign: "right" },
  editBtn: { backgroundColor: "#1C1F26", borderRadius: 12, padding: 14, alignItems: "center" },
  editBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  formCard: { backgroundColor: "white", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#E8E6E1" },
  twoCol: { flexDirection: "row", gap: 8 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 12, fontSize: 15, color: "#1A1A1A", borderWidth: 1, borderColor: "#E8E6E1" },
  formBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 13, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 13, alignItems: "center" },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
})