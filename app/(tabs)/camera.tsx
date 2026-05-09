import { View, Text, StyleSheet } from "react-native"

export default function CameraScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Camera coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F4F0" },
  text: { fontSize: 16, color: "#6B7280" }
})