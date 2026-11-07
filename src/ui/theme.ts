// Design tokens for the screens. Printed label geometry and printed type sizes
// are NOT here; they live in src/core/templates.ts and never change with the
// look of the app.

import type { TextStyle, ViewStyle } from "react-native";

export const theme = {
  bg: "#F6F1E6", // warm cream ground
  surface: "#FFFDF6", // warm paper, replaces pure white everywhere
  surfaceAlt: "#F0EAD9", // deeper cream for bands, chips, quiet fills
  text: "#1C2A1F",
  muted: "#626D5D", // captions and help only
  accent: "#245C33", // deep leaf green
  accentDark: "#1B4727", // pressed state, header tint
  accentSoft: "#DDEBD3", // sage fill for pills and selected rows
  border: "#D9D0B8", // warm sand hairline
  borderStrong: "#B9AE8E", // focus rings and secondary button borders
  warn: "#9E2F1B",
  warnBg: "#F9E8DD",
  clay: "#B05C2A", // cutting marks, start slot ring, cultivar badge, step numerals
  claySoft: "#F3DFCE",
  fill: "#CFE3C2", // slot state: will print
  blank: "#E7DFC9", // slot state: stays blank
  slotIdle: "#F3EEE0", // slot state: unused
  gold: "#C19A3D", // hairline details only
} as const;

export const radius = {
  card: 16,
  button: 14,
  input: 14,
  slot: 8,
  chip: 10,
  band: 12,
  pill: 999,
} as const;

/** Font family names, as registered by useFonts in the root layout. */
export const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  displayItalic: "Fraunces_400Regular_Italic",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
} as const;

/** The type scale. Line heights are part of the spec. */
export const type = {
  screenTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: theme.text },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, color: theme.text },
  wordmark: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: theme.text },
  section: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: theme.text },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 23, color: theme.text },
  line1: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: theme.text },
  line2: { fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 21, color: theme.muted },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: theme.text },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: theme.muted },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: theme.muted },
  button: { fontFamily: fonts.bodySemi, fontSize: 16, letterSpacing: 0.2 },
  buttonSmall: { fontFamily: fonts.bodySemi, fontSize: 14 },
  input: { fontFamily: fonts.body, fontSize: 17, color: theme.text },
  slot: { fontFamily: fonts.bodySemi, fontSize: 14, color: theme.text },
  stepValue: { fontFamily: fonts.displayMedium, fontSize: 26, color: theme.text, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

/** One soft shadow for cards. Buttons and inputs get none. */
export const shadow = {
  card: {
    shadowColor: theme.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  paper: {
    shadowColor: theme.text,
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
} satisfies Record<string, ViewStyle>;

/** Space between screen sections and the standard side gutter. */
export const space = { gutter: 16, group: 20 } as const;
