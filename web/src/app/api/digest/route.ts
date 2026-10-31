import { aiEnabled, nowContext, structured, safe } from "@/lib/ai";
import { all, one, type ActionRow, type PersonRow } from "@/lib/db";
import { gmailUrl } from "@/lib/executors";
import { DIGEST } from "@/lib/prompts";
import { Markdown } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = safe(async (req: Request) => {
  const person = new URL(req.url).searchParams.get("person");
  if (!person) return Response.json({ error: "person required" }, { status: 400 });
  const items = await all<ActionRow & { meeting_title: string }>(
    `SELECT a.*, m.title AS meeting_title FROM action_items a JOIN meetings m ON m.id = a.meeting_id WHERE a.owner = ? COLLATE NOCASE ORDER BY a.due_at`,
    [person],
  );
  const decisions = await all<{ text: string; meeting: string }>(
    `SELECT DISTINCT d.text, m.title AS meeting FROM decisions d JOIN meetings m ON m.id = d.meeting_id
     WHERE m.attendees_json LIKE ? AND m.held_at > datetime('now', '-7 days') AND d.status != 'superseded'`,
    [`%${person}%`],
  );
  let markdown: string;
  if (aiEnabled()) {
    ({ markdown } = await structured({
      schema: Markdown, system: DIGEST, effort: "low",
      user: `${nowContext()}\nPerson: ${person}\n\n<action_items>\n${items.map((i) => `- [${i.status}] ${i.text} (due ${i.due_at ?? "none"}; from ${i.meeting_title}${i.blocked_reason ? `; blocked: ${i.blocked_reason}` : ""})`).join("\n")}\n</action_items>\n\n<decisions>\n${decisions.map((d) => `- ${d.text} (${d.meeting})`).join("\n")}\n</decisions>`,
    }));
  } else {
    markdown = [`## Weekly digest for ${person}`, "", "### Still on you", ...items.filter((i) => i.status !== "done").map((i) => `- ${i.text}`), "", "### Done", ...items.filter((i) => i.status === "done").map((i) => `- ${i.text}`)].join("\n");
  }
  const p = await one<PersonRow>("SELECT * FROM people WHERE name = ?", [person]);
  const emailUrl = gmailUrl({ to: p?.email ? [p.email] : [], subject: `Your FollowThru weekly digest`, body: markdown.replace(/[#*]/g, "") });
  return Response.json({ markdown, emailUrl });
});
