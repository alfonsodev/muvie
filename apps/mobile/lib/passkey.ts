import type { PasskeyError } from "react-native-passkey";
import { Platform } from "react-native";
import { AppConfig } from "@/lib/config";

// react-native-passkey is iOS-only — never import it on web
const Passkey: typeof import("react-native-passkey").Passkey | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Platform.OS === "ios" ? require("react-native-passkey").Passkey : null;

async function apiFetch(path: string, body: object, headers?: HeadersInit) {
  const res = await fetch(`${AppConfig.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
  return data;
}

/**
 * Register a new passkey for the currently signed-in user.
 * The caller must pass the current session token as a Bearer header.
 */
export async function registerPasskey(sessionToken: string): Promise<void> {
  if (Platform.OS !== "ios") throw new Error("Passkeys are only supported on iOS");

  const authHeaders = { Authorization: `Bearer ${sessionToken}` };

  const options = await apiFetch("/api/passkey/register-options", {}, authHeaders);
  const credential = await Passkey!.create(options);
  await apiFetch("/api/passkey/register-verify", credential, authHeaders);
}

/**
 * Sign in with a passkey — no prior session required.
 * Returns a Better Auth session token to persist in SecureStore.
 */
export async function signInWithPasskey(): Promise<{ sessionToken: string }> {
  if (Platform.OS !== "ios") throw new Error("Passkeys are only supported on iOS");

  const challengeKey = Math.random().toString(36).slice(2);

  const options = await apiFetch("/api/passkey/login-options", { challengeKey });
  const credential = await Passkey!.get(options);
  return apiFetch("/api/passkey/login-verify", { ...credential, challengeKey }) as Promise<{
    sessionToken: string;
  }>;
}

export function isPasskeySupported(): boolean {
  return Platform.OS === "ios" && Passkey !== null && Passkey.isSupported();
}

/** Returns true when the user dismissed the passkey sheet without authenticating. */
export function isUserCancelledError(err: unknown): boolean {
  return (err as PasskeyError)?.error === "UserCancelled";
}
