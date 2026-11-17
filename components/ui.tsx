import { Children, Fragment, ReactNode } from "react"
import {
  View, Text, ScrollView, Pressable, StyleSheet, StyleProp, ViewStyle, RefreshControlProps,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIsFocused } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { colors, radius, space, type, tabBarClearance } from "@/lib/theme"

type IconName = keyof typeof Ionicons.glyphMap

// ---------------------------------------------------------------------------
// Screen: page background, safe-area padding and (by default) scrolling.
// ---------------------------------------------------------------------------

export function Screen({
  children, scroll = true, tabBar = false, refreshControl, contentStyle,
}: {
  children: ReactNode
  /** false for screens that manage their own scrolling (for example a FlatList). */
  scroll?: boolean
  /** true on tab screens, so the last row clears the floating tab bar. */
  tabBar?: boolean
  refreshControl?: React.ReactElement<RefreshControlProps>
  contentStyle?: StyleProp<ViewStyle>
}) {
  const insets = useSafeAreaInsets()
  const focused = useIsFocused()
  const padding = {
    paddingTop: insets.top + 4,
    paddingBottom: tabBar ? tabBarClearance(insets.bottom) : insets.bottom + 24,
  }

  return (
    <View style={styles.screen}>
      {/* Dark status-bar text on the light background, only while this screen is in front. */}
      {focused && <StatusBar style="dark" />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, padding, contentStyle]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, { flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Header: optional back button and actions, then a large title.
// ---------------------------------------------------------------------------

export function ScreenHeader({
  title, subtitle, eyebrow, onBack, actions, trailing, children,
}: {
  title: string
  subtitle?: string
  /** Small line above the title ("Good evening,"). */
  eyebrow?: string
  onBack?: () => void
  /** Round buttons shown top-right. */
  actions?: ReactNode
  /** Shown to the right of the title itself (for example the profile picture). */
  trailing?: ReactNode
  /** Anything that belongs under the title (chips, a segmented control). */
  children?: ReactNode
}) {
  const hasTopRow = !!onBack || !!actions
  return (
    <View style={styles.header}>
      {hasTopRow && (
        <View style={styles.headerTopRow}>
          {onBack ? <CircleButton icon="chevron-back" label="Back" onPress={onBack} /> : <View />}
          <View style={styles.headerActions}>{actions}</View>
        </View>
      )}
      <View style={styles.headerTitleRow}>
        <View style={{ flex: 1 }}>
          {!!eyebrow && <Text style={type.subhead}>{eyebrow}</Text>}
          <Text style={type.largeTitle} numberOfLines={2} accessibilityRole="header">{title}</Text>
          {!!subtitle && <Text style={[type.subhead, { marginTop: 2 }]}>{subtitle}</Text>}
        </View>
        {trailing}
      </View>
      {children}
    </View>
  )
}

/** Round white button with an icon. `label` is read out by VoiceOver. */
export function CircleButton({
  icon, label, onPress, color = colors.text, disabled,
}: { icon: IconName; label: string; onPress: () => void; color?: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.circleButton, (pressed || disabled) && { opacity: 0.55 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  )
}

// ---------------------------------------------------------------------------
// Cards and grouped lists
// ---------------------------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

/** A white card of rows with thin dividers between them. */
export function ListGroup({ children, inset = 56 }: { children: ReactNode; inset?: number }) {
  const rows = Children.toArray(children).filter(Boolean)
  return (
    <Card>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={[styles.separator, { marginLeft: inset }]} />}
          {row}
        </Fragment>
      ))}
    </Card>
  )
}

/** One tappable row: icon, title, optional detail on the right, chevron. */
export function ListRow({
  icon, title, subtitle, value, onPress, iconColor = colors.tint, iconBackground = colors.tintSoft,
}: {
  icon?: IconName
  title: string
  subtitle?: string
  value?: string
  onPress?: () => void
  iconColor?: string
  iconBackground?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.fillSubtle }]}
    >
      {icon && (
        <View style={[styles.iconTile, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={type.body} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={type.footnote} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={type.subhead}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.chevron} />}
    </Pressable>
  )
}

/** Two to four headline numbers side by side in one card, so they always line up. */
export function StatStrip({
  stats, onPress,
}: { stats: { label: string; value: string }[]; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityHint={onPress ? "Choose which numbers to show" : undefined}
      style={({ pressed }) => [styles.card, styles.statStrip, pressed && { opacity: 0.7 }]}
    >
      {stats.map((stat, index) => (
        <View key={stat.label} style={[styles.stat, index > 0 && styles.statDivider]}>
          <Text style={type.title2} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
          <Text style={type.footnote} numberOfLines={2}>{stat.label}</Text>
        </View>
      ))}
    </Pressable>
  )
}

