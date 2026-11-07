import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TEMPLATES, isPrintable, resolveOffsets } from "../core/templates";
import { preflightLabels } from "../pdf/sheet";
import { queueToCsv, toLabelContent } from "../queue/queue";
import { shareCsv } from "../services/output";
import { useApp } from "../state/AppState";
import { Button, Card, Note } from "../ui/components";
import { COPY } from "../ui/copy";
import { theme } from "../ui/theme";

export default function QueueScreen() {
  const { state, remove, move, clearQueue } = useApp();
  const { queue } = state;
  const template = TEMPLATES[state.settings.templateId];
  const stored = state.offsets[template.id];
  const offsets = useMemo(() => resolveOffsets(template, stored), [template, stored]);
  const [tooLong, setTooLong] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");

  // Check every label against the real sheet, so a name that will not fit is flagged here.
  useEffect(() => {
    let live = true;
    if (!isPrintable(template) || queue.length === 0) {
      setTooLong(new Set());
      return;
    }
    preflightLabels({ template, offsets, items: queue.map(toLabelContent), startSlot: 1 })
      .then((warnings) => {
        if (!live) return;
        const perSheet = template.labelsPerSheet;
        setTooLong(new Set(warnings.filter((w) => w.kind === "too_long").map((w) => (w.sheet - 1) * perSheet + (w.slot - 1))));
      })
      .catch(() => live && setTooLong(new Set()));
    return () => {
      live = false;
    };
  }, [queue, template, offsets]);

  async function exportCsv() {
    setMessage("");
    try {
      await shareCsv(queueToCsv(queue), COPY.queue.exportTitle);
    } catch {
      setMessage(COPY.queue.exportFailed);
    }
  }

  function confirmClear() {
    Alert.alert(COPY.queue.clearTitle, COPY.queue.clearBody, [
      { text: COPY.queue.cancel, style: "cancel" },
      { text: COPY.queue.clear, style: "destructive", onPress: clearQueue },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <FlatList
        data={queue}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button label={COPY.queue.add} onPress={() => router.push("/add")} />
            <View style={styles.headerRow}>
              <Text style={styles.count}>{COPY.queue.count(queue.length)}</Text>
              <Button small kind="plain" label={COPY.queue.settings} onPress={() => router.push("/settings")} />
            </View>
            {tooLong.size > 0 && <Note tone="warn">{COPY.queue.tooLongMany(tooLong.size)}</Note>}
          </View>
        }
        ListEmptyComponent={<Note>{COPY.queue.empty}</Note>}
        renderItem={({ item, index }) => (
          <Card>
            <View style={styles.entryTop}>
              <View style={styles.entryText}>
                <Text style={styles.line1}>{item.line1 || " "}</Text>
                {item.line2 ? <Text style={styles.line2}>{item.line2}</Text> : null}
              </View>
              {item.mark ? <Text style={styles.mark}>{item.mark}</Text> : null}
            </View>
            {tooLong.has(index) && <Note tone="warn">{COPY.queue.tooLongOne}</Note>}
            <View style={styles.actions}>
              <Button small kind="plain" label={COPY.queue.edit} onPress={() => router.push({ pathname: "/add", params: { id: item.id } })} />
              {item.kind === "plant" && (
                <Button small kind="plain" label={COPY.queue.cuttings} onPress={() => router.push({ pathname: "/cuttings", params: { id: item.id } })} />
              )}
              <Button small kind="plain" label={COPY.queue.up} disabled={index === 0} onPress={() => move(item.id, index - 1)} />
              <Button small kind="plain" label={COPY.queue.down} disabled={index === queue.length - 1} onPress={() => move(item.id, index + 1)} />
              <Button small kind="danger" label={COPY.queue.remove} onPress={() => remove(item.id)} />
            </View>
          </Card>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {message ? <Note tone="warn">{message}</Note> : null}
            <Button label={COPY.queue.print} disabled={queue.length === 0} onPress={() => router.push("/print")} />
            <View style={styles.gap} />
            <Button kind="plain" label={COPY.queue.export} disabled={queue.length === 0} onPress={exportCsv} />
            <Button kind="plain" label={COPY.queue.clear} disabled={queue.length === 0} onPress={confirmClear} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { padding: 16 },
  header: { marginBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  count: { fontSize: 15, color: theme.muted },
  entryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryText: { flex: 1, paddingRight: 8 },
  line1: { fontSize: 17, fontWeight: "700", color: theme.text },
  line2: { fontSize: 15, fontStyle: "italic", color: theme.muted, marginTop: 2 },
  mark: { fontSize: 15, fontWeight: "700", color: theme.accent, fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  footer: { marginTop: 8 },
  gap: { height: 8 },
});
