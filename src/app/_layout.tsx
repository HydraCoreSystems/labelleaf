import {
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { AppStateProvider } from "../state/AppState";
import { COPY } from "../ui/copy";
import { Mark } from "../ui/icons";
import { theme, type } from "../ui/theme";

// Keep the splash up while the fonts load. See the note in RootLayout.
SplashScreen.preventAutoHideAsync().catch(() => {});
const FONT_WAIT_MS = 2500;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // On Android, text that was measured in the system font keeps its old width
  // when a custom font arrives later, and the last letters get clipped. So
  // nothing is drawn until the fonts are ready. The splash covers the wait, and
  // the wait is capped, so a font that never loads cannot trap the app on the
  // splash. If the fonts do arrive after the cap, the navigator is rebuilt
  // (see the key below) so every piece of text is measured again.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), FONT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const ready = loaded || !!error || waited;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <AppStateProvider>
      {ready ? (
        <>
          <StatusBar style="dark" />
          <Stack
            key={loaded ? "fonts" : "system"}
            screenOptions={{
              headerStyle: { backgroundColor: theme.bg },
              headerTintColor: theme.accentDark,
              headerTitleStyle: type.headerTitle,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.bg },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: COPY.queue.title,
                headerLeft: () => (
                  <View style={{ marginLeft: Platform.OS === "web" ? 16 : 0 }}>
                    <Mark size={26} />
                  </View>
                ),
              }}
            />
            <Stack.Screen name="add" options={{ title: COPY.add.titleNew, presentation: "modal" }} />
            <Stack.Screen name="cuttings" options={{ title: COPY.cuttings.title, presentation: "modal" }} />
            <Stack.Screen name="print" options={{ title: COPY.print.title }} />
            <Stack.Screen name="calibrate" options={{ title: COPY.calibrate.title }} />
            <Stack.Screen name="settings" options={{ title: COPY.settings.title }} />
          </Stack>
        </>
      ) : null}
    </AppStateProvider>
  );
}
