import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TEMPLATE_ORDER, TEMPLATES, isPrintable, resolveOffsets } from "../core/templates";
import { planRun, slotStates, type SlotState } from "../picker/slots";
import { buildLabelPdf } from "../pdf/sheet";
import { toLabelContent } from "../queue/queue";
import { printPdf } from "../services/output";
import { useApp } from "../state/AppState";
import { Button, Card, Heading, Note } from "../ui/components";
import { COPY } from "../ui/copy";
import { theme } from "../ui/theme";

export default function PrintScreen() {
  const { state, setTemplate } = useApp();
  const template = TEMPLATES[state.settings.templateId];
  const printable = isPrintable(template);
  const offsets = resolveOffsets(template, state.offsets[template.id]);

  const [mode, setMode] = useState<"all" | "one">("all");
  const [oneId, setOneId] = useState<string | null>(state.queue[0]?.id ?? null);
  const [startSlot, setStartSlot] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const items = useMemo(
    () => (mode === "all" ? state.queue : state.queue.filter((e) => e.id === oneId)),
    [mode, oneId, state.queue]
  );
  const perSheet = template.labelsPerSheet;
  const plan = useMemo(() => planRun(startSlot, items.length, perSheet), [startSlot, items.length, perSheet]);
  const columns = template.layout?.columns ?? 3;
  const firstSheet = plan.sheets[0];

  async function doPrint() {
    setError("");
    setBusy(true);
    try {
      const built = await buildLabelPdf({ template, offsets, items: items.map(toLabelContent), startSlot: plan.startSlot });
      await printPdf(built.bytes);
    } catch {
      setError(COPY.print.failed);
    } finally {
      setBusy(false);
    }
  }

  const rows: number[][] = [];
  for (let i = 0; i < perSheet; i += columns) rows.push(Array.from({ length: Math.min(columns, perSheet - i) }, (_, k) => i + k + 1));
  const states: SlotState[] = slotStates(plan, 0);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Heading>{COPY.print.template}</Heading>
        {TEMPLATE_ORDER.map((id) => {
          const t = TEMPLATES[id];
          const selected = id === template.id;
          return (
            <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setTemplate(id)}>
              <Card style={selected ? styles.selected : undefined}>
                <Text style={styles.name}>{t.name}</Text>
                <Note>{t.stock}</Note>
                {!isPrintable(t) && <Note tone="warn">{COPY.print.notReady}</Note>}
              </Card>
            </Pressable>
          );
        })}

        {printable && (
          <>
            <View style={styles.modeRow}>
              <Button small kind={mode === "all" ? "primary" : "plain"} label={COPY.print.whole} onPress={() => setMode("all")} />
              <Button small kind={mode === "one" ? "primary" : "plain"} label={COPY.print.one} onPress={() => setMode("one")} />
            </View>

            {mode === "one" && (
              <View style={styles.oneList}>
                <Note>{COPY.print.pickOne}</Note>
                {state.queue.map((e) => (
                  <Pressable key={e.id} onPress={() => setOneId(e.id)} accessibilityRole="radio" accessibilityState={{ selected: e.id === oneId }}>
                    <Card style={e.id === oneId ? styles.selected : undefined}>
                      <Text style={styles.name}>{e.line1}{e.mark ? `  ${e.mark}` : ""}</Text>
                      {e.line2 ? <Text style={styles.line2}>{e.line2}</Text> : null}
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}

            <Heading style={styles.gridTitle}>{COPY.print.start}</Heading>
            <Note>{COPY.print.startHelp}</Note>
            <View style={styles.grid}>
              {rows.map((row, r) => (
                <View key={r} style={styles.gridRow}>
                  {row.map((slot) => {
                    const st = states[slot - 1];
                    return (
                      <Pressable
                        key={slot}
                        accessibilityRole="button"
                        accessibilityLabel={`Slot ${slot}`}
                        onPress={() => setStartSlot(slot)}
                        style={[styles.slot, st === "fill" ? styles.slotFill : st === "blank" ? styles.slotBlank : styles.slotEmpty]}
                      >
                        <Text style={styles.slotText}>{slot}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <Text style={styles.legendText}>{COPY.print.legendBlank}</Text>
              <Text style={styles.legendText}>{COPY.print.legendFill}</Text>
              <Text style={styles.legendText}>{COPY.print.legendEmpty}</Text>
            </View>

            {items.length > 0 && firstSheet ? (
              <Note>{COPY.print.plan(items.length, plan.startSlot, firstSheet.blankSlots.length)}</Note>
            ) : (
              <Note>{COPY.print.noLabels}</Note>
            )}
            {plan.warning ? <Note tone="warn">{plan.warning}</Note> : null}

            <Card style={styles.tip}>
              <Heading>{COPY.print.tipTitle}</Heading>
              <Note>{COPY.print.tip}</Note>
            </Card>

            {error ? <Note tone="warn">{error}</Note> : null}
            <Button label={busy ? COPY.print.working : COPY.print.button} disabled={busy || items.length === 0} onPress={doPrint} />
            <View style={styles.gap} />
            <Button kind="plain" label={COPY.print.calibrate} onPress={() => router.push("/calibrate")} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16 },
  selected: { borderColor: theme.accent, borderWidth: 2 },
  name: { fontSize: 16, fontWeight: "700", color: theme.text },
  line2: { fontSize: 14, fontStyle: "italic", color: theme.muted, marginTop: 2 },
  modeRow: { flexDirection: "row", gap: 8, marginVertical: 12 },
  oneList: { marginBottom: 8 },
  gridTitle: { marginTop: 12 },
  grid: { marginTop: 8 },
  gridRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  slot: { flex: 1, height: 34, borderRadius: 6, borderWidth: 1, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
  slotFill: { backgroundColor: theme.fill, borderColor: theme.accent },
  slotBlank: { backgroundColor: theme.blank },
  slotEmpty: { backgroundColor: theme.card },
  slotText: { fontSize: 13, color: theme.text },
  legend: { flexDirection: "row", justifyContent: "space-around", marginVertical: 8 },
  legendText: { fontSize: 12, color: theme.muted },
  tip: { marginTop: 12 },
  gap: { height: 8 },
});
