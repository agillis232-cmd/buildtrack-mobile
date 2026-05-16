import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Image, ScrollView
} from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth"

export default function LoginScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password")
      return
    }
    setLoading(true)
    const error = await signIn(email, password)
    setLoading(false)
    if (error) {
      Alert.alert("Login failed", error)
    } else {
      router.replace("/(tabs)")
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header circle decoration */}
        <View style={styles.decorCircle} />
        <View style={styles.decorCircle2} />

        {/* Logo */}
        <View style={styles.logoSection}>
          <Image source={require("../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Hero text */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Manage your projects from the field</Text>
          <Text style={styles.heroSub}>Daily logs, change orders, expenses and more — right from your phone.</Text>
        </View>

        {/* Form card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign in</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign in to BuildTrack</Text>
            )}
          </TouchableOpacity>
        </View>
        

        <Text style={styles.footer}>Watt House Builders · BuildTrack Pro</Text>
         <TouchableOpacity onPress={() => router.push("/signup" as any)} style={styles.signupLink}>
          <Text style={styles.signupLinkText}>New team member? Request access →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1C1F26" },
  content: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  decorCircle: { position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(249,115,22,0.07)" },
  decorCircle2: { position: "absolute", top: 120, left: -100, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(249,115,22,0.04)" },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logo: { width: 180, height: 180 },
  hero: { marginBottom: 32 },
  heroTitle: { color: "white", fontSize: 26, fontWeight: "700", letterSpacing: -0.5, lineHeight: 34, marginBottom: 10 },
  heroSub: { color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 22 },
  formCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 24 },
  formTitle: { fontSize: 18, fontWeight: "700", color: "white", marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 14, color: "white", fontSize: 15 },
  button: { backgroundColor: "#F97316", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8, shadowColor: "#F97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { backgroundColor: "#6B7280", shadowOpacity: 0 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  footer: { textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", fontWeight: "500" },
  signupLink: { alignItems: "center", marginTop: 16 },
  signupLinkText: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
})