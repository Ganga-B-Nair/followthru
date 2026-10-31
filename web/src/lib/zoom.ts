import crypto from "node:crypto";
import { SPRINT_TRANSCRIPT, transcriptText, type TranscriptLine } from "./fixtures";

// Zoom integration. FollowThru never replaces Zoom: it listens for Zoom's webhooks, pulls the
// cloud-recording transcript (WebVTT, with speaker names) when a meeting ends, and runs the agent.

const SECRET = () => process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "";

/** Zoom's endpoint check: echo plainToken with its HMAC-SHA256 under the webhook secret. */
export function urlValidation(plainToken: string) {
  return { plainToken, encryptedToken: crypto.createHmac("sha256", SECRET()).update(plainToken).digest("hex") };
}

/** Verify x-zm-signature = v0=HMAC(secret, "v0:{timestamp}:{body}"). */
export function verifySignature(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  if (!SECRET() || !timestamp || !signature) return false;
  const expected = `v0=${crypto.createHmac("sha256", SECRET()).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** WebVTT from Zoom ("Priya Nair: text" cues) → "Speaker: text" lines, merging consecutive cues per speaker. */
export function parseVtt(vtt: string): string {
  const lines: { speaker: string; text: string }[] = [];
  for (const block of vtt.replace(/\r/g, "").split("\n\n")) {
    const cue = block.split("\n").filter((l) => l && !/^WEBVTT/.test(l) && !/^\d+$/.test(l) && !/-->/.test(l)).join(" ");
    if (!cue) continue;
    const m = cue.match(/^([^:]{1,60}):\s*(.*)$/);
    const speaker = m ? m[1].trim() : "Unknown speaker";
    const text = (m ? m[2] : cue).trim();
    const last = lines[lines.length - 1];
    if (last && last.speaker === speaker) last.text += ` ${text}`;
    else lines.push({ speaker, text });
  }
  return lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
}

/** Demo transcripts for meetings in the seeded Zoom calendar. */
export const DEMO_TRANSCRIPTS: Record<string, TranscriptLine[]> = { sprint14: SPRINT_TRANSCRIPT };

export function demoTranscript(key: string | null): { lines: TranscriptLine[]; text: string } | null {
  const lines = key ? DEMO_TRANSCRIPTS[key] : null;
  return lines ? { lines, text: transcriptText(lines) } : null;
}
