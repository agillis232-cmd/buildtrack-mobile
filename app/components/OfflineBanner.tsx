import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, Animated } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { TAB_BAR_HEIGHT, tabBarBottom } from "@/lib/theme"
import { isOnline, onNetworkChange, getQueueCount, syncQueue } from "../../lib/offline"

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    isOnline().then(setOnline)
    getQueueCount().then(setQueueCount)

    const unsub = onNetworkChange(async (isOn) => {
      setOnline(isOn)
      if (isOn) {
        const count = await getQueueCount()
        setQueueCount(count)
        if (count > 0) handleSync()
      }
    })

    const interval = setInterval(async () => {
      const count = await getQueueCount()
      setQueueCount(count)
    }, 5000)

    return () => { unsub(); clearInterval(interval) }
  }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    const result = await syncQueue()
    setSyncing(false)
    const count = await getQueueCount()
    setQueueCount(count)
    if (result.synced > 0) {
      setSyncResult(`${result.synced} item${result.synced > 1 ? "s" : ""} synced`)
      setTimeout(() => setSyncResult(null), 3000)
    }
    if (result.failed > 0) {
      setSyncResult(`${result.failed} item${result.failed > 1 ? "s" : ""} failed to sync`)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  if (online && queueCount === 0 && !syncResult) return null

  return (
    // Floats just above the tab bar, so it never pushes the page down or hides under the status bar.
    <View style={{
      position: "absolute", left: 16, right: 16,
      bottom: tabBarBottom(insets.bottom) + TAB_BAR_HEIGHT + 10,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
      shadowColor: "#1C1F26", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
      backgroundColor: !online ? "#DC2626" : syncing ? "#D97706" : syncResult ? "#16A34A" : "#D97706",
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons
          name={!online ? "cloud-offline-outline" : syncing ? "sync-outline" : "cloud-done-outline"}
          size={16}
          color="white"
        />
        <Text style={{ color: "white", fontSize: 13, fontWeight: "600" }}>
          {!online
            ? `Offline${queueCount > 0 ? ` · ${queueCount} pending` : ""}`
            : syncing
            ? "Syncing..."
            : syncResult
            ? syncResult
            : `${queueCount} item${queueCount > 1 ? "s" : ""} waiting to sync`
          }
        </Text>
      </View>
      {online && queueCount > 0 && !syncing && (
        <TouchableOpacity onPress={handleSync}>
          <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>Sync now</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}