import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OFFSET_STEP_IN, TEMPLATES, clampOffset, isPrintable, resolveOffsets } from "../core/templates";
import { buildCalibrationPdf } from "../pdf/sheet";
import { printPdf } from "../services/output";
import { useApp } from "../state/AppState";
import { Button, Card, Heading, Note } from "../ui/components";
import { COPY, describeOffset } from "../ui/copy";
import { theme } from "../ui/theme";

export default function CalibrateScreen() {
  const { state, setOffsets, clearOffsets } = useApp();
  const template = TEMPLATES[state.settings.templateId];
  const offsets = resolveOffsets(template, state.offsets[template.id]);
  const words = describeOffset(offsets.xIn, offsets.yIn);
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

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.name}>{template.name}</Text>
        <Note>{COPY.calibrate.intro}</Note>

        <Card style={styles.steps}>
          <Text style={styles.step}>1. {COPY.calibrate.step1}</Text>
          <Text style={styles.step}>2. {COPY.calibrate.step2}</Text>
          <Text style={styles.step}>3. {COPY.calibrate.step3}</Text>
        </Card>

        <Button label={busy ? COPY.print.working : COPY.calibrate.printTest} disabled={busy} onPress={printTest} />
        {error ? <Note tone="warn">{error}</Note> : null}

        <Heading style={styles.heading}>{COPY.calibrate.current}</Heading>
        <Card>
          <Text style={styles.row}>{COPY.calibrate.sideways}: {words.sideways}</Text>
          <Text style={styles.row}>{COPY.calibrate.vertical}: {words.vertical}</Text>
        </Card>

        <View style={styles.pad}>
          <View style={styles.padRow}>
            <Button small kind="plain" label={COPY.calibrate.moveUp} onPress={() => nudge(0, -OFFSET_STEP_IN)} />
          </View>
          <View style={styles.padRow}>
            <Button small kind="plain" label={COPY.calibrate.moveLeft} onPress={() => nudge(-OFFSET_STEP_IN, 0)} />
            <Button small kind="plain" label={COPY.calibrate.moveRight} onPress={() => nudge(OFFSET_STEP_IN, 0)} />
          </View>
          <View style={styles.padRow}>
            <Button small kind="plain" label={COPY.calibrate.moveDown} onPress={() => nudge(0, OFFSET_STEP_IN)} />
          </View>
        </View>

        <Button kind="plain" label={COPY.calibrate.reset} onPress={() => clearOffsets(template.id)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16 },
  name: { fontSize: 20, fontWeight: "700", color: theme.text, marginBottom: 6 },
  steps: { marginTop: 12 },
  step: { fontSize: 15, color: theme.text, marginBottom: 6, lineHeight: 21 },
  heading: { marginTop: 20 },
  row: { fontSize: 16, color: theme.text, marginBottom: 4 },
  pad: { alignItems: "center", marginVertical: 12 },
  padRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
});
