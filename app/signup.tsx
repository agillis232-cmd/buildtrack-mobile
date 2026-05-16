import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from "react-native"
import { useRouter } from "expo-router"
import { API_URL } from "@/lib/api"

const ROLES = [
  { key: "FIELD_WORKER", label: "Field Worker", sub: "Add logs, photos and expenses" },
  { key: "PROJECT_MANAGER", label: "Project Manager", sub: "Full access to manage projects" },
]

export default function SignupScreen() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("FIELD_WORKER")
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    if (!name || !email || !password) {
      Alert.alert("Error", "All fields are required")
      return
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      })
      const data = await res.json()
      if (res.ok) {
        Alert.alert(
          "Request Submitted!",
          "Your account is pending admin approval. You will be able to sign in once approved.",
          [{ text: "Back to Login", onPress: () => router.replace("/login") }]
        )
      } else {
        Alert.alert("Error", data.error || "Could not create account")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.decorCircle} />
        <View style={styles.decorCircle2} />

        <View style={styles.logoSection}>
          <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Request Access</Text>
        <Text style={styles.subtitle}>Submit your details and an admin will approve your account.</Text>

        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Smith" placeholderTextColor="#9CA3AF" autoCapitalize="words" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9CA3AF" autoCapitalize="none" keyboardType="email-address" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password *</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min 8 characters" placeholderTextColor="#9CA3AF" secureTextEntry />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" placeholderTextColor="#9CA3AF" secureTextEntry />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Your Role *</Text>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleCard, role === r.key && styles.roleCardSelected]}
                onPress={() => setRole(r.key)}
              >
                <View style={[styles.roleRadio, role === r.key && styles.roleRadioSelected]}>
                  {role === r.key && <View style={styles.roleRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, role === r.key && styles.roleLabelSelected]}>{r.label}</Text>
                  <Text style={styles.roleSub}>{r.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignup} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Submit Request</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1C1F26" },
  content: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  decorCircle: { position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(249,115,22,0.07)" },
  decorCircle2: { position: "absolute", top: 120, left: -100, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.04)" },
  logoSection: { alignItems: "center", marginBottom: 20 },
  logo: { width: 120, height: 120 },
  title: { fontSize: 26, fontWeight: "700", color: "white", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 22, marginBottom: 24 },
  formCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, color: "white", fontSize: 15 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 8 },
  roleCardSelected: { borderColor: "#F97316", backgroundColor: "rgba(249,115,22,0.1)" },
  roleRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  roleRadioSelected: { borderColor: "#F97316" },
  roleRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F97316" },
  roleLabel: { fontSize: 14, fontWeight: "700", color: "white", marginBottom: 2 },
  roleLabelSelected: { color: "#F97316" },
  roleSub: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  button: { backgroundColor: "#F97316", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { backgroundColor: "#6B7280" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  loginLink: { alignItems: "center", paddingVertical: 8 },
  loginLinkText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
})