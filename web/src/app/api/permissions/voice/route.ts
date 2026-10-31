import { z } from "zod";
import { aiEnabled, safe, structured } from "@/lib/ai";
import { memberPermissions, PERMISSIONS, requirePermission, type Permission } from "@/lib/auth";

export const runtime = "nodejs";

const Changes = z.object({
  changes: z.array(z.object({ key: z.enum(PERMISSIONS.map((p) => p.key) as [Permission, ...Permission[]]), allow: z.boolean() })),
  confirm_text: z.string(),
});

const SYSTEM = `You turn a team lead's spoken instruction about what team members may see or do into permission changes.
The instruction was dictated with Wispr Flow; ignore fillers, and in self-corrections the later statement wins.
Only change permissions the lead clearly mentioned. confirm_text reads the changes back in one sentence.`;

// Keyword fallback for demo mode (no AI key).
const KEYWORDS: [Permission, RegExp][] = [
  ["view_all_meetings", /(all|every|other).{0,20}meeting|meeting notes/],
  ["view_decisions", /decision/],
  ["view_conflicts", /conflict/],
  ["view_team_tasks", /(team|teammates|other|each other'?s|everyone'?s).{0,15}tasks?|tasks/],
  ["approve_drafts", /approve|ship|send/],
  ["use_ask", /\bask\b|memory agent|question/],
  ["view_insights", /insight|analytics|stats|time saved/],
  ["manage_integrations", /integration|connection|connect/],
];

/** A lead dictates "let members see decisions but not each other's tasks" → proposed toggles to confirm. */
export const POST = safe(async (req: Request) => {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  if (s.user.role !== "lead") return Response.json({ error: "Only the team lead can change permissions." }, { status: 403 });
  const { text } = (await req.json()) as { text: string };
  const current = await memberPermissions();

  if (aiEnabled()) {
    const out = await structured({
      schema: Changes, system: SYSTEM, effort: "low",
      user: `<current_member_permissions>\n${PERMISSIONS.map((p) => `${p.key} (${p.label}): ${current[p.key] ? "allowed" : "not allowed"}`).join("\n")}\n</current_member_permissions>\n\n<spoken_instruction>\n${text}\n</spoken_instruction>`,
    });
    return Response.json(out);
  }

  // Split into clauses; a "not/can't/hide/don't" in the clause means deny.
  const changes: { key: Permission; allow: boolean }[] = [];
  for (const clause of text.toLowerCase().split(/[,.;]| but | and /)) {
    const deny = /\b(not|n't|no|hide|stop|without|block)\b/.test(clause);
    for (const [key, re] of KEYWORDS) {
      if (re.test(clause) && !changes.some((c) => c.key === key)) { changes.push({ key, allow: !deny }); break; }
    }
  }
  const label = (k: Permission) => PERMISSIONS.find((p) => p.key === k)!.label.toLowerCase();
  const confirm_text = changes.length
    ? `Members will ${changes.map((c) => `${c.allow ? "" : "no longer "}${label(c.key)}`).join(", and ")}.`
    : "I couldn't match that to a permission. Try naming it, like \"meeting notes\", \"decisions\" or \"teammates' tasks\".";
  return Response.json({ changes, confirm_text });
});
