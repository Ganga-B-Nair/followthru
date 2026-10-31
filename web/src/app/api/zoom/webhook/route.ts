import { newId, nowIso, run } from "@/lib/db";
import { runPipeline } from "@/lib/pipeline";
import { parseVtt, urlValidation, verifySignature } from "@/lib/zoom";

export const runtime = "nodejs";
export const maxDuration = 120;

type ZoomEvent = {
  event: string;
  download_token?: string;
  payload: {
    plainToken?: string;
    object?: {
      id?: number | string; uuid?: string; topic?: string; start_time?: string; duration?: number; host_email?: string;
      recording_files?: { file_type: string; download_url: string }[];
    };
  };
};

/**
 * Zoom → FollowThru. Subscribe this URL in a Zoom Marketplace app with events:
 * endpoint.url_validation, meeting.started, meeting.ended, recording.transcript_completed.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const body = JSON.parse(raw) as ZoomEvent;

  if (body.event === "endpoint.url_validation" && body.payload.plainToken) {
    return Response.json(urlValidation(body.payload.plainToken));
  }
  if (!verifySignature(raw, req.headers.get("x-zm-request-timestamp"), req.headers.get("x-zm-signature"))) {
    return Response.json({ error: "Bad signature" }, { status: 401 });
  }

  const o = body.payload.object ?? {};
  const zoomId = String(o.id ?? o.uuid ?? newId());

  if (body.event === "meeting.started" || body.event === "meeting.ended") {
    await run(
      `INSERT INTO zoom_meetings (id, topic, start_at, duration, host, participants_json, status) VALUES (?, ?, ?, ?, ?, '[]', ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status`,
      [zoomId, o.topic ?? "Zoom meeting", o.start_time ?? nowIso(), o.duration ?? 30, o.host_email ?? "", body.event === "meeting.started" ? "live" : "ended"],
    );
  }

  if (body.event === "recording.transcript_completed") {
    const file = o.recording_files?.find((f) => f.file_type === "TRANSCRIPT");
    if (file) {
      const url = body.download_token ? `${file.download_url}?access_token=${body.download_token}` : file.download_url;
      const vtt = await fetch(url).then((r) => r.text());
      const transcript = parseVtt(vtt);
      // Acknowledge Zoom quickly; the agent runs after the response.
      void runPipeline(transcript, () => {}, o.start_time ? new Date(o.start_time) : new Date(), "zoom").then((meetingId) =>
        run(
          `INSERT INTO zoom_meetings (id, topic, start_at, duration, host, participants_json, status, meeting_id) VALUES (?, ?, ?, ?, ?, '[]', 'processed', ?)
           ON CONFLICT(id) DO UPDATE SET status = 'processed', meeting_id = excluded.meeting_id`,
          [zoomId, o.topic ?? "Zoom meeting", o.start_time ?? nowIso(), o.duration ?? 30, o.host_email ?? "", meetingId],
        ),
      ).catch((err) => console.error("Zoom transcript processing failed", err));
    }
  }
  return Response.json({ ok: true });
}
