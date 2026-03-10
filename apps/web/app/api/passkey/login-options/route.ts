import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { passkeyStore } from "@/lib/passkey-store";

const RP_ID = process.env.PASSKEY_RP_ID ?? "muvie.org";
const CHALLENGE_PREFIX = "login:";

export async function POST(req: Request) {
  const { challengeKey } = (await req.json().catch(() => ({}))) as {
    challengeKey?: string;
  };

  if (!challengeKey) {
    return Response.json({ error: "challengeKey required" }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
  });

  passkeyStore.saveChallenge(CHALLENGE_PREFIX + challengeKey, options.challenge);
  return Response.json(options);
}
