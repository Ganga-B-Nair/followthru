import { friendlyError } from "@/lib/ai";
import { canSeeMeeting, requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";
import { runPipeline, type PipelineEvent } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const rows = await all<{ attendees_json: string }>(
    `SELECT m.id, m.title, m.meeting_type, m.held_at, m.summary, m.minutes_saved, m.source, m.attendees_json,
       (SELECT COUNT(*) FROM drafts d WHERE d.meeting_id = m.id AND d.status = 'pending') AS pending
     FROM meetings m ORDER BY m.held_at DESC`,
  );
  const meetings = rows.filter((m) => canSeeMeeting(s, m.attendees_json));
  return Response.json({ meetings });
}

/** Runs the agent pipeline and streams progress as server-sent events. */
export async function POST(req: Request) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const { text, heldAt } = (await req.json()) as { text?: string; heldAt?: string };
  if (!text || text.trim().length < 10) {
    return Response.json({ error: "Say a bit more: the recap is too short." }, { status: 400 });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // If the browser leaves mid-run, keep going and save the meeting; just stop sending progress.
      const emit = (e: PipelineEvent) => { try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} };
      try {
        await runPipeline(text.trim(), emit, heldAt ? new Date(heldAt) : new Date());
      } catch (err) {
        console.error(err);
        emit({ type: "error", message: friendlyError(err) });
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
