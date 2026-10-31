import { canSeeMeeting, requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const s = await requirePermission("view_decisions");
  if (s instanceof Response) return s;
  const decisions = (await all<{ attendees_json: string }>(
    `SELECT d.*, m.title AS meeting_title, m.meeting_type, m.held_at, m.attendees_json FROM decisions d JOIN meetings m ON m.id = d.meeting_id ORDER BY m.held_at DESC, d.rowid`,
  )).filter((d) => canSeeMeeting(s, d.attendees_json));
  const conflicts = await all(
    `SELECT c.*, nd.text AS new_text, od.text AS old_text FROM conflicts c
     JOIN decisions nd ON nd.id = c.new_decision_id JOIN decisions od ON od.id = c.old_decision_id ORDER BY c.created_at DESC`,
  );
  return Response.json({ decisions, conflicts: s.perms.view_conflicts ? conflicts : [] });
}
