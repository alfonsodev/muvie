import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { passkeyStore } from "@/lib/passkey-store";
import { auth } from "@/lib/auth";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

const RP_ID = process.env.PASSKEY_RP_ID ?? "muvie.chat";
const ORIGINS = [
  process.env.PASSKEY_ORIGIN ?? "https://muvie.chat",
  "ios:bundle-id:chat.muvie.app",
];
const CHALLENGE_PREFIX = "login:";

export async function POST(req: Request) {
  const body: AuthenticationResponseJSON & { challengeKey: string } = await req.json();
  const { challengeKey, ...authResponse } = body;

  if (!challengeKey) {
    return Response.json({ error: "challengeKey required" }, { status: 400 });
  }

  const stored = passkeyStore.getChallenge(CHALLENGE_PREFIX + challengeKey);
  if (!stored) return Response.json({ error: "Challenge expired" }, { status: 400 });

  const passkey = passkeyStore.getPasskeyById(authResponse.id);
  if (!passkey) return Response.json({ error: "Passkey not found" }, { status: 404 });

  try {
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.credentialID,
        publicKey: isoBase64URL.toBuffer(passkey.credentialPublicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return Response.json({ error: "Verification failed" }, { status: 400 });
    }

    passkey.counter = verification.authenticationInfo.newCounter;
    passkeyStore.savePasskey(passkey);
    passkeyStore.deleteChallenge(CHALLENGE_PREFIX + challengeKey);

    const ctx = await auth.$context;
    const session = await ctx.internalAdapter.createSession(passkey.userId);

    return Response.json({ verified: true, sessionToken: session.token });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Verification error" },
      { status: 400 }
    );
  }
}
