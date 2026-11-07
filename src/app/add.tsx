import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { checkName } from "../checker/check";
import type { Offer } from "../checker/types";
import { CULTIVARS, KEW } from "../data";
import { entryFromOffer, entryFromTyped } from "../queue/queue";
import { useApp } from "../state/AppState";
import { Button, Card, Heading, Note } from "../ui/components";
import { COPY } from "../ui/copy";
import { theme } from "../ui/theme";

export default function AddScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, add, update } = useApp();
  const editing = id ? state.queue.find((e) => e.id === id) : undefined;
  const [typed, setTyped] = useState(editing?.typed ?? "");

  // Suggestions only. Nothing here changes the name until the grower taps.
  const result = useMemo(
    () => checkName(typed, { kew: KEW, cultivars: CULTIVARS, usualGenus: state.settings.usualGenus }),
    [typed, state.settings.usualGenus]
  );

  function accept(offer: Offer) {
    if (editing) {
      update(editing.id, { typed, line1: offer.line1, line2: offer.line2, name: offer.name, source: "offer" });
    } else {
      add(entryFromOffer(typed, offer));
    }
    router.back();
  }

  function keepAsTyped() {
    if (editing) {
      update(editing.id, { typed, line1: result.asTyped.line1, line2: result.asTyped.line2, name: null, source: "typed" });
    } else {
      add(entryFromTyped(typed, result.asTyped));
    }
    router.back();
  }

  const hasText = typed.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <Stack.Screen options={{ title: editing ? COPY.add.titleEdit : COPY.add.titleNew }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Heading>{COPY.add.prompt}</Heading>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          placeholder={COPY.add.placeholder}
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoFocus
          style={styles.input}
        />
        <Note>{COPY.add.help}</Note>

        <View style={styles.section}>
          <Heading>{COPY.add.suggestions}</Heading>
          {!hasText && <Note>{COPY.add.nothing}</Note>}
          {result.offers.map((offer) => (
            <Pressable key={offer.id} accessibilityRole="button" onPress={() => accept(offer)}>
              <Card>
                <Text style={styles.line1}>{offer.line1 || " "}</Text>
                {offer.line2 ? <Text style={styles.line2}>{offer.line2}</Text> : null}
                {offer.reason ? <Note>{offer.reason}</Note> : null}
              </Card>
            </Pressable>
          ))}
          {result.notes.map((n) => (
            <Note key={n}>{n}</Note>
          ))}
        </View>

        {hasText && <Button kind="plain" label={COPY.add.keep} onPress={keepAsTyped} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16 },
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
  section: { marginTop: 18 },
  line1: { fontSize: 17, fontWeight: "700", color: theme.text },
  line2: { fontSize: 15, fontStyle: "italic", color: theme.muted, marginTop: 2 },
});
