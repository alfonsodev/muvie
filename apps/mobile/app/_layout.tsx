import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import "react-native-reanimated";
import { authClient, BEARER_KEY } from "@/lib/auth-client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const splashHidden = useRef(false);

  // Persist the session token so manual fetch() calls can authenticate.
  // Passkey sign-in sets this explicitly, but Google/magic-link flows don't —
  // the expoClient plugin manages cookies instead. This syncs the two.
  useEffect(() => {
    if (session?.session?.token && Platform.OS !== "web") {
      SecureStore.setItemAsync(BEARER_KEY, session.session.token);
    }
  }, [session?.session?.token]);

  useEffect(() => {
    if (!isPending && !splashHidden.current) {
      const timer = setTimeout(() => {
        splashHidden.current = true;
        SplashScreen.hideAsync();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isPending]);

  if (isPending) return null;

  const user = session?.user as (Record<string, unknown> & { username?: string | null }) | undefined;
  const isAuthenticated = !!user;
  const needsOnboarding = isAuthenticated && !user?.username;

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="callback" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        <Stack.Screen
          name="chat"
          options={{
            presentation: Platform.OS === "ios" ? "formSheet" : "modal",
            headerShown: false,
            ...(Platform.OS === "ios"
              ? {
                  sheetGrabberVisible: true,
                  sheetCornerRadius: 20,
                }
              : null),
          }}
        />
      </Stack>
      {!isAuthenticated && <Redirect href="/(auth)/sign-in" />}
      {needsOnboarding && <Redirect href="/(auth)/onboarding" />}
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
