import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { theme } from "./theme";

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "plain" | "danger";
  disabled?: boolean;
  small?: boolean;
}) {
  const bg = kind === "primary" ? theme.accent : "transparent";
  const color = kind === "primary" ? theme.accentText : kind === "danger" ? theme.warn : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, borderColor: kind === "primary" ? theme.accent : theme.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Heading({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Note({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" }) {
  return <Text style={[styles.note, tone === "warn" && styles.noteWarn]}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderRadius: theme.radius, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  buttonSmall: { paddingVertical: 6, paddingHorizontal: 10 },
  buttonText: { fontSize: 16, fontWeight: "600" },
  buttonTextSmall: { fontSize: 14 },
  card: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: theme.radius, padding: 14, marginBottom: 12 },
  heading: { fontSize: 17, fontWeight: "700", color: theme.text, marginBottom: 6 },
  note: { fontSize: 14, color: theme.muted, lineHeight: 20 },
  noteWarn: { color: theme.warn },
});
