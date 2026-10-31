import { safe } from "@/lib/ai";
import { askMemory } from "@/lib/ask";
import { requirePermission } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = safe(async (req: Request) => {
  const s = await requirePermission("use_ask");
  if (s instanceof Response) return s;
  const { question } = (await req.json()) as { question?: string };
  if (!question?.trim()) return Response.json({ error: "Ask something" }, { status: 400 });
  return Response.json(await askMemory(question));
});
