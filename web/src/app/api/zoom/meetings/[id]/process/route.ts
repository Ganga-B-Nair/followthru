import { friendlyError } from "@/lib/ai";
import { requirePermission } from "@/lib/auth";
import { one, run, type ZoomRow } from "@/lib/db";
import { runPipeline, type PipelineEvent } from "@/lib/pipeline";
import { demoTranscript } from "@/lib/zoom";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Meeting ended: run the agent on its transcript and stream progress, like a fresh recap. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const { id } = await params;
  const z = await one<ZoomRow>("SELECT * FROM zoom_meetings WHERE id = ?", [id]);
  const transcript = demoTranscript(z?.transcript_key ?? null);
  if (!z || !transcript) return Response.json({ error: "No transcript for this meeting yet" }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: PipelineEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        const meetingId = await runPipeline(transcript.text, emit, new Date(z.start_at), "zoom");
        await run("UPDATE zoom_meetings SET status = 'processed', meeting_id = ? WHERE id = ?", [meetingId, id]);
      } catch (err) {
        console.error(err);
        emit({ type: "error", message: friendlyError(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" } });
}
