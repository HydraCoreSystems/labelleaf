// Shared building blocks. Screens use these and set only layout values, so no
// screen invents its own button, card, or input again.

import React, { forwardRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Mark } from "./icons";
import { fonts, radius, shadow, theme, type } from "./theme";

/* ---------------------------------------------------------------- Button */

export type ButtonKind = "primary" | "secondary" | "plain" | "danger";

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  small,
  tall,
  icon,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  small?: boolean;
  /** 56 points high, for the one main action on a screen. */
  tall?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const filled = kind === "primary" || kind === "secondary";
  const minHeight = small ? 44 : filled ? (tall ? 56 : 52) : 44;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { minHeight, minWidth: 44 },
        kind === "primary" && { backgroundColor: pressed ? theme.accentDark : theme.accent, paddingHorizontal: 20 },
        kind === "secondary" && {
          backgroundColor: pressed ? theme.surfaceAlt : theme.surface,
          borderWidth: 1,
          borderColor: theme.borderStrong,
          paddingHorizontal: small ? 14 : 20,
        },
        (kind === "plain" || kind === "danger") && { opacity: pressed ? 0.6 : 1, paddingHorizontal: 12 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
      <Text
        style={[
          small ? type.buttonSmall : type.button,
          { color: kind === "primary" ? theme.surface : kind === "danger" ? theme.warn : kind === "secondary" ? theme.accentDark : theme.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({ children, style, selected }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; selected?: boolean }) {
  return <View style={[styles.card, shadow.card, selected && styles.cardSelected, style]}>{children}</View>;
}

/** A card that can be tapped. Keeps the card look and gives 44 point targets. */
export function PressableCard({
  children,
  onPress,
  selected,
  role = "button",
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  role?: "button" | "radio";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole={role} accessibilityState={role === "radio" ? { selected: !!selected } : undefined} onPress={onPress}>
      {({ pressed }) => <Card selected={selected} style={[pressed && { backgroundColor: theme.surfaceAlt }, style]}>{children}</Card>}
    </Pressable>
  );
}

/** A quiet filled band: plan sentences, warnings. */
export function Band({ children, tone = "alt", style }: { children: React.ReactNode; tone?: "alt" | "warn"; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.band, { backgroundColor: tone === "warn" ? theme.warnBg : theme.surfaceAlt }, style]}>{children}</View>;
}

/* ----------------------------------------------------------------- Input */

export const Input = forwardRef<React.ComponentRef<typeof TextInput>, TextInputProps>(function Input({ style, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={theme.muted}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        styles.input,
        type.input,
        // Border grows by one point when focused; padding gives it back so nothing shifts.
        focused && { borderWidth: 2, borderColor: theme.accent, paddingHorizontal: 15 },
        // The browser draws its own outline on top of ours; our border is the focus ring.
        Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null,
        style,
      ]}
    />
  );
});

/* ------------------------------------------------------------- Badge, Pill */

export type BadgeKind = "kew" | "format" | "cultivar";

const BADGE: Record<BadgeKind, { bg: string; fg: string }> = {
  kew: { bg: theme.accent, fg: theme.surface },
  format: { bg: theme.blank, fg: theme.text },
  cultivar: { bg: theme.clay, fg: theme.surface },
};

export function Badge({ kind, label }: { kind: BadgeKind; label: string }) {
  const c = BADGE[kind];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

/** A small rounded label: cutting marks (clay) and genus coverage (sage). */
export function Pill({ label, tone = "sage" }: { label: string; tone?: "sage" | "clay" }) {
  return (
    <View style={[styles.pill, { backgroundColor: tone === "clay" ? theme.claySoft : theme.accentSoft }]}>
      <Text style={[styles.pillText, { color: tone === "clay" ? theme.clay : theme.accentDark }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ Text */

export function ScreenTitle({ children, rule }: { children: React.ReactNode; rule?: boolean }) {
  return (
    <View>
      <Text accessibilityRole="header" style={type.screenTitle}>{children}</Text>
      {rule ? <View style={styles.rule} /> : null}
    </View>
  );
}

/** Section heading: 20 above and 8 below, unless it sits first inside a card. */
export function Heading({
  children,
  rule,
  first,
  style,
}: {
  children: React.ReactNode;
  rule?: boolean;
  first?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <View style={{ marginTop: first ? 0 : 20, marginBottom: 8 }}>
      <Text accessibilityRole="header" style={[type.section, style]}>{children}</Text>
      {rule ? <View style={styles.rule} /> : null}
    </View>
  );
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.cardTitle, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.body, style]}>{children}</Text>;
}

export function Note({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" }) {
  return <Text style={[type.note, tone === "warn" && { color: theme.warn }]}>{children}</Text>;
}

export function Caption({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.caption, style]}>{children}</Text>;
}

/** Body text with some words in bold. Segments are [text, bold]. */
export function RichBody({ parts, style }: { parts: readonly (readonly [string, boolean])[]; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[type.body, style]}>
      {parts.map(([text, bold], i) => (
        <Text key={i} style={bold ? { fontFamily: fonts.bodySemi } : undefined}>{text}</Text>
      ))}
    </Text>
  );
}

/* --------------------------------------------------------- Label preview */

/**
 * A card with the proportions of the lead label, 3 to 1, holding the plant's
 * two lines and an optional cutting mark. It grows if its contents need more
 * room, and never gets shorter than 3 to 1.
 */
export function LabelPreview({
  line1,
  line2,
  mark,
  compact,
  selected,
  footer,
  right,
  style,
  maxWidth,
}: {
  line1: string;
  line2?: string;
  mark?: string;
  compact?: boolean;
  selected?: boolean;
  footer?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}) {
  const [width, setWidth] = useState(0);
  const ratio = compact ? 5 : 3;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.preview,
        shadow.card,
        { minHeight: width / ratio, maxWidth },
        selected && { borderColor: theme.accent, borderWidth: 2 },
        style,
      ]}
    >
      <View style={styles.previewRule} />
      <View style={styles.previewBody}>
        <View style={styles.previewTop}>
          <View style={styles.previewText}>
            <Text style={type.line1}>{line1 || " "}</Text>
            {line2 ? <Text style={[type.line2, { marginTop: 2 }]}>{line2}</Text> : null}
          </View>
          {mark ? <Pill tone="clay" label={mark} /> : null}
          {right}
        </View>
        {footer}
      </View>
    </View>
  );
}

