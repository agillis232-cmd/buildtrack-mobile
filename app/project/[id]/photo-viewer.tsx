import { useLocalSearchParams, useRouter } from "expo-router"
import {
  View, Text, StyleSheet, ScrollView, FlatList, Pressable, Animated, Alert, Share, Platform,
  ActivityIndicator, useWindowDimensions, GestureResponderEvent, NativeSyntheticEvent, NativeScrollEvent,
} from "react-native"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Image } from "expo-image"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as FileSystem from "expo-file-system/legacy"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"
import { cloudinaryScreen, cloudinaryOriginal } from "@/lib/images"
import { currentGallery, GalleryPhoto } from "@/lib/photoGallery"
import { showMenu } from "@/lib/menu"

// How far (points) a photo has to be pulled down before letting go closes the viewer.
const DISMISS_DISTANCE = 80
const DOUBLE_TAP_MS = 260

// Full-screen photo viewer, modelled on the iPhone Photos app:
// pinch or double-tap to zoom, swipe sideways between photos, pull down to close,
// tap once to hide or show the controls.
export default function PhotoViewerScreen() {
  const params = useLocalSearchParams<{ id: string; photoId: string; url?: string; caption?: string }>()
  const projectId = String(params.id)
  const router = useRouter()
  const { token, user } = useAuth()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  // Same rule as the server: clients and subcontractors can view and share, not edit or delete.
  const canEdit = !!user && user.role !== "CLIENT" && user.role !== "SUBCONTRACTOR"

  const gallery = useMemo(() => currentGallery(projectId), [projectId])
  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => {
    if (gallery?.photos.length) return gallery.photos
    return params.url ? [{ id: String(params.photoId), url: String(params.url), caption: params.caption || null }] : []
  })
  const startIndex = Math.max(0, photos.findIndex(p => p.id === params.photoId))
  const [index, setIndex] = useState(startIndex)
  const [zoomed, setZoomed] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [busy, setBusy] = useState<null | "share" | "save" | "delete" | "send">(null)
  const listRef = useRef<FlatList<GalleryPhoto>>(null)

  // Pull-down distance (negative = pulled down) drives the background and controls fading out.
  const drag = useRef(new Animated.Value(0)).current
  const chrome = useRef(new Animated.Value(1)).current
  const backdropOpacity = drag.interpolate({ inputRange: [-260, 0], outputRange: [0.2, 1], extrapolate: "clamp" })
  const chromeOpacity = Animated.multiply(chrome, drag.interpolate({ inputRange: [-60, 0], outputRange: [0, 1], extrapolate: "clamp" }))

  const photo = photos[index]

  useEffect(() => {
    Animated.timing(chrome, { toValue: chromeVisible ? 1 : 0, duration: 180, useNativeDriver: true }).start()
  }, [chromeVisible])

  // Load the photos either side so swiping shows them straight away.
  useEffect(() => {
    const neighbours = [photos[index - 1], photos[index + 1]].filter(Boolean).map(p => cloudinaryScreen(p!.url))
    if (neighbours.length) Image.prefetch(neighbours).catch(() => {})
  }, [index, photos])

  const close = useCallback(() => router.back(), [router])

  async function downloadOriginal(p: GalleryPhoto): Promise<string> {
    const target = `${FileSystem.cacheDirectory}buildtrack-photo-${p.id}.jpg`
    const info = await FileSystem.getInfoAsync(target)
    if (info.exists) return target
    const result = await FileSystem.downloadAsync(cloudinaryOriginal(p.url), target)
    if (result.status !== 200) throw new Error(`download failed (${result.status})`)
    return result.uri
  }

  // The standard share sheet: Save to Photos, Messages, AirDrop, Mail, etc.
  async function sharePhoto() {
    if (!photo || busy) return
    setBusy("share")
    try {
      if (Platform.OS === "ios") {
        const uri = await downloadOriginal(photo)
        await Share.share({ url: uri })
      } else {
        await Share.share({ message: cloudinaryOriginal(photo.url) })
      }
    } catch (e) {
      Alert.alert("Couldn't share photo", "Check your connection and try again.")
    }
    setBusy(null)
  }

  async function saveCaption(p: GalleryPhoto, caption: string) {
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${projectId}/photos/${p.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.photo) throw new Error("save failed")
      setPhotos(list => list.map(item => (item.id === p.id ? { ...item, caption } : item)))
      gallery?.onCaptionChanged?.(p.id, caption)
    } catch (e) {
      Alert.alert("Couldn't save note", "Check your connection and try again.")
    }
  }

  function editCaption() {
    if (!photo) return
    const p = photo
    if (Platform.OS !== "ios") {
      Alert.alert("Edit note", "Notes can be edited on iPhone or on the website.")
      return
    }
    Alert.prompt(
      p.caption ? "Edit note" : "Add a note",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: (text?: string) => saveCaption(p, (text ?? "").trim()) },
      ],
      "plain-text",
      p.caption || "",
    )
  }

  async function sendToMessages() {
    if (!photo || busy) return
    setBusy("send")
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${projectId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: photo.caption ? `Photo: ${photo.caption}\n${photo.url}` : `Photo\n${photo.url}` }),
      })
      if (!res.ok) throw new Error("send failed")
      Alert.alert("Sent", "The photo was posted to the project messages.", [
        { text: "View messages", onPress: () => router.replace(`/project/${projectId}/messages` as any) },
        { text: "OK", style: "cancel" },
      ])
    } catch (e) {
      Alert.alert("Couldn't send photo", "Check your connection and try again.")
    }
    setBusy(null)
  }

  function confirmDelete() {
    if (!photo) return
    const p = photo
    Alert.alert("Delete this photo?", "It will be removed from the project for everyone. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePhoto(p) },
    ])
  }

  async function deletePhoto(p: GalleryPhoto) {
    setBusy("delete")
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${projectId}/photos/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("delete failed")
      gallery?.onDeleted?.(p.id)
      const remaining = photos.filter(item => item.id !== p.id)
      if (remaining.length === 0) {
        setBusy(null)
        close()
        return
      }
      const nextIndex = Math.min(index, remaining.length - 1)
      setPhotos(remaining)
      setIndex(nextIndex)
      requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: nextIndex, animated: false }))
    } catch (e) {
      Alert.alert("Couldn't delete photo", "Check your connection and try again.")
    }
    setBusy(null)
  }

  function openMenu() {
    if (!photo) return
    showMenu(undefined, [
      { label: photo.caption ? "Edit note" : "Add a note", onPress: editCaption },
      { label: "Send to project messages", onPress: sendToMessages },
      { label: "Delete photo", onPress: confirmDelete, destructive: true },
    ])
  }

  function onPageSettled(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    if (next !== index && next >= 0 && next < photos.length) setIndex(next)
  }

  if (!photo) {
    return (
      <View style={[styles.fill, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.emptyText}>This photo isn't available.</Text>
        <Pressable onPress={close} style={styles.emptyButton} accessibilityRole="button">
          <Text style={styles.emptyButtonText}>Close</Text>
        </Pressable>
      </View>
    )
  }

  const takenOn = photo.uploadedAt ? new Date(photo.uploadedAt) : null
  const dateLabel = takenOn && !isNaN(takenOn.getTime())
    ? takenOn.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null

  return (
    <View style={styles.fill}>
      <StatusBar style="light" hidden={!chromeVisible} animated />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]} />

      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={p => p.id}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onMomentumScrollEnd={onPageSettled}
        extraData={photo.id}
        renderItem={({ item }) => (
          <ZoomablePhoto
            photo={item}
            width={width}
            height={height}
            active={item.id === photo.id}
            onSingleTap={() => setChromeVisible(v => !v)}
            onZoomChange={z => { if (item.id === photo.id) setZoomed(z) }}
            onPull={y => drag.setValue(y)}
            onPullRelease={close}
          />
        )}
      />

      {/* Top bar */}
      <Animated.View
        pointerEvents={chromeVisible ? "box-none" : "none"}
        style={[styles.topBar, { paddingTop: insets.top + 6, opacity: chromeOpacity }]}
      >
        <RoundButton icon="close" label="Close" onPress={close} />
        <View style={styles.titleBlock} pointerEvents="none">
          {photos.length > 1 && <Text style={styles.title}>{index + 1} of {photos.length}</Text>}
          {dateLabel && <Text style={styles.subtitle}>{dateLabel}</Text>}
        </View>
        <View style={styles.topActions}>
          <RoundButton icon="share-outline" label="Share" onPress={sharePhoto} loading={busy === "share"} />
          {canEdit && <RoundButton icon="ellipsis-horizontal" label="More" onPress={openMenu} loading={busy === "delete" || busy === "send"} />}
        </View>
      </Animated.View>

      {/* Note */}
      {(photo.caption || canEdit) ? (
        <Animated.View
          pointerEvents={chromeVisible ? "box-none" : "none"}
          style={[styles.bottomBar, { paddingBottom: insets.bottom + 14, opacity: chromeOpacity }]}
        >
          <Pressable
            onPress={canEdit ? editCaption : undefined}
            disabled={!canEdit}
            accessibilityRole={canEdit ? "button" : "text"}
            accessibilityLabel={canEdit ? (photo.caption ? `Note: ${photo.caption}. Double-tap to edit.` : "Add a note") : photo.caption || undefined}
          >
            {photo.caption
              ? <Text style={styles.caption} numberOfLines={4}>{photo.caption}</Text>
              : <Text style={styles.addCaption}>Add a note</Text>}
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  )
}

