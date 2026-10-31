import { cookies } from "next/headers";
import { DEMO_USERS, ensureUsers, SESSION_COOKIE, session } from "@/lib/auth";
import { modelName, provider } from "@/lib/ai";
import { one } from "@/lib/db";
import { POST as seed } from "../seed/route";

export const runtime = "nodejs";

export async function GET() {
  const s = await session();
  return Response.json({ user: s?.user ?? null, perms: s?.perms ?? null, ai: { provider: provider(), model: modelName() }, demoUsers: DEMO_USERS });
}

/** Demo sign-in: choose one of the demo accounts. */
export async function POST(req: Request) {
  const { userId } = (await req.json()) as { userId: string };
  if (!DEMO_USERS.some((u) => u.id === userId)) return Response.json({ error: "Unknown demo user" }, { status: 400 });
  await ensureUsers();
  // First sign-in on an empty database loads the demo workspace.
  const z = await one<{ n: number }>("SELECT COUNT(*) AS n FROM zoom_meetings");
  if (!z?.n) await seed(new Request("http://local/seed", { method: "POST", body: "{}" }));
  (await cookies()).set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
