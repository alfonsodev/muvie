/**
 * In-memory passkey store for development.
 * Replace with a real DB (e.g., Prisma) before going to production.
 */

export interface StoredPasskey {
  credentialID: string;
  credentialPublicKey: string; // base64url encoded
  counter: number;
  userId: string;
  deviceType: string;
  backedUp: boolean;
  transports?: AuthenticatorTransport[];
}

export interface StoredChallenge {
  challenge: string;
  userId?: string; // set during authentication flow
  expiresAt: number;
}

// keyed by IP or session token for challenge; keyed by userId for passkeys
const challenges = new Map<string, StoredChallenge>();
const passkeysByUser = new Map<string, StoredPasskey[]>();
const passkeyById = new Map<string, StoredPasskey>();

export const passkeyStore = {
  saveChallenge(key: string, challenge: string, userId?: string) {
    challenges.set(key, {
      challenge,
      userId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
    });
  },

  getChallenge(key: string): StoredChallenge | undefined {
    const entry = challenges.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      challenges.delete(key);
      return undefined;
    }
    return entry;
  },

  deleteChallenge(key: string) {
    challenges.delete(key);
  },

  savePasskey(passkey: StoredPasskey) {
    passkeyById.set(passkey.credentialID, passkey);
    const existing = passkeysByUser.get(passkey.userId) ?? [];
    const idx = existing.findIndex((p) => p.credentialID === passkey.credentialID);
    if (idx >= 0) existing[idx] = passkey;
    else existing.push(passkey);
    passkeysByUser.set(passkey.userId, existing);
  },

  getPasskeyById(id: string): StoredPasskey | undefined {
    return passkeyById.get(id);
  },

  getPasskeysForUser(userId: string): StoredPasskey[] {
    return passkeysByUser.get(userId) ?? [];
  },
};