function RoundButton({ icon, label, onPress, loading }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; loading?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.roundButton, pressed && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator color="white" size="small" /> : <Ionicons name={icon} size={20} color="white" />}
    </Pressable>
  )
}

// One page of the viewer. On iPhone it uses the system's own zooming scroll view
// (the same mechanism the Photos app is built on), so pinch, pan and bounce feel native.
function ZoomablePhoto({ photo, width, height, active, onSingleTap, onZoomChange, onPull, onPullRelease }: {
  photo: GalleryPhoto
  width: number
  height: number
  active: boolean
  onSingleTap: () => void
  onZoomChange: (zoomed: boolean) => void
  onPull: (y: number) => void
  onPullRelease: () => void
}) {
  const scrollRef = useRef<ScrollView>(null)
  const zoomedRef = useRef(false)
  const [zoomedState, setZoomedState] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const lastTap = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (tapTimer.current) clearTimeout(tapTimer.current) }, [])

  // Swiping away from a zoomed photo and back shows it at normal size again.
  useEffect(() => {
    if (!active && zoomedRef.current) {
      scrollRef.current?.scrollResponderZoomTo({ x: 0, y: 0, width, height, animated: false })
    }
  }, [active])

  function setZoomed(z: boolean) {
    if (z === zoomedRef.current) return
    zoomedRef.current = z
    setZoomedState(z)
    onZoomChange(z)
  }

  function onPress(e: GestureResponderEvent) {
    const now = Date.now()
    const { locationX, locationY } = e.nativeEvent
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      // Double tap: zoom in on that spot, or back out.
      lastTap.current = 0
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null }
      if (Platform.OS !== "ios") return
      if (zoomedRef.current) {
        scrollRef.current?.scrollResponderZoomTo({ x: 0, y: 0, width, height, animated: true })
      } else {
        const w = width / 2.5
        const h = height / 2.5
        scrollRef.current?.scrollResponderZoomTo({ x: locationX - w / 2, y: locationY - h / 2, width: w, height: h, animated: true })
      }
      return
    }
    lastTap.current = now
    tapTimer.current = setTimeout(() => { tapTimer.current = null; onSingleTap() }, DOUBLE_TAP_MS)
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { zoomScale, contentOffset } = e.nativeEvent
    const z = (zoomScale ?? 1) > 1.01
    setZoomed(z)
    if (!z && active) onPull(Math.min(0, contentOffset.y))
  }

  function onScrollEndDrag(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (zoomedRef.current || !active) return
    if (e.nativeEvent.contentOffset.y < -DISMISS_DISTANCE) onPullRelease()
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={{ width, height }}
      contentContainerStyle={{ width, height }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      bouncesZoom
      centerContent
      alwaysBounceVertical={!zoomedState}
      directionalLockEnabled={!zoomedState}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
      onScrollEndDrag={onScrollEndDrag}
    >
      <Pressable onPress={onPress} style={{ width, height }} accessible accessibilityLabel={photo.caption ? `Photo: ${photo.caption}` : "Photo"}>
        {!loaded && <ActivityIndicator color="rgba(255,255,255,0.7)" style={StyleSheet.absoluteFill} />}
        <Image
          source={{ uri: cloudinaryScreen(photo.url) }}
          style={{ width, height }}
          contentFit="contain"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={photo.id}
          onLoad={() => setLoaded(true)}
        />
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", backgroundColor: "black", gap: 16 },
  backdrop: { backgroundColor: "black" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  titleBlock: { flex: 1, alignItems: "center" },
  title: { color: "white", fontSize: 16, fontWeight: "600" },
  subtitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 1 },
  topActions: { flexDirection: "row", gap: 10 },
  roundButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(40,40,40,0.72)", alignItems: "center", justifyContent: "center" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, backgroundColor: "rgba(0,0,0,0.55)" },
  caption: { color: "white", fontSize: 16, lineHeight: 22 },
  addCaption: { color: "rgba(255,255,255,0.7)", fontSize: 16 },
  emptyText: { color: "white", fontSize: 17 },
  emptyButton: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 12, paddingHorizontal: 22, height: 44, justifyContent: "center" },
  emptyButtonText: { color: "white", fontSize: 17, fontWeight: "600" },
})
