import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { passkeyStore } from "@/lib/passkey-store";
import { auth } from "@/lib/auth";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

const RP_ID = process.env.PASSKEY_RP_ID ?? "muvie.chat";
const ORIGINS = [
  process.env.PASSKEY_ORIGIN ?? "https://muvie.chat",
  "ios:bundle-id:chat.muvie.app",
];

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user;
  const stored = passkeyStore.getChallenge(user.id);
  if (!stored) return Response.json({ error: "Challenge expired" }, { status: 400 });

  const body: RegistrationResponseJSON = await req.json();

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return Response.json({ error: "Verification failed" }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    passkeyStore.savePasskey({
      credentialID: credential.id,
      credentialPublicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      userId: user.id,
      deviceType: verification.registrationInfo.credentialDeviceType,
      backedUp: verification.registrationInfo.credentialBackedUp,
      transports: body.response.transports as AuthenticatorTransport[],
    });

    passkeyStore.deleteChallenge(user.id);
    return Response.json({ verified: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Verification error" },
      { status: 400 }
    );
  }
}
