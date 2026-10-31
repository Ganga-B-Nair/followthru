import { canSeeMeeting, requirePermission } from "@/lib/auth";
import { run } from "@/lib/db";
import { loadMeeting } from "@/lib/pipeline";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const bundle = await loadMeeting((await params).id);
  if (!bundle) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canSeeMeeting(s, bundle.meeting.attendees_json)) return Response.json({ error: "You weren't in this meeting, and your team lead hasn't shared all meeting notes with members." }, { status: 403 });
  return Response.json({ ...bundle, conflicts: s.perms.view_conflicts ? bundle.conflicts : [], viewer: { role: s.user.role, person: s.user.person, perms: s.perms } });
}

/** The user can delete any stored meeting along with everything extracted from it. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  if (s.user.role !== "lead") return Response.json({ error: "Only the team lead can delete meetings." }, { status: 403 });
  const { id } = await params;
  await run("DELETE FROM conflicts WHERE new_decision_id IN (SELECT id FROM decisions WHERE meeting_id = ?) OR old_decision_id IN (SELECT id FROM decisions WHERE meeting_id = ?)", [id, id]);
  for (const t of ["decisions", "action_items", "drafts"]) await run(`DELETE FROM ${t} WHERE meeting_id = ?`, [id]);
  await run("DELETE FROM meetings WHERE id = ?", [id]);
  return Response.json({ ok: true });
}
