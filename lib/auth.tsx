import { createContext, useContext, useState, useEffect } from "react"
import * as SecureStore from "expo-secure-store"
import { API_URL } from "./api"

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
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

 async function checkSession() {
    try {
      const savedToken = await SecureStore.getItemAsync("auth_token")
      const savedUser = await SecureStore.getItemAsync("auth_user")
      console.log("Saved token:", savedToken)  // ADD THIS
      console.log("Saved user:", savedUser)     // ADD THIS
      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      }
    } catch (e) {
      console.log("SignIn catch error:", e)  // CHANGE THIS
      return "Connection error — check your internet"
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    console.log("signIn function called!")
    console.log("Fetching:", `${API_URL}/api/mobile/auth`)
    try {
      const res = await fetch(`${API_URL}/api/mobile/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      console.log("Fetch completed, status:", res.status)
      const data = await res.json()
      console.log("Data:", JSON.stringify(data))
      if (!res.ok) return data.error || "Login failed"
      await SecureStore.setItemAsync("auth_token", data.token)
      await SecureStore.setItemAsync("auth_user", JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      return null
    } catch (e) {
      console.log("FETCH ERROR:", JSON.stringify(e))
      return "Connection error — check your internet"
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync("auth_token")
    await SecureStore.deleteItemAsync("auth_user")
    setUser(null)
    setToken(null)
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
