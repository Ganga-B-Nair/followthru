import { one, type DraftRow } from "@/lib/db";
import { ics } from "@/lib/executors";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const d = await one<DraftRow>("SELECT * FROM drafts WHERE id = ?", [(await params).id]);
  const cal = d ? JSON.parse(d.payload_json).calendar : null;
  if (!cal) return new Response("Not a calendar draft", { status: 404 });
  return new Response(ics(cal), {
    headers: { "Content-Type": "text/calendar", "Content-Disposition": `attachment; filename="followthru-event.ics"` },
  });
}
