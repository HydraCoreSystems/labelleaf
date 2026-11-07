import React from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CULTIVARS, KEW, coveredGenera } from "../data";
import { useApp } from "../state/AppState";
import { Card, Heading, Note } from "../ui/components";
import { COPY } from "../ui/copy";
import { theme } from "../ui/theme";

export default function SettingsScreen() {
  const { state, setUsualGenus } = useApp();
  const kewGenera = coveredGenera(KEW);
  const registerGenera = coveredGenera(CULTIVARS);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Heading>{COPY.settings.usualGenus}</Heading>
        <TextInput
          value={state.settings.usualGenus}
          onChangeText={setUsualGenus}
          placeholder={COPY.settings.usualGenusPlaceholder}
          placeholderTextColor={theme.muted}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />
        <Note>{COPY.settings.usualGenusHelp}</Note>

        <Card style={styles.card}>
          <Heading>{COPY.settings.guidanceTitle}</Heading>
          <Note>{COPY.settings.guidance}</Note>
        </Card>

        <Card>
          <Heading>{COPY.settings.dataTitle}</Heading>
          <Note>{kewGenera.length ? COPY.settings.kewSome(kewGenera, KEW.version) : COPY.settings.kewNone}</Note>
          <Note>{registerGenera.length ? COPY.settings.registerSome(registerGenera) : COPY.settings.registerNone}</Note>
        </Card>

        <Note>{COPY.settings.privacy}</Note>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16 },
  card: { marginTop: 18 },
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
});
