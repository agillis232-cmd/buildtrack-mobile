import { useLocalSearchParams, useRouter } from "expo-router"
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, TextInput, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, InputAccessoryView } from "react-native"
import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { API_URL } from "@/lib/api"

const { width, height } = Dimensions.get("window")

export default function PhotoViewerScreen() {
  const { id, photoId, url, caption: initialCaption } = useLocalSearchParams()
  const { token } = useAuth()
  const router = useRouter()
  const [caption, setCaption] = useState(initialCaption as string || "")
  const [editingCaption, setEditingCaption] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function saveCaption() {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ caption })
      })
      const data = await res.json()
      if (data.photo) {
        setEditingCaption(false)
      } else {
        Alert.alert("Error", "Could not save note")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSaving(false)
  }

  async function deletePhoto() {
    Alert.alert("Delete Photo", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true)
          try {
            const res = await fetch(`${API_URL}/api/mobile/projects/${id}/photos/${photoId}`, {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
              router.back()
            } else {
              Alert.alert("Error", "Could not delete photo")
            }
          } catch (e) {
            Alert.alert("Error", "Connection error")
          }
          setDeleting(false)
        }
      }
    ])
  }

  async function shareToMessages() {
    setSharing(true)
    try {
      const res = await fetch(`${API_URL}/api/mobile/projects/${id}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          body: caption ? `Photo: ${caption}\n${url}` : `Photo\n${url}`
        })
      })
      if (res.ok) {
        Alert.alert("Shared!", "Photo link sent to project messages.", [
          { text: "View Messages", onPress: () => router.push(`/project/${id}/messages` as any) },
          { text: "Stay Here" }
        ])
      } else {
        Alert.alert("Error", "Could not share photo")
      }
    } catch (e) {
      Alert.alert("Error", "Connection error")
    }
    setSharing(false)
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deletePhoto} disabled={deleting} style={styles.deleteBtn}>
          {deleting
            ? <ActivityIndicator color="#DC2626" size="small" />
            : <Text style={styles.deleteText}>Delete</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Full size image */}
      <Image
        source={{ uri: (url as string).replace('/upload/', '/upload/f_jpg/') }}
        style={styles.image}
        resizeMode="contain"
      />

      {/* Bottom panel */}
      <ScrollView style={styles.bottomPanel} keyboardShouldPersistTaps="handled">

        {/* Note section */}
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Note</Text>
          {editingCaption ? (
            <View>
              <TextInput
                style={styles.noteInput}
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a note about this photo..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                multiline
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={saveCaption}
                inputAccessoryViewID="caption-accessory"
              />
              {Platform.OS === "ios" && (
                <InputAccessoryView nativeID="caption-accessory">
                  <View style={styles.accessoryBar}>
                    <TouchableOpacity onPress={() => setEditingCaption(false)} style={styles.accessoryCancel}>
                      <Text style={styles.accessoryCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveCaption} style={styles.accessoryDone} disabled={saving}>
                      {saving
                        ? <ActivityIndicator color="white" size="small" />
                        : <Text style={styles.accessoryDoneText}>Save Note</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </InputAccessoryView>
              )}
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingCaption(true)} style={styles.noteRow}>
              <Text style={[styles.noteText, !caption && styles.notePlaceholder]}>
                {caption || "Tap to add a note..."}
              </Text>
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Edit</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.shareBtn} onPress={shareToMessages} disabled={sharing}>
            {sharing
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={styles.shareBtnText}>Share to Messages</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" },
  backBtn: { backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  backText: { color: "white", fontSize: 14, fontWeight: "600" },
  deleteBtn: { backgroundColor: "rgba(220,38,38,0.15)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: "rgba(220,38,38,0.3)" },
  deleteText: { color: "#DC2626", fontSize: 14, fontWeight: "600" },
  image: { width: width, height: height * 0.58 },
  bottomPanel: { flex: 1, backgroundColor: "#1C1F26" },
  noteSection: { padding: 20, paddingBottom: 16 },
  noteLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  noteRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  noteText: { fontSize: 15, color: "white", lineHeight: 22, flex: 1 },
  notePlaceholder: { color: "rgba(255,255,255,0.3)", fontStyle: "italic" },
  editBadge: { backgroundColor: "rgba(249,115,22,0.2)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(249,115,22,0.3)" },
  editBadgeText: { fontSize: 11, color: "#F97316", fontWeight: "700" },
  noteInput: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, color: "white", fontSize: 15, minHeight: 80, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  accessoryBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1C1F26", padding: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  accessoryCancel: { paddingHorizontal: 16, paddingVertical: 8 },
  accessoryCancelText: { color: "rgba(255,255,255,0.5)", fontSize: 15 },
  accessoryDone: { backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  accessoryDoneText: { color: "white", fontWeight: "700", fontSize: 15 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 20 },
  actions: { padding: 20 },
  shareBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center" },
  shareBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
})