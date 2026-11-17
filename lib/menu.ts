import { ActionSheetIOS, Alert, Platform } from "react-native"

export type MenuItem = { label: string; onPress: () => void; destructive?: boolean }

/** The native iOS action sheet (a plain alert on Android) for "…" menus. */
export function showMenu(title: string | undefined, items: MenuItem[]) {
  if (items.length === 0) return
  if (Platform.OS === "ios") {
    const options = [...items.map(item => item.label), "Cancel"]
    const destructive = items.map((item, index) => (item.destructive ? index : -1)).filter(index => index >= 0)
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: destructive },
      index => { if (index < items.length) items[index].onPress() }
    )
    return
  }
  Alert.alert(title || "", undefined, [
    ...items.map(item => ({ text: item.label, onPress: item.onPress, style: (item.destructive ? "destructive" : "default") as "destructive" | "default" })),
    { text: "Cancel", style: "cancel" as const },
  ])
}
