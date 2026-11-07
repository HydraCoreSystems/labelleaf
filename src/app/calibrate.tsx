import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { G, Line, Rect } from "react-native-svg";
import { OFFSET_STEP_IN, TEMPLATES, clampOffset, isPrintable, resolveOffsets, type TemplateDef } from "../core/templates";
import { buildCalibrationPdf } from "../pdf/sheet";
import { printPdf } from "../services/output";
import { useApp } from "../state/AppState";
import { Body, Button, Caption, Card, Heading, Note } from "../ui/components";
import { COPY, describeOffset, describeOffsetShort } from "../ui/copy";
import { ArrowIcon, type Direction } from "../ui/icons";
import { fonts, radius, theme, type } from "../ui/theme";

export default function CalibrateScreen() {
  const { state, setOffsets, clearOffsets } = useApp();
  const template = TEMPLATES[state.settings.templateId];
  const offsets = resolveOffsets(template, state.offsets[template.id]);
  const words = describeOffset(offsets.xIn, offsets.yIn);
  const short = describeOffsetShort(offsets.xIn, offsets.yIn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nudge = (dx: number, dy: number) =>
    setOffsets(template.id, { xIn: clampOffset(offsets.xIn + dx), yIn: clampOffset(offsets.yIn + dy) });

  async function printTest() {
    setError("");
    setBusy(true);
    try {
      const built = await buildCalibrationPdf({ template, offsets, heading: COPY.calibrate.heading });
      await printPdf(built.bytes);
    } catch {
      setError(COPY.calibrate.failed);
    } finally {
      setBusy(false);
    }
  }

  if (!isPrintable(template)) {
    return (
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.name}>{template.name}</Text>
          <Note tone="warn">{COPY.calibrate.notReady}</Note>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const steps = [COPY.calibrate.step1, COPY.calibrate.step2, COPY.calibrate.step3];

  const pad = (direction: Direction, label: string, onPress: () => void) => (
    <PadButton direction={direction} label={label} onPress={onPress} />
  );

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <LabelDiagram template={template} />
        <Text style={styles.name}>{template.name}</Text>
        <Note>{COPY.calibrate.intro}</Note>

        <Card style={styles.steps}>
          {steps.map((text, i) => (
            <View key={i} style={[styles.stepRow, i === steps.length - 1 && { marginBottom: 0 }]}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumeral}>{i + 1}</Text>
              </View>
              <View style={styles.stepText}>
                <Body>{text}</Body>
              </View>
            </View>
          ))}
        </Card>

        <Button label={busy ? COPY.print.working : COPY.calibrate.printTest} disabled={busy} onPress={printTest} />
        {error ? <Note tone="warn">{error}</Note> : null}

        <Heading>{COPY.calibrate.current}</Heading>
        <Card>
          <Text style={styles.offsetRow}>{COPY.calibrate.sideways}: {words.sideways}</Text>
          <Text style={[styles.offsetRow, { marginBottom: 0 }]}>{COPY.calibrate.vertical}: {words.vertical}</Text>
        </Card>

        <View style={styles.compass}>
          <View style={styles.compassRow}>
            <View style={styles.cell} />
            {pad("up", COPY.calibrate.moveUp, () => nudge(0, -OFFSET_STEP_IN))}
            <View style={styles.cell} />
          </View>
          <View style={styles.compassRow}>
            {pad("left", COPY.calibrate.moveLeft, () => nudge(-OFFSET_STEP_IN, 0))}
            <View style={[styles.cell, styles.center]}>
              <Text style={styles.centerText} numberOfLines={1} adjustsFontSizeToFit>{short.sideways}</Text>
              <Text style={styles.centerText} numberOfLines={1} adjustsFontSizeToFit>{short.vertical}</Text>
            </View>
            {pad("right", COPY.calibrate.moveRight, () => nudge(OFFSET_STEP_IN, 0))}
          </View>
          <View style={styles.compassRow}>
            <View style={styles.cell} />
            {pad("down", COPY.calibrate.moveDown, () => nudge(0, OFFSET_STEP_IN))}
            <View style={styles.cell} />
          </View>
        </View>
        <Caption style={styles.axes}>{COPY.calibrate.axes}</Caption>

        <View style={styles.reset}>
          <Button kind="plain" label={COPY.calibrate.reset} onPress={() => clearOffsets(template.id)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PadButton({ direction, label, onPress }: { direction: Direction; label: string; onPress: () => void }) {
  return (
    <PressableCardLike label={label} onPress={onPress}>
      <ArrowIcon direction={direction} />
    </PressableCardLike>
  );
}

function PressableCardLike({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.cell, styles.padButton, pressed && { backgroundColor: theme.surfaceAlt }]}
    >
      {children}
    </Pressable>
  );
}

/** One label outline at large scale, with the cross where it belongs and a faint cross where a drifting printer puts it. */
function LabelDiagram({ template }: { template: TemplateDef }) {
  const layout = template.layout!;
  const W = 300;
  const H = 180;
  const ratio = layout.labelWidthIn / layout.labelHeightIn;
  const w = Math.min(260, (H - 40) * ratio);
  const h = w / ratio;
  const x = (W - w) / 2;
  const y = (H - h) / 2;
  const cx = W / 2;
  const cy = H / 2;
  const arm = 18;
  return (
    <Card style={styles.diagram}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityElementsHidden importantForAccessibility="no">
        <Rect x={x} y={y} width={w} height={h} rx={10} fill="none" stroke={theme.borderStrong} strokeWidth={2} />
        <G opacity={0.6} translateX={10} translateY={6}>
          <Line x1={cx - arm} y1={cy} x2={cx + arm} y2={cy} stroke={theme.clay} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={cx} y1={cy - arm} x2={cx} y2={cy + arm} stroke={theme.clay} strokeWidth={2.5} strokeLinecap="round" />
        </G>
        <Line x1={cx - arm} y1={cy} x2={cx + arm} y2={cy} stroke={theme.accent} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={cx} y1={cy - arm} x2={cx} y2={cy + arm} stroke={theme.accent} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16, paddingBottom: 32 },
  diagram: { padding: 0, overflow: "hidden", alignItems: "center" },
  name: { ...type.section, fontSize: 17, marginBottom: 6, marginTop: 4 },
  steps: { marginTop: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" },
  stepNumeral: { fontFamily: fonts.bodySemi, fontSize: 15, color: theme.surface },
  stepText: { flex: 1, paddingTop: 2 },
  offsetRow: { ...type.cardTitle, fontVariant: ["tabular-nums"], marginBottom: 6 },
  compass: { alignItems: "center", marginTop: 12 },
  compassRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  cell: { width: 64, height: 64 },
  padButton: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { backgroundColor: theme.surfaceAlt, borderRadius: radius.button, alignItems: "center", justifyContent: "center", paddingHorizontal: 0 },
  centerText: { ...type.caption, fontSize: 11, fontFamily: fonts.bodySemi, color: theme.text, textAlign: "center", fontVariant: ["tabular-nums"] },
  axes: { textAlign: "center", marginTop: 4 },
  reset: { marginTop: 32, alignItems: "center" },
});
