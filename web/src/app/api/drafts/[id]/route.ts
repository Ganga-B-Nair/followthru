import { requirePermission } from "@/lib/auth";
import { run } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission("approve_drafts");
  if (s instanceof Response) return s;
  const { id } = await params;
  const body = (await req.json()) as { status?: "pending" | "approved" | "rejected"; payload?: unknown };
  if (body.status && ["pending", "approved", "rejected"].includes(body.status)) {
    await run("UPDATE drafts SET status = ? WHERE id = ? AND status != 'executed'", [body.status, id]);
  }
  if (body.payload) {
    await run("UPDATE drafts SET payload_json = ? WHERE id = ? AND status != 'executed'", [JSON.stringify(body.payload), id]);
  }
  return Response.json({ ok: true });
}
