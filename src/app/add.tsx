import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { checkName } from "../checker/check";
import type { Offer, OfferLayer } from "../checker/types";
import { CULTIVARS, KEW } from "../data";
import { entryFromOffer, entryFromTyped } from "../queue/queue";
import { useApp } from "../state/AppState";
import { Badge, Body, Button, Caption, Heading, Input, LabelPreview, Note, PressableCard, type BadgeKind } from "../ui/components";
import { COPY } from "../ui/copy";
import { theme, type } from "../ui/theme";

// The usual genus suggestion is a formatting help, so it wears the Format badge.
const BADGE_FOR_LAYER: Record<OfferLayer, BadgeKind> = { format: "format", kew: "kew", cultivar: "cultivar", usual: "format" };

export default function AddScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, add, update, remove } = useApp();
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

  function removeEntry() {
    if (!editing) return;
    remove(editing.id);
    router.back();
  }

  const hasText = typed.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <Stack.Screen options={{ title: editing ? COPY.add.titleEdit : COPY.add.titleNew }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Heading first>{COPY.add.prompt}</Heading>
        <Input
          value={typed}
          onChangeText={setTyped}
          placeholder={COPY.add.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoFocus
        />
        <View style={styles.help}>
          <Note>{COPY.add.help}</Note>
        </View>

        {hasText && (
          <View style={styles.previewWrap}>
            <Caption style={styles.previewCaption}>{COPY.add.previewTitle}</Caption>
            <LabelPreview line1={result.asTyped.line1} line2={result.asTyped.line2} maxWidth={270} />
          </View>
        )}

        <Heading>{COPY.add.suggestions}</Heading>
        {!hasText && <Note>{COPY.add.nothing}</Note>}
        {result.offers.map((offer) => (
          <PressableCard key={offer.id} onPress={() => accept(offer)}>
            <View style={styles.offerTop}>
              <View style={styles.offerText}>
                <Text style={type.line1}>{offer.line1 || " "}</Text>
                {offer.line2 ? <Text style={[type.line2, styles.line2]}>{offer.line2}</Text> : null}
              </View>
              <Badge kind={BADGE_FOR_LAYER[offer.layer]} label={COPY.badge[BADGE_FOR_LAYER[offer.layer]]} />
            </View>
            {offer.reason ? <Body style={styles.reason}>{offer.reason}</Body> : null}
          </PressableCard>
        ))}
        {result.notes.map((n) => (
          <View key={n} style={styles.noteRow}>
            <Note>{n}</Note>
          </View>
        ))}

        {hasText && (
          <View style={styles.keep}>
            <Button kind="secondary" label={COPY.add.keep} onPress={keepAsTyped} />
            <Caption style={styles.keepNote}>{COPY.add.keepNote}</Caption>
          </View>
        )}

        {editing && (
          <View style={styles.remove}>
            <Button kind="danger" label={COPY.add.removeFromList} onPress={removeEntry} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16, paddingBottom: 32 },
  help: { marginTop: 8 },
  previewWrap: { marginTop: 16 },
  previewCaption: { marginBottom: 6 },
  offerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  offerText: { flex: 1 },
  line2: { marginTop: 2 },
  reason: { marginTop: 10 },
  noteRow: { marginBottom: 8 },
  keep: { marginTop: 8 },
  keepNote: { marginTop: 8, textAlign: "center" },
  remove: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border, alignItems: "center" },
});
