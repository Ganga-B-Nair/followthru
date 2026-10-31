import { modelName, provider } from "@/lib/ai";
import { githubEnabled, notionEnabled } from "@/lib/executors";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ai: provider() !== "demo", provider: provider(), model: modelName(), notion: notionEnabled(), github: githubEnabled() });
}
