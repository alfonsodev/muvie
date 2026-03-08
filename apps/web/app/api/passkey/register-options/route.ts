import { generateRegistrationOptions } from "@simplewebauthn/server";
import { passkeyStore } from "@/lib/passkey-store";
import { auth } from "@/lib/auth";

const RP_ID = process.env.PASSKEY_RP_ID ?? "muvie.chat";
const RP_NAME = "Muvi";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user;
  const existingPasskeys = passkeyStore.getPasskeysForUser(user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((p) => ({
      id: p.credentialID,
      transports: p.transports,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
  });

  passkeyStore.saveChallenge(user.id, options.challenge);
  return Response.json(options);
}
