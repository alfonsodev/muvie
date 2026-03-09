import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS passkey (
    credential_id         TEXT PRIMARY KEY,
    credential_public_key TEXT NOT NULL,
    counter               INTEGER NOT NULL DEFAULT 0,
    user_id               TEXT NOT NULL,
    device_type           TEXT NOT NULL,
    backed_up             INTEGER NOT NULL DEFAULT 0,
    transports            TEXT,
    created_at            INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS passkey_challenge (
    key        TEXT PRIMARY KEY,
    challenge  TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

export interface StoredPasskey {
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
  userId: string;
  deviceType: string;
  backedUp: boolean;
  transports?: AuthenticatorTransport[];
}

type RawPasskey = {
  credential_id: string;
  credential_public_key: string;
  counter: number;
  user_id: string;
  device_type: string;
  backed_up: number;
  transports: string | null;
};

function rowToPasskey(row: RawPasskey): StoredPasskey {
  return {
    credentialID: row.credential_id,
    credentialPublicKey: row.credential_public_key,
    counter: row.counter,
    userId: row.user_id,
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    transports: row.transports ? JSON.parse(row.transports) : undefined,
  };
}

export interface StoredChallenge {
  challenge: string;
  expiresAt: number;
}

export const passkeyStore = {
  saveChallenge(key: string, challenge: string) {
    const expiresAt = Date.now() + 5 * 60 * 1000;
    db.prepare(`
      INSERT INTO passkey_challenge (key, challenge, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET challenge = excluded.challenge, expires_at = excluded.expires_at
    `).run(key, challenge, expiresAt);
  },

  getChallenge(key: string): StoredChallenge | undefined {
    const row = db
      .prepare(`SELECT challenge, expires_at FROM passkey_challenge WHERE key = ?`)
      .get(key) as { challenge: string; expires_at: number } | undefined;
    if (!row) return undefined;
    if (Date.now() > row.expires_at) {
      db.prepare(`DELETE FROM passkey_challenge WHERE key = ?`).run(key);
      return undefined;
    }
    return { challenge: row.challenge, expiresAt: row.expires_at };
  },

  deleteChallenge(key: string) {
    db.prepare(`DELETE FROM passkey_challenge WHERE key = ?`).run(key);
  },

  savePasskey(passkey: StoredPasskey) {
    db.prepare(`
      INSERT INTO passkey (credential_id, credential_public_key, counter, user_id, device_type, backed_up, transports)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(credential_id) DO UPDATE SET
        counter    = excluded.counter,
        backed_up  = excluded.backed_up,
        transports = excluded.transports
    `).run(
      passkey.credentialID,
      passkey.credentialPublicKey,
      passkey.counter,
      passkey.userId,
      passkey.deviceType,
      passkey.backedUp ? 1 : 0,
      passkey.transports ? JSON.stringify(passkey.transports) : null
    );
  },

  getPasskeyById(id: string): StoredPasskey | undefined {
    const row = db
      .prepare(`SELECT * FROM passkey WHERE credential_id = ?`)
      .get(id) as RawPasskey | undefined;
    return row ? rowToPasskey(row) : undefined;
  },

  getPasskeysForUser(userId: string): StoredPasskey[] {
    const rows = db
      .prepare(`SELECT * FROM passkey WHERE user_id = ?`)
      .all(userId) as RawPasskey[];
    return rows.map(rowToPasskey);
  },
};
