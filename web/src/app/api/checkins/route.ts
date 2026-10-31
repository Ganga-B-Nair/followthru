import { aiEnabled, nowContext, structured, safe } from "@/lib/ai";
import { all, newId, nowIso, run, type ActionRow } from "@/lib/db";
import { CHECKIN } from "@/lib/prompts";
import { CheckinParse } from "@/lib/schemas";

export const runtime = "nodejs";

/** Voice check-in: parse first, apply only after the person confirms the read-back. */
export const POST = safe(async (req: Request) => {
  const body = (await req.json()) as { person: string; text?: string; updates?: CheckinParse["updates"]; confirm?: boolean };
  if (body.confirm && body.updates) {
    for (const u of body.updates) {
      await run("UPDATE action_items SET status = ?, blocked_reason = ?, due_at = COALESCE(?, due_at) WHERE id = ?",
        [u.status, u.blocked_reason, u.new_due_iso, u.action_id]);
    }
    await run("INSERT INTO checkins (id, person, raw_text, applied_ops_json, created_at) VALUES (?, ?, ?, ?, ?)",
      [newId(), body.person, body.text ?? "", JSON.stringify(body.updates), nowIso()]);
    return Response.json({ ok: true });
  }
  if (!body.text) return Response.json({ error: "Nothing said" }, { status: 400 });
  if (!aiEnabled()) return Response.json({ error: "Check-ins need ANTHROPIC_API_KEY (demo mode is on)." }, { status: 400 });
  const items = await all<ActionRow>("SELECT * FROM action_items WHERE owner = ? COLLATE NOCASE AND status != 'done'", [body.person]);
  if (!items.length) return Response.json({ error: `${body.person} has no open items.` }, { status: 400 });
  const parsed = await structured({
    schema: CheckinParse, system: CHECKIN, effort: "low",
    user: `${nowContext()}\nPerson: ${body.person}\n\n<open_items>\n${items.map((i) => `[${i.id}] ${i.text} (status ${i.status}, due ${i.due_at ?? "none"})`).join("\n")}\n</open_items>\n\n<spoken_update>\n${body.text}\n</spoken_update>`,
  });
  return Response.json(parsed);
});
