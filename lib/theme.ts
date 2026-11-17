// One place for the app's look. Screens should take colours, sizes and text styles
// from here instead of typing hex codes and font sizes inline.

export const colors = {
  background: "#F4F3EF",   // page background (warm off-white)
  card: "#FFFFFF",
  text: "#1C1F26",
  textSecondary: "#5A6170",
  separator: "#E6E4DE",
  fill: "#E7E5DF",          // search fields, segmented control track, neutral chips
  fillSubtle: "#F0EFEA",    // quiet buttons on a white card
  track: "#ECEAE4",         // empty part of a progress bar
  chevron: "#9AA0AA",

  charcoal: "#1C1F26",
  white: "#FFFFFF",

  // Brand orange. `accent` is the bright brand colour for bars, dots and fills on dark.
  // `tint` is a deeper shade used for orange TEXT and ICONS on light backgrounds,
  // because the bright orange is too faint to read at small sizes on white.
  accent: "#F97316",
  tint: "#C2410C",
  tintSoft: "#FFF1E6",

  success: "#166534",
  successSoft: "#DCFCE7",
  warning: "#92400E",
  warningSoft: "#FEF3C7",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  info: "#1D4ED8",
  infoSoft: "#DBEAFE",
} as const

export const radius = {
  card: 20,
  control: 12,
  tile: 8,
  pill: 999,
} as const

export const space = {
  screen: 16,   // left/right page margin
  gap: 16,      // between cards
} as const

// Text styles follow the iOS type scale. Nothing in the app should be smaller than `caption`.
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -0.6, color: colors.text },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.3, color: colors.text },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", color: colors.text },
  body: { fontSize: 17, lineHeight: 22, color: colors.text },
  callout: { fontSize: 16, lineHeight: 21, color: colors.text },
  subhead: { fontSize: 15, lineHeight: 20, color: colors.textSecondary },
  footnote: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  caption: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
} as const

// The floating tab bar.
export const TAB_BAR_HEIGHT = 62

/** How far the floating tab bar sits above the bottom edge. */
export function tabBarBottom(bottomInset: number) {
  return bottomInset > 0 ? bottomInset - 10 : 16
}

/** Bottom padding a tab screen needs so its last row clears the floating tab bar. */
export function tabBarClearance(bottomInset: number) {
  return tabBarBottom(bottomInset) + TAB_BAR_HEIGHT + 24
}

/** "FULL_RENOVATION" -> "Full renovation" */
export function humanize(value: string | null | undefined): string {
  if (!value) return ""
  const text = value.replace(/_/g, " ").toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
