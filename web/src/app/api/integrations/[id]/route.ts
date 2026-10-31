import { requirePermission } from "@/lib/auth";
import { CATALOG, setIntegration } from "@/lib/integrations";

export const runtime = "nodejs";

/** Simulated OAuth: the consent screen lives in the UI; this records the result. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission("manage_integrations");
  if (s instanceof Response) return s;
  const { id } = await params;
  const def = CATALOG.find((c) => c.id === id);
  if (!def || def.soon) return Response.json({ error: "Not available yet" }, { status: 400 });
  const { action } = (await req.json()) as { action: "connect" | "disconnect" };
  await setIntegration(id, action === "connect", s.user.email);
  return Response.json({ ok: true });
}