export function ProgressBar({ percent, height = 4, color = colors.accent }: { percent: number; height?: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0))
  return (
    <View
      style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: "hidden" }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View style={{ width: `${clamped}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  )
}

const CHIP_TONES = {
  neutral: { backgroundColor: colors.fill, color: colors.text },
  success: { backgroundColor: colors.successSoft, color: colors.success },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  info: { backgroundColor: colors.infoSoft, color: colors.info },
  tint: { backgroundColor: colors.tintSoft, color: colors.tint },
} as const

export function Chip({ label, tone = "neutral" }: { label: string; tone?: keyof typeof CHIP_TONES }) {
  const t = CHIP_TONES[tone]
  return (
    <View style={[styles.chip, { backgroundColor: t.backgroundColor }]}>
      <Text style={[styles.chipText, { color: t.color }]}>{label}</Text>
    </View>
  )
}

/** iOS-style two-or-three way switch. */
export function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string }[]; value: T; onChange: (key: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map(option => {
        const selected = option.key === value
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && { fontWeight: "600" }]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Section title with an optional text action on the right ("+ New"). */
export function SectionHeader({
  title, actionLabel, actionIcon, onAction,
}: { title: string; actionLabel?: string; actionIcon?: IconName; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={type.title2} accessibilityRole="header">{title}</Text>
      {!!actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.55 }]}>
          {actionIcon && <Ionicons name={actionIcon} size={18} color={colors.tint} />}
          <Text style={styles.textActionLabel}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

/** A button inside a card: "primary" (charcoal), "quiet" (grey), "success" or "danger". */
export function Button({
  label, icon, onPress, tone = "quiet", disabled, style,
}: {
  label: string
  icon?: IconName
  onPress: () => void
  tone?: "primary" | "quiet" | "success" | "danger"
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const palette = {
    primary: { backgroundColor: colors.charcoal, color: colors.white },
    quiet: { backgroundColor: colors.fillSubtle, color: colors.text },
    success: { backgroundColor: "#E3F3E8", color: colors.success },
    danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  }[tone]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { backgroundColor: palette.backgroundColor }, (pressed || disabled) && { opacity: 0.55 }, style]}
    >
      {icon && <Ionicons name={icon} size={18} color={palette.color} />}
      <Text style={[styles.buttonLabel, { color: palette.color }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon?: IconName; title: string; subtitle?: string }) {
  return (
    <Card style={styles.empty}>
      {icon && <Ionicons name={icon} size={32} color={colors.chevron} />}
      <Text style={[type.headline, { textAlign: "center" }]}>{title}</Text>
      {!!subtitle && <Text style={[type.subhead, { textAlign: "center" }]}>{subtitle}</Text>}
    </Card>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { paddingHorizontal: space.screen, gap: space.gap },

  header: { gap: 12 },
  headerTopRow: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitleRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 4 },

  circleButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card,
    alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(28,31,38,0.08)",
    shadowColor: "#1C1F26", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },

  card: { backgroundColor: colors.card, borderRadius: radius.card, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  listRow: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: { width: 30, height: 30, borderRadius: radius.tile, alignItems: "center", justifyContent: "center" },

  statStrip: { flexDirection: "row", paddingVertical: 14 },
  stat: { flex: 1, paddingHorizontal: 16, gap: 2 },
  statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.separator },

  chip: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: "center", alignSelf: "flex-start" },
  chipText: { fontSize: 13, fontWeight: "600" },

  segmented: { height: 36, borderRadius: 10, backgroundColor: colors.fill, padding: 2, flexDirection: "row" },
  segment: { flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  segmentSelected: {
    backgroundColor: colors.card,
    shadowColor: "#1C1F26", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 1,
  },
  segmentText: { fontSize: 14, fontWeight: "500", color: colors.text },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, minHeight: 32 },
  textAction: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, paddingLeft: 12 },
  textActionLabel: { fontSize: 17, fontWeight: "600", color: colors.tint },

  button: { height: 44, borderRadius: radius.control, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  buttonLabel: { fontSize: 16, fontWeight: "600" },

  empty: { padding: 32, alignItems: "center", gap: 6 },
})
