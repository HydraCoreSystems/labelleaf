import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CULTIVARS, KEW, coveredGenera } from "../data";
import { useApp } from "../state/AppState";
import { usePurchases } from "../state/Purchases";
import { iapAvailable, manage, restore } from "../services/iap";
import { Body, Button, Caption, Card, Heading, Input, Note, Pill } from "../ui/components";
import { COPY } from "../ui/copy";
import { fonts, space, theme } from "../ui/theme";

export default function SettingsScreen() {
  const { state, setUsualGenus } = useApp();
  const kewGenera = coveredGenera(KEW);
  const registerGenera = coveredGenera(CULTIVARS);
  const { unlimited, left, setEntitlement } = usePurchases();
  const [note, setNote] = useState("");

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Card style={styles.group}>
          <Heading first rule>{COPY.settings.benchTitle}</Heading>
          <Body style={styles.label}>{COPY.settings.usualGenus}</Body>
          <Input
            value={state.settings.usualGenus}
            onChangeText={setUsualGenus}
            placeholder={COPY.settings.usualGenusPlaceholder}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <View style={styles.help}>
            <Note>{COPY.settings.usualGenusHelp}</Note>
          </View>
        </Card>

        <Card style={styles.group}>
          <Heading first rule>{COPY.settings.guidanceTitle}</Heading>
          <Body>{COPY.settings.guidance}</Body>
        </Card>

        <Card style={styles.group}>
          <Heading first rule>{COPY.settings.dataTitle}</Heading>
          {kewGenera.length ? (
            <>
              <View style={styles.pills}>
                {kewGenera.map((g) => (
                  <Pill key={g} label={g} />
                ))}
              </View>
              <Caption style={styles.version}>{COPY.settings.kewVersion(KEW.version)}</Caption>
            </>
          ) : (
            <Body>{COPY.settings.kewNone}</Body>
          )}
          <View style={styles.register}>
            <Body>{registerGenera.length ? COPY.settings.registerSome(registerGenera) : COPY.settings.registerNone}</Body>
          </View>
        </Card>

        <Card style={styles.group}>
          <Heading first rule>{COPY.plan.title}</Heading>
          <Body>{unlimited ? COPY.plan.active : COPY.plan.free(left)}</Body>
          {iapAvailable() ? (
            <View style={styles.help}>
              {unlimited ? (
                <Button kind="secondary" label={COPY.plan.manage} onPress={() => void manage().catch(() => undefined)} />
              ) : (
                <Button
                  kind="secondary"
                  label={COPY.paywall.restore}
                  onPress={() => {
                    setNote("");
                    restore()
                      .then((e) => {
                        setEntitlement(e);
                        if (e.until === null || e.until <= Date.now()) setNote(COPY.paywall.nothingToRestore);
                      })
                      .catch(() => setNote(COPY.paywall.storeDown));
                  }}
                />
              )}
              {note ? <Note>{note}</Note> : null}
            </View>
          ) : null}
        </Card>

        <Text style={styles.privacy}>{COPY.settings.privacy}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16, paddingBottom: 32 },
  group: { marginBottom: space.group },
  label: { marginBottom: 8 },
  help: { marginTop: 8 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  version: { marginTop: 12 },
  register: { marginTop: 16 },
  privacy: { fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 20, color: theme.muted, textAlign: "center", marginTop: 4 },
});
