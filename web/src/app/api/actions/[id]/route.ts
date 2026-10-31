import { run } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { status } = (await req.json()) as { status: "open" | "done" | "blocked" };
  await run("UPDATE action_items SET status = ? WHERE id = ?", [status, (await params).id]);
  return Response.json({ ok: true });
}
