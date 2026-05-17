import { Linking, Alert, Platform } from "react-native"

export async function openDocument(fileUrl: string, mimeType: string) {
  const isPDF = mimeType?.includes("pdf")

  if (!isPDF) {
    Linking.openURL(fileUrl)
    return
  }

  const encodedUrl = encodeURIComponent(fileUrl)
  const bluebeamUrl = `bluebeam://open?url=${encodedUrl}`

  try {
    const canOpen = await Linking.canOpenURL(bluebeamUrl)
    if (canOpen) {
      Linking.openURL(bluebeamUrl)
    } else {
      Alert.alert(
        "Open PDF",
        "Bluebeam Revu is not installed. How would you like to open this file?",
        [
          {
            text: "Open in Browser",
            onPress: () => Linking.openURL(fileUrl)
          },
          {
            text: "Get Bluebeam",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("https://apps.apple.com/us/app/bluebeam-revu/id353071036")
              } else {
                Linking.openURL("https://play.google.com/store/apps/details?id=com.bluebeam.revu")
              }
            }
          },
          { text: "Cancel", style: "cancel" }
        ]
      )
    }
  } catch (e) {
    Linking.openURL(fileUrl)
  }
}