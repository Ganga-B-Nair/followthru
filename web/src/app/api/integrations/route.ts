import { requirePermission } from "@/lib/auth";
import { CATALOG, integrationStates } from "@/lib/integrations";

export const runtime = "nodejs";

export async function GET() {
  const s = await requirePermission();
  if (s instanceof Response) return s;
  const states = await integrationStates();
  return Response.json({
    canManage: s.perms.manage_integrations,
    integrations: CATALOG.map((c) => ({ ...c, state: states[c.id] ?? { status: "disconnected", account: null, connected_at: null } })),
  });
}
