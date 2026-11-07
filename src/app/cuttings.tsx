import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { nextCuttingSeq } from "../queue/queue";
import { useApp } from "../state/AppState";
import { Button, Card, Heading, Note } from "../ui/components";
import { COPY } from "../ui/copy";
import { theme } from "../ui/theme";

export default function CuttingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, addRun } = useApp();
  const parent = state.queue.find((e) => e.id === id);
  const [count, setCount] = useState("5");
  const [start, setStart] = useState(String(parent ? nextCuttingSeq(state.queue, parent.id) : 1));
  const [error, setError] = useState("");

  const n = parseInt(count, 10);
  const s = parseInt(start, 10);
  const preview = Number.isInteger(n) && Number.isInteger(s) && n >= 1 ? COPY.cuttings.marks(s, s + n - 1) : "";

  function submit() {
    setError("");
    try {
      addRun({ parentId: id, count: n, startSeq: s });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : COPY.cuttings.help);
    }
  }

  if (!parent) return null;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.line1}>{parent.line1}</Text>
          {parent.line2 ? <Text style={styles.line2}>{parent.line2}</Text> : null}
        </Card>
        <Note>{COPY.cuttings.help}</Note>

        <Heading style={styles.label}>{COPY.cuttings.howMany}</Heading>
        <TextInput value={count} onChangeText={setCount} keyboardType="number-pad" style={styles.input} />

        <Heading style={styles.label}>{COPY.cuttings.startAt}</Heading>
        <TextInput value={start} onChangeText={setStart} keyboardType="number-pad" style={styles.input} />

        {preview ? <Note>{preview}</Note> : null}
        {error ? <Note tone="warn">{error}</Note> : null}
        <Button label={COPY.cuttings.add} onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16 },
  label: { marginTop: 14 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius,
    padding: 12,
    fontSize: 17,
    color: theme.text,
    marginBottom: 8,
  },
  line1: { fontSize: 17, fontWeight: "700", color: theme.text },
  line2: { fontSize: 15, fontStyle: "italic", color: theme.muted, marginTop: 2 },
});
