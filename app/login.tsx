import { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
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
    console.log("Attempting login with:", email)  // ADD THIS
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password")
      return
    }
    setLoading(true)
    const error = await signIn(email, password)
    console.log("Sign in result:", error)  // ADD THIS
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>BT</Text>
        </View>
        <View>
          <Text style={styles.brandName}>BuildTrack</Text>
          <Text style={styles.brandSub}>WATT HOUSE BUILDERS</Text>
        </View>
      </View>

      {/* Hero text */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Manage your projects from the field</Text>
        <Text style={styles.heroSub}>Daily logs, change orders, expenses and more — right from your phone.</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputGroup}>
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

        <View style={styles.inputGroup}>
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
            <Text style={styles.buttonText}>Sign in →</Text>
          )}
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1F26",
    padding: 28,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 40,
  },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: "#F97316",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },
  brandName: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  brandSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  hero: {
    marginBottom: 36,
  },
  heroTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 10,
  },
  heroSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    lineHeight: 21,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 13,
    color: "white",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#F97316",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#6B7280",
    shadowOpacity: 0,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
})