import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PLAN_ANNUAL, type PlanProduct } from "../core/entitlement";
import { PRIVACY_URL, TERMS_URL } from "../core/links";
import { buy, iapAvailable, loadPlans, restore } from "../services/iap";
import { usePurchases } from "../state/Purchases";
import { Body, Button, Card, CardTitle, Heading, Note } from "../ui/components";
import { COPY } from "../ui/copy";
import { Mark } from "../ui/icons";
import { fonts, theme, type } from "../ui/theme";

const planName = (id: string) => (id === PLAN_ANNUAL ? COPY.paywall.annual : COPY.paywall.monthly);
const planLine = (p: PlanProduct) => (p.id === PLAN_ANNUAL ? COPY.paywall.perYear(p.displayPrice) : COPY.paywall.perMonth(p.displayPrice));

/**
 * The paywall. Only the print action opens it, when the free count cannot cover the run. It says plainly
 * that every feature stays free and only the count is lifted. Nothing else in the app shows it.
 */
export default function Paywall() {
  const { unlimited, left, setEntitlement } = usePurchases();
  const params = useLocalSearchParams<{ needed?: string }>();
  const needed = params.needed && /^\d+$/.test(params.needed) ? Number(params.needed) : null;

  const [plans, setPlans] = useState<PlanProduct[] | null>(null);
  const [down, setDown] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    setDown(false);
    setPlans(null);
    if (!iapAvailable()) {
      setDown(true);
      return;
    }
    loadPlans()
      .then(setPlans)
      .catch(() => setDown(true));
  }, []);

  useEffect(load, [load]);

  // The moment a purchase goes through, the count is lifted and the screen closes by itself.
  useEffect(() => {
    if (unlimited) router.back();
  }, [unlimited]);

  const choose = async (sku: string) => {
    setWorking(true);
    setMessage("");
    try {
      await buy(sku);
    } catch {
      setDown(true);
    } finally {
      setWorking(false);
    }
  };

  const doRestore = async () => {
    setWorking(true);
    setMessage("");
    try {
      const e = await restore();
      setEntitlement(e);
      if (e.until === null || e.until <= Date.now()) setMessage(COPY.paywall.nothingToRestore);
    } catch {
      setDown(true);
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.top}>
          <Mark size={56} />
          <Text accessibilityRole="header" style={styles.title}>{COPY.paywall.title}</Text>
          <View style={styles.rule} />
        </View>
        <Body style={styles.lead}>{COPY.paywall.body(left, needed)}</Body>
        <Note>{COPY.paywall.everything}</Note>
        <Note>{COPY.paywall.kept}</Note>

        {plans === null && !down ? <ActivityIndicator color={theme.accent} style={styles.spinner} /> : null}
        {down ? (
          <Card style={styles.card}>
            <Body>{COPY.paywall.storeDown}</Body>
            <View style={styles.gap} />
            <Button kind="secondary" label={COPY.paywall.tryAgain} onPress={load} />
          </Card>
        ) : null}
        {plans?.map((p) => (
          <Card key={p.id} style={styles.card}>
            <CardTitle>{planName(p.id)}</CardTitle>
            <Text style={styles.price}>{planLine(p)}</Text>
            <Button
              kind={p.id === PLAN_ANNUAL ? "primary" : "secondary"}
              label={COPY.paywall.buy}
              accessibilityLabel={`${COPY.paywall.buy} ${planName(p.id)}`}
              disabled={working}
              onPress={() => void choose(p.id)}
            />
          </Card>
        ))}

        {message ? <Note tone="warn">{message}</Note> : null}
        <View style={styles.gap} />
        <Button kind="plain" label={working ? COPY.paywall.restoring : COPY.paywall.restore} disabled={working} onPress={() => void doRestore()} />
        <Button kind="plain" label={COPY.paywall.notNow} onPress={() => router.back()} />

        <Heading style={styles.legalHead}>{COPY.paywall.title}</Heading>
        {COPY.paywall.terms.map((t) => (
          <Text key={t} style={styles.legal}>{t}</Text>
        ))}
        <View style={styles.links}>
          <Button kind="plain" small label={COPY.paywall.termsLink} onPress={() => void Linking.openURL(TERMS_URL)} />
          <Button kind="plain" small label={COPY.paywall.privacyLink} onPress={() => void Linking.openURL(PRIVACY_URL)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16, paddingBottom: 32 },
  top: { alignItems: "center", marginTop: 4, marginBottom: 12 },
  title: { ...type.screenTitle, textAlign: "center", marginTop: 8 },
  rule: { width: 40, height: 2, backgroundColor: theme.gold, marginTop: 8 },
  lead: { marginBottom: 8 },
  spinner: { marginVertical: 24 },
  card: { marginTop: 12 },
  price: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 24, color: theme.text, marginTop: 4, marginBottom: 12 },
  gap: { height: 8 },
  legalHead: { fontSize: 15 },
  legal: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: theme.muted, marginBottom: 4 },
  links: { flexDirection: "row", flexWrap: "wrap", columnGap: 8 },
});