/* ----------------------------------------------------------- Empty state */

export function EmptyState({ title, note, action }: { title: string; note: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <Mark size={96} color={theme.accent} opacity={0.5} />
      <Text style={[type.section, { marginTop: 16, textAlign: "center" }]}>{title}</Text>
      <Text style={[type.note, { marginTop: 6, textAlign: "center" }]}>{note}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------- Segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={[styles.segment, active && { backgroundColor: theme.accent }]}
          >
            <Text style={[type.button, { color: active ? theme.surface : theme.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* --------------------------------------------------------------- Stepper */

/** A value with two big buttons, for counting without a keyboard. */
export function StepperRow({
  title,
  value,
  lessLabel,
  moreLabel,
  onLess,
  onMore,
  lessDisabled,
  moreDisabled,
}: {
  title: string;
  value: number;
  lessLabel: string;
  moreLabel: string;
  onLess: () => void;
  onMore: () => void;
  lessDisabled?: boolean;
  moreDisabled?: boolean;
}) {
  return (
    <Card>
      <Text style={type.cardTitle}>{title}</Text>
      <View style={styles.stepper}>
        <Button kind="secondary" small label={lessLabel} onPress={onLess} disabled={lessDisabled} style={styles.stepButton} />
        <Text accessibilityLiveRegion="polite" style={[type.stepValue, styles.stepValue]}>{value}</Text>
        <Button kind="secondary" small label={moreLabel} onPress={onMore} disabled={moreDisabled} style={styles.stepButton} />
      </View>
    </Card>
  );
}

/** A small label shaped chip holding one cutting mark. */
export function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[type.buttonSmall, { color: theme.clay, fontVariant: ["tabular-nums"] }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------- Print screen helpers */

export function RadioDot({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && { borderColor: theme.accent }]}>
      {selected ? <View style={styles.radioFill} /> : null}
    </View>
  );
}

/** Nine tiny rectangles standing for a sheet of labels. */
export function SheetDiagram({ selected }: { selected: boolean }) {
  return (
    <View style={styles.diagram} accessibilityElementsHidden importantForAccessibility="no">
      {Array.from({ length: 9 }, (_, i) => (
        <View key={i} style={[styles.diagramCell, selected && { backgroundColor: theme.accentSoft }]} />
      ))}
    </View>
  );
}

/** Swatch and word for the slot legend. */
export function LegendItem({ label, fill, dashed }: { label: string; fill: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: fill },
          dashed && { borderStyle: "dashed", borderColor: theme.borderStrong, borderWidth: 1 },
        ]}
      />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.button, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  buttonIcon: { marginRight: 8 },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 18,
    marginBottom: 12,
  },
  cardSelected: { borderColor: theme.accent, borderWidth: 2, padding: 17 },
  band: { borderRadius: radius.band, padding: 12 },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.input,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  pill: { height: 24, paddingHorizontal: 10, borderRadius: radius.pill, justifyContent: "center", alignSelf: "flex-start" },
  badgeText: { fontFamily: fonts.bodySemi, fontSize: 12 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  rule: { width: 24, height: 2, backgroundColor: theme.gold, marginTop: 6 },
  preview: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.card,
    marginBottom: 12,
    flexDirection: "row",
  },
  previewRule: {
    width: 5,
    backgroundColor: theme.accent,
    borderTopLeftRadius: radius.card - 1,
    borderBottomLeftRadius: radius.card - 1,
  },
  previewBody: { flex: 1, padding: 14, justifyContent: "space-between" },
  previewTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  previewText: { flex: 1 },
  empty: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  emptyAction: { alignSelf: "stretch", marginTop: 20 },
  segmented: { flexDirection: "row", backgroundColor: theme.surfaceAlt, borderRadius: radius.button, height: 48, padding: 3 },
  segment: { flex: 1, borderRadius: radius.button - 3, alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  stepButton: { width: 64, minHeight: 52 },
  stepValue: { flex: 1, textAlign: "center" },
  chip: {
    backgroundColor: theme.surfaceAlt,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.chip,
    height: 36,
    minWidth: 72,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent },
  diagram: { width: 36, flexDirection: "row", flexWrap: "wrap", gap: 3 },
  diagramCell: { width: 10, height: 7, borderRadius: 2, borderWidth: 1, borderColor: theme.borderStrong },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4 },
});
