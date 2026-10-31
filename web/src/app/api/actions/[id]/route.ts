import { ownsItem, requirePermission } from "@/lib/auth";
import { one, run, type ActionRow } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const { status } = (await req.json()) as { status: "open" | "done" | "blocked" };
  const item = await one<ActionRow>("SELECT * FROM action_items WHERE id = ?", [(await params).id]);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  if (!ownsItem(s, item.owner)) return Response.json({ error: `Only ${item.owner ?? "the owner"} can update this item.` }, { status: 403 });
  await run("UPDATE action_items SET status = ? WHERE id = ?", [status, item.id]);
  return Response.json({ ok: true });
}
