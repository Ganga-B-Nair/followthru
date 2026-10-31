import { all } from "@/lib/db";

export const runtime = "nodejs";

/** Items due in the next 48 hours or overdue. `now` can be overridden to simulate time in a demo. */
export async function GET(req: Request) {
  const nowParam = new URL(req.url).searchParams.get("now");
  const now = nowParam ? new Date(nowParam) : new Date();
  const horizon = new Date(+now + 48 * 3600e3);
  const items = await all<{ id: string; text: string; owner: string | null; due_at: string; status: string; meeting: string }>(
    `SELECT a.id, a.text, a.owner, a.due_at, a.status, m.title AS meeting FROM action_items a JOIN meetings m ON m.id = a.meeting_id
     WHERE a.status != 'done' AND a.due_at IS NOT NULL ORDER BY a.due_at`,
  );
  const due = items
    .filter((i) => new Date(i.due_at) <= horizon)
    .map((i) => ({ ...i, overdue: new Date(i.due_at) < now, hours: Math.round((+new Date(i.due_at) - +now) / 3600e3) }));
  return Response.json({ now: now.toISOString(), reminders: due });
}
