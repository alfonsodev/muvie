import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { authClient, BEARER_KEY } from "@/lib/auth-client";

/**
 * Handles muvie://callback?token=SESSION_TOKEN
 * deep-link from the magic-link app-callback web page.
 */
export default function CallbackScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!token || Platform.OS === "web") {
      router.replace("/(auth)/sign-in");
      return;
    }

    (async () => {
      try {
        const SecureStore = await import("expo-secure-store");
        await SecureStore.setItemAsync(BEARER_KEY, token);
        await authClient.getSession();
        // _layout.tsx will redirect to (tabs) once session is set
      } catch {
        router.replace("/(auth)/sign-in");
      }
    })();
  }, [token]);

  return <View style={{ flex: 1, backgroundColor: "#121212" }} />;
}
