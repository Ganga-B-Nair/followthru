import { canSeeMeeting, requirePermission } from "@/lib/auth";
import { all, one, type ZoomRow } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const me = s.user.person;

  const meetings = (await all<{ id: string; title: string; meeting_type: string; held_at: string; summary: string; minutes_saved: number; source: string; attendees_json: string }>(
    "SELECT id, title, meeting_type, held_at, summary, minutes_saved, source, attendees_json FROM meetings ORDER BY held_at DESC",
  )).filter((m) => canSeeMeeting(s, m.attendees_json));

  const zoom = (await all<ZoomRow>("SELECT * FROM zoom_meetings WHERE status IN ('live', 'scheduled', 'ended') ORDER BY CASE status WHEN 'live' THEN 0 ELSE 1 END, start_at"))
    .filter((z) => s.perms.view_all_meetings || JSON.parse(z.participants_json).some((p: string) => p.toLowerCase().startsWith(me.toLowerCase())));

  const minutes = meetings.reduce((a, m) => a + (m.minutes_saved ?? 0), 0);
  const shipped = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM drafts WHERE status = 'executed'"))?.n ?? 0;
  const conflicts = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM conflicts WHERE kind = 'contradicts'"))?.n ?? 0;

  const openItems = await all<{ id: string; text: string; owner: string | null; due_at: string | null; status: string; meeting_title: string }>(
    `SELECT a.id, a.text, a.owner, a.due_at, a.status, m.title AS meeting_title FROM action_items a JOIN meetings m ON m.id = a.meeting_id
     WHERE a.status != 'done' ORDER BY a.due_at IS NULL, a.due_at`,
  );
  const myItems = openItems.filter((i) => (i.owner ?? "").toLowerCase() === me.toLowerCase());
  const total = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM action_items"))?.n ?? 0;
  const done = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM action_items WHERE status = 'done'"))?.n ?? 0;

  const visible = new Set(meetings.map((m) => m.id));
  const pending = (await all<{ meeting_id: string; title: string; n: number }>(
    `SELECT d.meeting_id, m.title, COUNT(*) AS n FROM drafts d JOIN meetings m ON m.id = d.meeting_id
     WHERE d.status = 'pending' GROUP BY d.meeting_id ORDER BY m.held_at DESC`,
  )).filter((p) => visible.has(p.meeting_id));
  const decisions = s.perms.view_decisions
    ? (await all<{ meeting_id: string }>("SELECT d.text, d.status, d.meeting_id, m.title AS meeting_title, m.held_at FROM decisions d JOIN meetings m ON m.id = d.meeting_id ORDER BY m.held_at DESC LIMIT 40"))
        .filter((x) => visible.has(x.meeting_id)).slice(0, 5)
    : [];

  return Response.json({
    user: s.user,
    perms: s.perms,
    stats: s.perms.view_insights
      ? { minutes, shipped, conflicts, followThrough: total ? Math.round((done / total) * 100) : 0, openLoops: openItems.length }
      : null,
    zoom,
    meetings: meetings.slice(0, 5),
    myItems,
    teamItems: s.perms.view_team_tasks ? openItems.filter((i) => i.owner && i.owner !== "Me").slice(0, 8) : [],
    pending: s.perms.approve_drafts ? pending : [],
    decisions,
  });
}
