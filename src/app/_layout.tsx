import {
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform, View } from "react-native";
import { AppStateProvider } from "../state/AppState";
import { COPY } from "../ui/copy";
import { Mark } from "../ui/icons";
import { theme, type } from "../ui/theme";

export default function RootLayout() {
  // The fonts load in the background. Screens render at once in the system
  // font and switch over when the faces arrive, so nothing waits on them.
  useFonts({
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.accentDark,
          headerTitleStyle: type.headerTitle,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: COPY.queue.title, headerLeft: () => (
              <View style={{ marginLeft: Platform.OS === "web" ? 16 : 0 }}>
                <Mark size={26} />
              </View>
            ) }} />
        <Stack.Screen name="add" options={{ title: COPY.add.titleNew, presentation: "modal" }} />
        <Stack.Screen name="cuttings" options={{ title: COPY.cuttings.title, presentation: "modal" }} />
        <Stack.Screen name="print" options={{ title: COPY.print.title }} />
        <Stack.Screen name="calibrate" options={{ title: COPY.calibrate.title }} />
        <Stack.Screen name="settings" options={{ title: COPY.settings.title }} />
      </Stack>
    </AppStateProvider>
  );
}
