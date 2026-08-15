import AsyncStorage from "@react-native-async-storage/async-storage"
import NetInfo from "@react-native-community/netinfo"
import * as SecureStore from "expo-secure-store"

const API = "https://buildtrackpro.app"
const QUEUE_KEY = "offline_queue"
const CACHE_PREFIX = "cache_"

// ============ NETWORK STATUS ============

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return state.isConnected === true
}

export function onNetworkChange(callback: (online: boolean) => void) {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected === true)
  })
}

// ============ OFFLINE QUEUE ============

export type QueuedAction = {
  id: string
  url: string
  method: string
  body?: any
  hasFile?: boolean
  fileUri?: string
  fileName?: string
  timestamp: number
  description: string
}

export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export async function addToQueue(action: Omit<QueuedAction, "id" | "timestamp">): Promise<void> {
  const queue = await getQueue()
  queue.push({
    ...action,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  })
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue()
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(q => q.id !== id)))
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue()
  return queue.length
}

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  const token = await SecureStore.getItemAsync("auth_token")
  if (!token) return { synced: 0, failed: queue.length }

  let synced = 0
  let failed = 0

  for (const action of queue) {
    try {
      const headers: any = { "Authorization": `Bearer ${token}` }
      let fetchOptions: any = { method: action.method, headers }

      if (action.hasFile && action.fileUri) {
        const fd = new FormData()
        fd.append("photo", {
          uri: action.fileUri,
          name: action.fileName || "photo.jpg",
          type: "image/jpeg",
        } as any)
        if (action.body) {
          Object.entries(action.body).forEach(([key, val]) => {
            fd.append(key, val as string)
          })
        }
        fetchOptions.body = fd
      } else if (action.body) {
        headers["Content-Type"] = "application/json"
        fetchOptions.body = JSON.stringify(action.body)
      }

      const res = await fetch(`${API}${action.url}`, fetchOptions)
      if (res.ok) {
        await removeFromQueue(action.id)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { synced, failed }
}

// ============ DATA CACHE ============

export async function cacheData(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      cachedAt: Date.now(),
    }))
  } catch (e) { console.log("Cache write failed:", e) }
}

export async function getCachedData(key: string, maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { data, cachedAt } = JSON.parse(raw)
    if (Date.now() - cachedAt > maxAgeMs) return null
    return data
  } catch { return null }
}

export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys()
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX))
  await AsyncStorage.multiRemove(cacheKeys)
}

// ============ SMART FETCH ============
// Tries network first, falls back to cache. Queues writes when offline.

export async function smartFetch(
  url: string,
  options?: { method?: string; body?: any; cacheKey?: string; description?: string; fileUri?: string; fileName?: string }
): Promise<{ data: any; fromCache: boolean; queued: boolean }> {
  const method = options?.method || "GET"
  const token = await SecureStore.getItemAsync("auth_token")
  const online = await isOnline()

  // GET requests: try network, fall back to cache
  if (method === "GET") {
    if (online) {
      try {
        const res = await fetch(`${API}${url}`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
        const data = await res.json()
        // Cache successful responses
        if (options?.cacheKey) {
          await cacheData(options.cacheKey, data)
        }
        return { data, fromCache: false, queued: false }
      } catch {
        // Network failed, try cache
        if (options?.cacheKey) {
          const cached = await getCachedData(options.cacheKey)
          if (cached) return { data: cached, fromCache: true, queued: false }
        }
        throw new Error("No connection and no cached data")
      }
    } else {
      // Offline: use cache
      if (options?.cacheKey) {
        const cached = await getCachedData(options.cacheKey)
        if (cached) return { data: cached, fromCache: true, queued: false }
      }
      throw new Error("Offline — no cached data available")
    }
  }

  // Write requests (POST, PATCH, DELETE): try network, queue if offline
  if (online) {
    try {
      const headers: any = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      }
      const res = await fetch(`${API}${url}`, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      })
      const data = await res.json()
      return { data, fromCache: false, queued: false }
    } catch {
      // Network failed, queue it
      await addToQueue({
        url, method,
        body: options?.body,
        hasFile: !!options?.fileUri,
        fileUri: options?.fileUri,
        fileName: options?.fileName,
        description: options?.description || `${method} ${url}`,
      })
      return { data: null, fromCache: false, queued: true }
    }
  } else {
    // Offline: queue write
    await addToQueue({
      url, method,
      body: options?.body,
      hasFile: !!options?.fileUri,
      fileUri: options?.fileUri,
      fileName: options?.fileName,
      description: options?.description || `${method} ${url}`,
    })
    return { data: null, fromCache: false, queued: true }
  }
}