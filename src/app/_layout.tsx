import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AppStateProvider } from "../state/AppState";
import { COPY } from "../ui/copy";
import { theme } from "../ui/theme";

export default function RootLayout() {
  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: COPY.queue.title }} />
        <Stack.Screen name="add" options={{ title: COPY.add.titleNew, presentation: "modal" }} />
        <Stack.Screen name="cuttings" options={{ title: COPY.cuttings.title, presentation: "modal" }} />
        <Stack.Screen name="print" options={{ title: COPY.print.title }} />
        <Stack.Screen name="calibrate" options={{ title: COPY.calibrate.title }} />
        <Stack.Screen name="settings" options={{ title: COPY.settings.title }} />
      </Stack>
    </AppStateProvider>
  );
}
