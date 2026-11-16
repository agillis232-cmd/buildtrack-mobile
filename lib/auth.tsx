import { createContext, useContext, useState, useEffect } from "react"
import * as SecureStore from "expo-secure-store"
import type { Href } from "expo-router"
import { API_URL } from "./api"
import * as Notifications from "expo-notifications"

interface User {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string, onSuccess?: (role: string) => void) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => null,
  signOut: async () => {},
})

/** The first screen for each kind of user. */
export function homeRouteFor(role?: string | null): Href {
  if (role === "CLIENT") return "/(client-tabs)" as Href
  if (role === "SUBCONTRACTOR") return "/(sub-tabs)" as Href
  return "/(tabs)" as Href
}

async function savePushToken(authToken: string) {
  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== "granted") return
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "65041af5-d938-4922-96e8-734b54a9ed8e"
    })
    await fetch(`${API_URL}/api/mobile/profile/push-token`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pushToken: pushTokenData.data })
    })
  } catch (e) {
    console.log("Error saving push token:", e)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function clearSession() {
    await SecureStore.deleteItemAsync("auth_token")
    await SecureStore.deleteItemAsync("auth_user")
    setUser(null)
    setToken(null)
  }

  // Restore the saved sign-in so the app opens where the person left off.
  async function checkSession() {
    let savedToken: string | null = null
    try {
      savedToken = await SecureStore.getItemAsync("auth_token")
      const savedUser = await SecureStore.getItemAsync("auth_user")
      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      } else {
        savedToken = null
      }
    } catch (e) {
      console.log("Session check error:", e)
      savedToken = null
    }
    setLoading(false)

    // Sign-ins last 30 days. If the server no longer accepts this one, go back to the
    // login screen instead of showing empty screens. Being offline is not a reason to sign out.
    if (savedToken) {
      try {
        const res = await fetch(`${API_URL}/api/mobile/organization`, {
          headers: { "Authorization": `Bearer ${savedToken}` }
        })
        if (res.status === 401) await clearSession()
      } catch (e) {
        // no connection: keep the saved session
      }
    }
  }

  async function signIn(email: string, password: string, onSuccess?: (role: string) => void): Promise<string | null> {
    try {
      const res = await fetch(`${API_URL}/api/mobile/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) return data.error || "Login failed"
      await SecureStore.setItemAsync("auth_token", data.token)
      await SecureStore.setItemAsync("auth_user", JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      savePushToken(data.token)
      if (onSuccess) onSuccess(data.user.role)
      return null
    } catch (e) {
      console.log("Sign-in error:", e)
      return "Connection error \u2014 check your internet"
    }
  }

  async function signOut() {
    await clearSession()
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
