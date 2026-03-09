import { auth } from "@/lib/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/user-profile";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const profile = getUserProfile(session.user.id);
  return Response.json(profile ?? { empty: true });
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const fields = (await req.json()) as Parameters<typeof upsertUserProfile>[1];
  upsertUserProfile(session.user.id, fields);
  return Response.json({ ok: true });
}
