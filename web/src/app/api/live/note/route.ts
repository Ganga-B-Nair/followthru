import { aiEnabled, safe, structured } from "@/lib/ai";
import { requirePermission } from "@/lib/auth";
import { LIVE_NOTE } from "@/lib/prompts";
import { LiveNote } from "@/lib/schemas";

export const runtime = "nodejs";

/** Live notetaking: one utterance in, one note out, while the call is still going. */
export const POST = safe(async (req: Request) => {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const { speaker, text, context } = (await req.json()) as { speaker: string; text: string; context?: string[] };
  if (!aiEnabled()) return Response.json(ruleNote(text));
  const note = await structured({
    schema: LiveNote, system: LIVE_NOTE, effort: "low", fast: true, maxTokens: 400, timeoutMs: 6000,
    user: `<earlier_lines>\n${(context ?? []).slice(-8).join("\n")}\n</earlier_lines>\n\n<latest speaker="${speaker}">\n${text}\n</latest>`,
  });
  return Response.json(note);
});

/** Demo mode without a key: keyword rules are enough to light up the notes panel. */
function ruleNote(text: string): LiveNote {
  const t = text.toLowerCase();
  if (/\b(actually|no wait|i mean|make it)\b/.test(t)) return { tag: "correction", note: text };
  if (/\b(i'll|i will|can you|let's book|please)\b/.test(t)) return { tag: "action", note: text };
  if (/\b(let's|we should|decided|agreed|it is)\b/.test(t)) return { tag: "decision", note: text };
  return { tag: "none", note: text };
}
