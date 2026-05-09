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
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  sessionCookie: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => null,
  signOut: async () => {},
  sessionCookie: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionCookie, setSessionCookie] = useState<string | null>(null)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const cookie = await SecureStore.getItemAsync("session_cookie")
      if (!cookie) { setLoading(false); return }
      setSessionCookie(cookie)

      const res = await fetch(`${API_URL}/api/auth/session`, {
        headers: { Cookie: cookie }
      })
      const data = await res.json()
      if (data?.user) setUser(data.user)
    } catch (e) {
      console.log("Session check failed:", e)
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    try {
      // Get CSRF token first
      const csrfRes = await fetch(`${API_URL}/api/auth/csrf`)
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData.csrfToken

      // Sign in with credentials
      const res = await fetch(`${API_URL}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken,
          callbackUrl: `${API_URL}/dashboard`,
          json: "true"
        }),
        redirect: "manual"
      })

      // Extract session cookie
      const setCookie = res.headers.get("set-cookie")
      if (!setCookie) return "Invalid email or password"

      const sessionMatch = setCookie.match(/(next-auth\.session-token=[^;]+)/)
      if (!sessionMatch) return "Login failed"

      const cookie = sessionMatch[1]
      await SecureStore.setItemAsync("session_cookie", cookie)
      setSessionCookie(cookie)

      // Get user info
      const sessionRes = await fetch(`${API_URL}/api/auth/session`, {
        headers: { Cookie: cookie }
      })
      const sessionData = await sessionRes.json()

      if (sessionData?.user) {
        setUser(sessionData.user)
        return null
      }

      return "Login failed"
    } catch (e) {
      return "Connection error"
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync("session_cookie")
    setUser(null)
    setSessionCookie(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, sessionCookie }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}