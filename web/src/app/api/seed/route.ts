import { seedDemo } from "@/lib/seed";

export const runtime = "nodejs";

/** Load the demo workspace ({reset: true} wipes it first). */
export async function POST(req: Request) {
  const { reset } = (await req.json().catch(() => ({}))) as { reset?: boolean };
  return Response.json(await seedDemo(reset));
}
