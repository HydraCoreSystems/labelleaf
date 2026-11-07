import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MAX_RUN, nextCuttingSeq } from "../queue/queue";
import { useApp } from "../state/AppState";
import { Button, Caption, Chip, LabelPreview, Note, StepperRow } from "../ui/components";
import { COPY } from "../ui/copy";
import { theme } from "../ui/theme";

const MAX_CHIPS = 6;

const markFor = (n: number) => `C${String(n).padStart(2, "0")}`;

export default function CuttingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, addRun } = useApp();
  const parent = state.queue.find((e) => e.id === id);
  const [count, setCount] = useState(5);
  const [start, setStart] = useState(parent ? nextCuttingSeq(state.queue, parent.id) : 1);
  const [error, setError] = useState("");

  function submit() {
    setError("");
    try {
      addRun({ parentId: id, count, startSeq: start });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : COPY.cuttings.help);
    }
  }

  if (!parent) return null;

  const last = start + count - 1;
  const shown = Array.from({ length: Math.min(count, MAX_CHIPS) }, (_, i) => markFor(start + i));

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <LabelPreview line1={parent.line1} line2={parent.line2} />
        <Note>{COPY.cuttings.help}</Note>

        <View style={styles.steppers}>
          <StepperRow
            title={COPY.cuttings.howMany}
            value={count}
            lessLabel={COPY.cuttings.fewer}
            moreLabel={COPY.cuttings.more}
            lessDisabled={count <= 1}
            moreDisabled={start + count > MAX_RUN}
            onLess={() => setCount((c) => Math.max(1, c - 1))}
            onMore={() => setCount((c) => Math.min(MAX_RUN - start + 1, c + 1))}
          />
          <StepperRow
            title={COPY.cuttings.startAt}
            value={start}
            lessLabel={COPY.cuttings.lower}
            moreLabel={COPY.cuttings.higher}
            lessDisabled={start <= 1}
            moreDisabled={last >= MAX_RUN}
            onLess={() => setStart((s) => Math.max(1, s - 1))}
            onMore={() => setStart((s) => Math.min(MAX_RUN - count + 1, s + 1))}
          />
        </View>

        <View style={styles.chips}>
          {shown.map((m) => (
            <Chip key={m} label={m} />
          ))}
        </View>
        <Caption style={styles.chipCaption}>{COPY.cuttings.chipCaption(count, markFor(last))}</Caption>

        {error ? <Note tone="warn">{error}</Note> : null}
        <View style={styles.submit}>
          <Button label={COPY.cuttings.add} onPress={submit} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16, paddingBottom: 32 },
  steppers: { marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chipCaption: { marginTop: 10 },
  submit: { marginTop: 20 },
});
