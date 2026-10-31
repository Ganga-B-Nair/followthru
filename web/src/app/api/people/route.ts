import { requirePermission } from "@/lib/auth";
import { all } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const people = await all(
    `SELECT p.name, p.email,
       (SELECT COUNT(*) FROM action_items a WHERE a.owner = p.name COLLATE NOCASE AND a.status != 'done') AS open_count,
       (SELECT COUNT(*) FROM action_items a WHERE a.owner = p.name COLLATE NOCASE AND a.status = 'done') AS done_count
     FROM people p ORDER BY open_count DESC, p.name`,
  );
  const items = await all(
    `SELECT a.*, m.title AS meeting_title FROM action_items a JOIN meetings m ON m.id = a.meeting_id
     ORDER BY CASE a.status WHEN 'blocked' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, a.due_at`,
  );
  if (s.perms.view_team_tasks) return Response.json({ people, items, me: s.user.person });
  const mine = (n: unknown) => String(n ?? "").toLowerCase() === s.user.person.toLowerCase();
  return Response.json({ people: people.filter((p) => mine(p.name)), items: items.filter((i) => mine(i.owner)), me: s.user.person });
}
