import { one, run, type ConflictRow } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { resolution } = (await req.json()) as { resolution: "supersede" | "keep_both" | "flag" };
  const c = await one<ConflictRow>("SELECT * FROM conflicts WHERE id = ?", [id]);
  if (!c) return Response.json({ error: "Not found" }, { status: 404 });
  await run("UPDATE conflicts SET resolution = ? WHERE id = ?", [resolution, id]);
  if (resolution === "supersede") {
    await run("UPDATE decisions SET status = 'superseded', superseded_by = ? WHERE id = ?", [c.new_decision_id, c.old_decision_id]);
  } else if (resolution === "flag") {
    await run("UPDATE decisions SET status = 'flagged' WHERE id IN (?, ?)", [c.new_decision_id, c.old_decision_id]);
  }
  return Response.json({ ok: true });
}
