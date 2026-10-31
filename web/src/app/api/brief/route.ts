import { aiEnabled, nowContext, structured, safe } from "@/lib/ai";
import { all, one, type MeetingRow } from "@/lib/db";
import { BRIEF } from "@/lib/prompts";
import { Markdown } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Open-Loop Brief: the agenda for the next meeting with the same people. */
export const GET = safe(async (req: Request) => {
  const meetingId = new URL(req.url).searchParams.get("meetingId");
  const meeting = meetingId ? await one<MeetingRow>("SELECT * FROM meetings WHERE id = ?", [meetingId]) : null;
  const names: string[] = meeting ? JSON.parse(meeting.attendees_json).map((a: { name: string }) => a.name) : [];
  const ownerFilter = names.length ? `AND a.owner IN (${names.map(() => "?").join(",")})` : "";

  const items = await all<{ text: string; owner: string; due_at: string | null; status: string; blocked_reason: string | null; meeting: string }>(
    `SELECT a.text, a.owner, a.due_at, a.status, a.blocked_reason, m.title AS meeting FROM action_items a JOIN meetings m ON m.id = a.meeting_id
     WHERE a.status != 'done' ${ownerFilter} ORDER BY a.due_at`, names,
  );
  const conflicts = await all<{ explanation: string; resolution: string | null }>(
    "SELECT explanation, resolution FROM conflicts WHERE kind = 'contradicts' AND (resolution IS NULL OR resolution = 'flag')",
  );
  const decisions = await all<{ text: string; status: string; meeting: string }>(
    `SELECT d.text, d.status, m.title AS meeting FROM decisions d JOIN meetings m ON m.id = d.meeting_id
     WHERE d.status != 'superseded' ORDER BY m.held_at DESC LIMIT 25`,
  );
  const title = meeting ? `Next meeting after "${meeting.title}"` : "Your next meeting";

  if (!aiEnabled()) {
    const md = [`## ${title}`, "", "### Unresolved conflicts", ...conflicts.map((c) => `- ${c.explanation}`), "", "### Open items", ...items.map((i) => `- ${i.text} (${i.owner ?? "?"}, ${i.status})`)].join("\n");
    return Response.json({ markdown: md, title });
  }
  const { markdown } = await structured({
    schema: Markdown, system: BRIEF, effort: "medium",
    user: `${nowContext()}\n${title}. Attendees: ${names.join(", ") || "everyone"}\n\n<open_items>\n${items.map((i) => `- [${i.status}] ${i.text} | owner ${i.owner ?? "?"} | due ${i.due_at ?? "none"}${i.blocked_reason ? ` | blocked: ${i.blocked_reason}` : ""} | from ${i.meeting}`).join("\n")}\n</open_items>\n\n<unresolved_conflicts>\n${conflicts.map((c) => `- ${c.explanation}`).join("\n") || "none"}\n</unresolved_conflicts>\n\n<recent_decisions>\n${decisions.map((d) => `- [${d.status}] ${d.text} (${d.meeting})`).join("\n")}\n</recent_decisions>`,
  });
  return Response.json({ markdown, title });
});
