import { safe } from "@/lib/ai";
import { requirePermission } from "@/lib/auth";
import { closer, type ChatTurn } from "@/lib/closer";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = safe(async (req: Request) => {
  const s = await requirePermission("use_ask");
  if (s instanceof Response) return s;
  const { messages, page } = (await req.json()) as { messages?: ChatTurn[]; page?: { path: string; meetingId: string | null } };
  if (!messages?.length) return Response.json({ error: "Say something" }, { status: 400 });
  return Response.json(await closer(messages, page ?? { path: "/", meetingId: null }, s));
});
