import { friendlyError, LLMError } from "@/lib/ai";
import { requirePermission } from "@/lib/auth";
import { one, run, type ZoomRow } from "@/lib/db";
import { runPipeline, type PipelineEvent } from "@/lib/pipeline";
import { transcriptText } from "@/lib/fixtures";
import { demoTranscript } from "@/lib/zoom";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Meeting ended: run the agent on its transcript and stream progress, like a fresh recap. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const { id } = await params;
  const z = await one<ZoomRow>("SELECT * FROM zoom_meetings WHERE id = ?", [id]);
  const transcript = demoTranscript(z?.transcript_key ?? null);
  if (!z || !transcript) return Response.json({ error: "No transcript for this meeting yet" }, { status: 404 });
  // The live call page sends what was actually said (your camera + mic); otherwise use the Zoom transcript.
  const body = (await req.json().catch(() => ({}))) as { lines?: { speaker: string; text: string }[] };
  const spoken = body.lines?.length ? transcriptText(body.lines.map((l, i) => ({ ...l, at: i }))) : null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // If the browser leaves mid-run, keep going and save the meeting; just stop sending progress.
      const emit = (e: PipelineEvent) => { try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} };
      try {
        const heldAt = new Date(z.start_at);
        let meetingId: string;
        try {
          meetingId = await runPipeline(spoken ?? transcript.text, emit, heldAt, "zoom");
        } catch (err) {
          // Free AI quota ran out on a live recording: finish with the meeting's Zoom transcript instead.
          if (!spoken || !(err instanceof LLMError)) throw err;
          meetingId = await runPipeline(transcript.text, emit, heldAt, "zoom");
        }
        await run("UPDATE zoom_meetings SET status = 'processed', meeting_id = ? WHERE id = ?", [meetingId, id]);
      } catch (err) {
        console.error(err);
        emit({ type: "error", message: friendlyError(err) });
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" } });
}
