import { expoClient } from "@better-auth/expo/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const BEARER_KEY = "muvi.bearer_token";

function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (__DEV__) {
    if (Platform.OS === "web") return "http://192.168.1.129:3000";
    const ip = Constants.expoConfig?.hostUri?.split(":")[0] ?? "192.168.1.129";
    return `http://${ip}:3000`;
  }
  return "https://muvie.org";
}

export const BASE_URL = getBaseUrl();

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    // Attach the passkey bearer token on every request so getSession() works
    // after a passkey sign-in (which bypasses the cookie flow).
    onRequest: async (ctx) => {
      if (Platform.OS !== "web") {
        const token = await SecureStore.getItemAsync(BEARER_KEY);
        if (token) {
          ctx.headers.set("Authorization", `Bearer ${token}`);
        }
      }
      return ctx;
    },
  },
  plugins: [
    ...(Platform.OS !== "web"
      ? [
          expoClient({
            scheme: "muvie",
            storagePrefix: "muvie",
            storage: SecureStore,
          }),
        ]
      : []),
    magicLinkClient(),
  ],
});
