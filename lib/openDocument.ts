import { Linking, Alert, Platform } from "react-native"

export function openDocument(fileUrl: string, mimeType: string) {
  const isPDF = mimeType?.includes("pdf")

  if (!isPDF) {
    Linking.openURL(fileUrl)
    return
  }

  const encodedUrl = encodeURIComponent(fileUrl)
  const bluebeamUrl = `bluebeam://open?url=${encodedUrl}`

  Alert.alert(
    "Open PDF",
    "How would you like to open this file?",
    [
      {
        text: "Bluebeam Revu",
        onPress: () => {
          Linking.openURL(bluebeamUrl).catch(() => {
            Alert.alert(
              "Bluebeam Not Installed",
              "Would you like to download Bluebeam Revu?",
              [
                {
                  text: "Download",
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
          })
        }
      },
      {
        text: "Open in Browser",
        onPress: () => Linking.openURL(fileUrl)
      },
      { text: "Cancel", style: "cancel" }
    ]
  )
}