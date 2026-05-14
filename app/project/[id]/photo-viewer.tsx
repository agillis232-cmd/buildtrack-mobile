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
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ caption })
      })
      const data = await res.json()
      if (data.photo) {
        setEditingCaption(false)
      } else {
        Alert.alert("Error", "Could not save caption")
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
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        {/* Caption */}
        <View style={styles.captionSection}>
          <Text style={styles.captionLabel}>Note</Text>
          {editingCaption ? (
            <View style={styles.captionEditRow}>
              <TextInput
                style={styles.captionInput}
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a note..."
                placeholderTextColor="#9CA3AF"
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
            <TouchableOpacity onPress={() => setEditingCaption(true)} style={styles.captionRow}>
              <Text style={styles.captionText}>{caption || "Tap to add a note..."}</Text>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Share button */}
        <TouchableOpacity style={styles.shareBtn} onPress={shareToMessages} disabled={sharing}>
          {sharing
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={styles.shareBtnText}>Share to Messages</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: "white", fontSize: 16, fontWeight: "600" },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  deleteText: { color: "#DC2626", fontSize: 16, fontWeight: "600" },
  image: { width: width, height: height * 0.55 },
  bottomPanel: { flex: 1, backgroundColor: "#1C1F26", padding: 20 },
  captionSection: { marginBottom: 16 },
  captionLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  captionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  captionText: { fontSize: 15, color: "white", flex: 1, lineHeight: 22 },
  editText: { fontSize: 13, color: "#F97316", fontWeight: "600", marginLeft: 12 },
  captionEditRow: { gap: 10 },
  captionInput: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 12, color: "white", fontSize: 15, minHeight: 80 },

  saveBtn: { flex: 1, backgroundColor: "#F97316", borderRadius: 10, padding: 12, alignItems: "center" },
  saveBtnText: { color: "white", fontWeight: "700" },
  shareBtn: { backgroundColor: "#F97316", borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 20 },
  shareBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  accessoryBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1C1F26", padding: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  accessoryCancel: { paddingHorizontal: 16, paddingVertical: 8 },
  accessoryCancelText: { color: "rgba(255,255,255,0.6)", fontSize: 15 },
  accessoryDone: { backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  accessoryDoneText: { color: "white", fontWeight: "700", fontSize: 15 },
})