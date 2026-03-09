import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Linking, Platform } from "react-native";
import * as ExpoLinking from "expo-linking";
import "react-native-reanimated";
import { authClient, BEARER_KEY } from "@/lib/auth-client";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

async function handleDeepLink(url: string | null) {
  if (!url || Platform.OS === "web") return;
  try {
    const parsed = ExpoLinking.parse(url);
    // muvie://callback?token=SESSION_TOKEN  (from magic-link app-callback page)
    if (parsed.hostname === "callback" && parsed.queryParams?.token) {
      const token = parsed.queryParams.token as string;
      const SecureStore = await import("expo-secure-store");
      await SecureStore.setItemAsync(BEARER_KEY, token);
      // Re-fetch session — onRequest hook will attach the bearer token
      await authClient.getSession();
    }
  } catch {
    // Ignore malformed URLs
  }
}

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const splashHidden = useRef(false);

  useEffect(() => {
    // Handle deep link when app was closed
    Linking.getInitialURL().then(handleDeepLink);
    // Handle deep link while app is open
    const sub = Linking.addEventListener("url", ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

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
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      {!isAuthenticated && <Redirect href="/(auth)/sign-in" />}
      {needsOnboarding && <Redirect href="/(auth)/onboarding" />}
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
