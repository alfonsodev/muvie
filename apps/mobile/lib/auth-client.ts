import { expoClient } from "@better-auth/expo/client";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { AppConfig } from "@/lib/config";

export const BEARER_KEY = "muvi.bearer_token";

export const authClient = createAuthClient({
  baseURL: AppConfig.authBaseUrl,
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
            scheme: AppConfig.deepLinkScheme,
            storagePrefix: "muvie",
            storage: SecureStore,
          }),
        ]
      : []),
    magicLinkClient(),
  ],
});
