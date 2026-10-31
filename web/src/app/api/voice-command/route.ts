import { aiEnabled, nowContext, structured, safe } from "@/lib/ai";
import { all, type DraftRow } from "@/lib/db";
import { VOICE_COMMAND } from "@/lib/prompts";
import { applyOps, executeApproved, queueSummary } from "@/lib/queue";
import { requirePermission } from "@/lib/auth";
import { VoiceCommand } from "@/lib/schemas";

export const runtime = "nodejs";

/**
 * Two-step: {meetingId, text} returns the parsed ops plus a read-back for the user to confirm.
 * {meetingId, ops, confirm: true} applies them and ships whatever is now approved.
 */
export const POST = safe(async (req: Request) => {
  const s = await requirePermission("approve_drafts");
  if (s instanceof Response) return s;
  const body = (await req.json()) as { meetingId: string; text?: string; ops?: VoiceCommand["ops"]; confirm?: boolean };
  if (body.confirm && body.ops) {
    await applyOps(body.ops);
    const approved = await all<DraftRow>("SELECT id FROM drafts WHERE meeting_id = ? AND status = 'approved'", [body.meetingId]);
    const results = await executeApproved(approved.map((d) => d.id));
    return Response.json({ results });
  }
  if (!body.text) return Response.json({ error: "No command" }, { status: 400 });
  if (!aiEnabled()) {
    return Response.json({ error: "Voice commands need ANTHROPIC_API_KEY (demo mode is on)." }, { status: 400 });
  }
  const queue = await queueSummary(body.meetingId);
  const parsed = await structured({
    schema: VoiceCommand, system: VOICE_COMMAND, effort: "low",
    user: `${nowContext()}\n\n<queue>\n${queue.join("\n")}\n</queue>\n\n<spoken_instruction>\n${body.text}\n</spoken_instruction>`,
  });
  return Response.json(parsed);
});
