import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "./api"
import { cacheData, getCachedData, clearCache } from "./offline"

// Show-then-refresh loading for the screens people open most.
//
// The first time a screen loads it waits for the network as before. After that, the last
// copy is shown immediately (also with no signal) while a fresh copy is fetched behind it.
// Copies are kept per signed-in person and wiped on sign-out.

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 20000

let cacheOwner = "anon"

/** Called by the auth provider so one person never sees another person's saved data. */
export function setCacheOwner(userId: string | null | undefined) {
  cacheOwner = userId || "anon"
}

export async function clearCachedData() {
  try { await clearCache() } catch (e) { console.log("Cache clear failed:", e) }
}

function keyFor(name: string) {
  return `${cacheOwner}:${name}`
}

/** fetch() that gives up instead of spinning forever on a bad connection. */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * GET `path` and hand the JSON to `apply`. If a saved copy exists, `apply` is called with it
 * first (instantly), then again with the fresh copy once it arrives.
 *
 * `cacheName` is only needed when the path changes on every call (for example a date range).
 * Resolves true when fresh data arrived, false when only the saved copy (or nothing) is shown.
 */
export async function loadCached(
  path: string,
  token: string | null,
  apply: (data: any, fromCache: boolean) => void,
  cacheName?: string
): Promise<boolean> {
  const key = keyFor(cacheName || path)
  let showedSaved = false

  const saved = await getCachedData(key, MAX_AGE_MS)
  if (saved) {
    apply(saved, true)
    showedSaved = true
  }

  try {
    const res = await fetchWithTimeout(`${API_URL}${path}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
    const data = await res.json()
    if (res.ok) {
      apply(data, false)
      cacheData(key, data)
      return true
    }
    if (res.status < 500) {
      // Signed out, removed from the project, or it no longer exists: don't keep showing the old copy.
      await AsyncStorage.removeItem("cache_" + key)
      apply(data, false)
    } else if (!showedSaved) {
      apply(data, false)
    }
    return false
  } catch (e) {
    // Offline or timed out: the saved copy (if any) stays on screen.
    if (!showedSaved) throw e
    return false
  }
}
