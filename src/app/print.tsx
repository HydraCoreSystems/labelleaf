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
import {
  Band,
  Body,
  Button,
  Card,
  CardTitle,
  Heading,
  LabelPreview,
  LegendItem,
  Note,
  PressableCard,
  RadioDot,
  RichBody,
  Segmented,
  SheetDiagram,
} from "../ui/components";
import { COPY } from "../ui/copy";
import { fonts, radius, shadow, theme, type } from "../ui/theme";

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
        <Heading first>{COPY.print.template}</Heading>
        {TEMPLATE_ORDER.map((id) => {
          const t = TEMPLATES[id];
          const selected = id === template.id;
          return (
            <PressableCard key={id} role="radio" selected={selected} onPress={() => setTemplate(id)}>
              <View style={styles.templateRow}>
                <RadioDot selected={selected} />
                <View style={styles.templateText}>
                  <Text style={styles.templateName}>{t.name}</Text>
                  <Note>{t.stock}</Note>
                  {!isPrintable(t) && <Note tone="warn">{COPY.print.notReady}</Note>}
                </View>
                <SheetDiagram selected={selected} />
              </View>
            </PressableCard>
          );
        })}

        {printable && (
          <>
            <View style={styles.mode}>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { key: "all", label: COPY.print.whole },
                  { key: "one", label: COPY.print.one },
                ]}
              />
            </View>

            {mode === "one" && (
              <View style={styles.oneList}>
                <Note>{COPY.print.pickOne}</Note>
                <View style={styles.oneGap} />
                {state.queue.map((e) => (
                  <Pressable key={e.id} onPress={() => setOneId(e.id)} accessibilityRole="radio" accessibilityState={{ selected: e.id === oneId }}>
                    <LabelPreview compact line1={e.line1} line2={e.line2} mark={e.mark} selected={e.id === oneId} />
                  </Pressable>
                ))}
              </View>
            )}

            <Heading>{COPY.print.start}</Heading>
            <Note>{COPY.print.startHelp}</Note>
            <View style={styles.paper}>
              {rows.map((row, r) => (
                <View key={r} style={styles.gridRow}>
                  {row.map((slot) => {
                    const st = states[slot - 1];
                    const chosen = slot === plan.startSlot;
                    return (
                      <Pressable
                        key={slot}
                        accessibilityRole="button"
                        accessibilityLabel={`Slot ${slot}`}
                        accessibilityState={{ selected: chosen }}
                        onPress={() => setStartSlot(slot)}
                        style={[
                          styles.slot,
                          st === "fill" ? styles.slotFill : st === "blank" ? styles.slotBlank : styles.slotIdle,
                          chosen && styles.slotChosen,
                        ]}
                      >
                        <Text style={[type.slot, chosen && { fontFamily: fonts.bodySemi, color: theme.clay }]}>{slot}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <LegendItem label={COPY.print.legendBlank} fill={theme.blank} />
              <LegendItem label={COPY.print.legendFill} fill={theme.fill} />
              <LegendItem label={COPY.print.legendEmpty} fill={theme.slotIdle} dashed />
            </View>

            <Band style={styles.plan}>
              <Body>{items.length > 0 && firstSheet ? COPY.print.plan(items.length, plan.startSlot, firstSheet.blankSlots.length) : COPY.print.noLabels}</Body>
            </Band>
            {plan.warning ? <Note tone="warn">{plan.warning}</Note> : null}

            <Card style={styles.tip}>
              <CardTitle>{COPY.print.tipTitle}</CardTitle>
              <View style={styles.tipText}>
                <Body>{COPY.print.tip}</Body>
              </View>
            </Card>

            {error ? <Note tone="warn">{error}</Note> : null}
            <Band tone="warn" style={styles.actual}>
              <RichBody parts={COPY.print.actualSize} />
            </Band>
            <Button tall label={busy ? COPY.print.working : COPY.print.button} disabled={busy || items.length === 0} onPress={doPrint} />
            <View style={styles.gap} />
            <Button kind="secondary" label={COPY.print.calibrate} onPress={() => router.push("/calibrate")} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16, paddingBottom: 32 },
  templateRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  templateText: { flex: 1 },
  templateName: { ...type.section, fontSize: 17, marginBottom: 2 },
  mode: { marginTop: 8, marginBottom: 4 },
  oneList: { marginTop: 12 },
  oneGap: { height: 8 },
  // The sheet itself: warm paper with a softer, wider shadow than other cards.
  paper: {
    backgroundColor: theme.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginTop: 12,
    ...shadow.paper,
  },
  gridRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  slot: { flex: 1, height: 48, borderRadius: radius.slot, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  slotFill: { backgroundColor: theme.fill },
  slotBlank: { backgroundColor: theme.blank },
  slotIdle: { backgroundColor: theme.slotIdle, borderStyle: "dashed", borderColor: theme.borderStrong },
  slotChosen: { borderWidth: 3, borderColor: theme.clay, borderStyle: "solid" },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8, marginTop: 14, marginBottom: 14 },
  plan: { marginBottom: 12 },
  tip: { marginTop: 4 },
  tipText: { marginTop: 6 },
  actual: { marginTop: 4, marginBottom: 16 },
  gap: { height: 12 },
});
