"use client";

export type Step = { step: string; status: "running" | "done"; detail?: string };

export const STEP_LABELS: Record<string, string> = {
  clean: "Speech to intent",
  extract: "Decisions, owners, deadlines",
  recall: "Decision memory",
  conflicts: "Conflict guard",
  draft: "Execution drafts",
};

/** Read a server-sent-events pipeline stream, reporting steps; resolves with the new meeting id. */
export async function readPipeline(res: Response, onStep: (s: Step) => void): Promise<string> {
  if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      if (!p.startsWith("data: ")) continue;
      const e = JSON.parse(p.slice(6));
      if (e.type === "step") onStep({ step: e.step, status: e.status, detail: e.detail });
      else if (e.type === "done") return e.meetingId as string;
      else if (e.type === "error") throw new Error(e.message);
    }
  }
  throw new Error("The agent stopped before finishing");
}

export function mergeStep(prev: Step[], s: Step): Step[] {
  const idx = prev.findIndex((x) => x.step === s.step);
  if (idx === -1) return [...prev, s];
  const copy = [...prev];
  copy[idx] = s;
  return copy;
}

export default function AgentSteps({ steps, title = "Agent working…" }: { steps: Step[]; title?: string }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3 text-lg font-semibold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-accent-ink">✦</span> {title}
      </div>
      <ol className="space-y-4">
        {Object.keys(STEP_LABELS).map((key) => {
          const s = steps.find((x) => x.step === key);
          return (
            <li key={key} className="flex items-start gap-4">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition ${
                s?.status === "done" ? "bg-good-soft text-good" : s ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>
                {s?.status === "done" ? "✓" : s ? <span className="animate-pulse">●</span> : "·"}
              </span>
              <div>
                <div className={`text-[16px] font-medium ${s ? "" : "text-muted"}`}>{STEP_LABELS[key]}</div>
                {s?.detail && <div className="text-muted rise">{s.detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
