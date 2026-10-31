import { requirePermission } from "@/lib/auth";
import { one, run, type ZoomRow } from "@/lib/db";
import { demoTranscript } from "@/lib/zoom";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const z = await one<ZoomRow>("SELECT * FROM zoom_meetings WHERE id = ?", [(await params).id]);
  if (!z) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ meeting: z, transcript: demoTranscript(z.transcript_key)?.lines ?? [] });
}

/** Toggle whether the AI notetaker joins this meeting. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const { notetaker } = (await req.json()) as { notetaker: boolean };
  await run("UPDATE zoom_meetings SET notetaker = ? WHERE id = ?", [notetaker ? 1 : 0, (await params).id]);
  return Response.json({ ok: true });
}
