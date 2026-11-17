import { View, Text, Pressable, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import { Ionicons } from "@expo/vector-icons"
import { colors, TAB_BAR_HEIGHT, tabBarBottom } from "@/lib/theme"

// The tab bar: a floating white capsule with the main tabs, and Quick Add as its
// own round "+" button beside it. Content scrolls underneath (screens add their own
// bottom padding with <Screen tabBar>).
export default function FloatingTabBar({
  state, descriptors, navigation, quickAddRoute,
}: BottomTabBarProps & { /** Route name shown as the separate "+" button instead of a tab. */ quickAddRoute?: string }) {
  const insets = useSafeAreaInsets()

  function go(routeKey: string, routeName: string, focused: boolean) {
    const event = navigation.emit({ type: "tabPress", target: routeKey, canPreventDefault: true })
    if (!focused && !event.defaultPrevented) navigation.navigate(routeName)
  }

  const quickAdd = state.routes.find(r => r.name === quickAddRoute)
  const quickAddFocused = !!quickAdd && state.routes[state.index].key === quickAdd.key

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: tabBarBottom(insets.bottom) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          if (route.name === quickAddRoute) return null
          const { options } = descriptors[route.key]
          const focused = state.index === index
          const color = focused ? colors.tint : colors.textSecondary
          const label = options.title ?? route.name
          return (
            <Pressable
              key={route.key}
              onPress={() => go(route.key, route.name, focused)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={[styles.tab, focused && styles.tabSelected]}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>{label}</Text>
            </Pressable>
          )
        })}
      </View>

      {quickAdd && (
        <Pressable
          onPress={() => go(quickAdd.key, quickAdd.name, quickAddFocused)}
          accessibilityRole="button"
          accessibilityLabel="Quick add"
          accessibilityHint="Photo, receipt, daily log, expense and more"
          style={({ pressed }) => [styles.plus, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="add" size={30} color={colors.accent} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  bar: {
    flex: 1, height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2, padding: 5, flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(28,31,38,0.10)",
    shadowColor: "#1C1F26", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8,
  },
  tab: { flex: 1, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 2 },
  tabSelected: { backgroundColor: "rgba(28,31,38,0.07)" },
  tabLabel: { fontSize: 11, lineHeight: 13, fontWeight: "600" },
  plus: {
    width: TAB_BAR_HEIGHT, height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: colors.charcoal, alignItems: "center", justifyContent: "center",
    shadowColor: "#1C1F26", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 24, elevation: 8,
  },
})
