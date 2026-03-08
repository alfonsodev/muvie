import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    username: (session.user as Record<string, unknown>).username ?? null,
    avatarSeed: (session.user as Record<string, unknown>).avatarSeed ?? null,
    createdAt: session.user.createdAt,
  });
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { username, avatarSeed } = (await req.json()) as {
    username?: string;
    avatarSeed?: string;
  };

  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return Response.json(
        { error: "Username must be 3–30 characters, letters/numbers/underscores only" },
        { status: 400 }
      );
    }

    const ctx = await auth.$context;
    const db = (
      ctx as unknown as {
        options: { database: { prepare: (s: string) => { get: (v: string) => unknown } } };
      }
    ).options.database;
    const taken = db.prepare("SELECT id FROM user WHERE username = ?").get(username);
    if (taken && (taken as { id: string }).id !== session.user.id) {
      return Response.json({ error: "Username already taken" }, { status: 409 });
    }
  }

  await auth.api.updateUser({
    headers: req.headers,
    body: {
      ...(username !== undefined && { username }),
      ...(avatarSeed !== undefined && { avatarSeed }),
    },
  });

  return Response.json({ ok: true });
}

export async function HEAD() {
  const ctx = await auth.$context;
  const db = (
    ctx as unknown as {
      options: { database: { prepare: (s: string) => { get: () => { count: number } } } };
    }
  ).options.database;
  const { count } = db.prepare("SELECT COUNT(*) as count FROM user").get();
  return new Response(null, { headers: { "X-User-Count": String(count) } });
}
