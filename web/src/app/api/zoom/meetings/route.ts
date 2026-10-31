import { requirePermission } from "@/lib/auth";
import { all, type ZoomRow } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const rows = await all<ZoomRow>("SELECT * FROM zoom_meetings ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'ended' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END, start_at");
  const visible = rows.filter((z) => s.perms.view_all_meetings || JSON.parse(z.participants_json).some((p: string) => p.toLowerCase().startsWith(s.user.person.toLowerCase())));
  return Response.json({ meetings: visible });
}
