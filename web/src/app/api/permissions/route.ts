import { listUsers, memberPermissions, PERMISSIONS, requirePermission, saveMemberPermissions, type PermissionMap } from "@/lib/auth";
import { run } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  return Response.json({ catalog: PERMISSIONS, member: await memberPermissions(), users: await listUsers(), canEdit: s.user.role === "lead" });
}

/** Team lead only: change what members can see, or change someone's role. */
export async function PUT(req: Request) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  if (s.user.role !== "lead") return Response.json({ error: "Only the team lead can change permissions." }, { status: 403 });
  const body = (await req.json()) as { member?: Partial<PermissionMap>; role?: { userId: string; role: "lead" | "member" } };
  if (body.role && body.role.userId !== s.user.id) {
    await run("UPDATE users SET role = ? WHERE id = ?", [body.role.role, body.role.userId]);
  }
  const member = body.member ? await saveMemberPermissions(body.member) : await memberPermissions();
  return Response.json({ member, users: await listUsers() });
}
