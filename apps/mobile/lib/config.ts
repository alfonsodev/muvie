import Constants from "expo-constants";
import { Platform } from "react-native";
import { z } from "zod";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getExpoHost(): string | null {
  const configHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (configHost) return configHost;

  const expoGoHost = Constants.expoGoConfig?.debuggerHost?.split(":")[0];
  if (expoGoHost) return expoGoHost;

  const manifest2 = (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2;
  const manifest2Host = manifest2?.extra?.expoClient?.hostUri?.split(":")[0];
  if (manifest2Host) return manifest2Host;

  return null;
}

function getDevApiDefault(): string {
  if (Platform.OS === "web") return "http://localhost:3000";
  const host = getExpoHost();
  if (host) return `http://${host}:3000`;
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return "http://localhost:3000";
}

function getRawConfig() {
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (__DEV__ ? getDevApiDefault() : "https://muvie.org");

  const authBaseUrl = process.env.EXPO_PUBLIC_AUTH_URL ?? apiBaseUrl;
  const deepLinkScheme =
    process.env.EXPO_PUBLIC_DEEP_LINK_SCHEME ??
    (Constants.expoConfig?.scheme as string | undefined) ??
    "muvie";

  return {
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? "development" : "production"),
    apiBaseUrl,
    authBaseUrl,
    deepLinkScheme,
  };
}

const AppConfigSchema = z.object({
  appEnv: z.enum(["development", "staging", "production"]),
  apiBaseUrl: z.string().url().transform(stripTrailingSlash),
  authBaseUrl: z.string().url().transform(stripTrailingSlash),
  deepLinkScheme: z.string().min(1),
});

const parsed = AppConfigSchema.safeParse(getRawConfig());
if (!parsed.success) {
  throw new Error(`Invalid mobile configuration: ${parsed.error.message}`);
}

export const AppConfig = parsed.data;
export type AppConfigShape = z.infer<typeof AppConfigSchema>;
