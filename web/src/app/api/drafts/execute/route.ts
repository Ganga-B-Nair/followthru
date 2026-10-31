import { requirePermission } from "@/lib/auth";
import { executeApproved } from "@/lib/queue";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await requirePermission("approve_drafts");
  if (s instanceof Response) return s;
  const { ids } = (await req.json()) as { ids: string[] };
  return Response.json({ results: await executeApproved(ids ?? []) });
}
