"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AgentSteps, { mergeStep, readPipeline, type Step } from "@/components/AgentSteps";
import { Avatar } from "@/components/SessionProvider";

type Line = { speaker: string; text: string; at: number; tag?: "decision" | "action" | "correction" };
type Zoom = { id: string; topic: string; status: string; participants_json: string; meeting_id: string | null };

const COLORS: Record<string, string> = { Priya: "#a3b18a", Meera: "#7fa7a0", Ravi: "#d9b36c", Arjun: "#c98a6b" };
const colorOf = (name: string) => COLORS[name.split(" ")[0]] ?? "#7c8a70";

const TAG = {
  decision: { label: "Decision", cls: "border-accent/40 bg-accent-soft text-accent", icon: "◆" },
  action: { label: "Action item", cls: "border-good/40 bg-good-soft text-good", icon: "✓" },
  correction: { label: "Self-correction resolved", cls: "border-warn/40 bg-warn-soft text-warn", icon: "↺" },
};

export default function Live() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(4);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState<"live" | "processing" | "error">("live");
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/zoom/meetings/${id}`).then((r) => r.json()).then((d) => {
      setZoom(d.meeting);
      setLines(d.transcript ?? []);
      if (d.meeting?.meeting_id) router.replace(`/meetings/${d.meeting.meeting_id}`);
    });
  }, [id, router]);

  const end = lines.length ? lines[lines.length - 1].at + 4 : 0;

  useEffect(() => {
    if (!playing || phase !== "live" || !lines.length) return;
    const timer = setInterval(() => setT((x) => x + 0.25 * speed), 250);
    return () => clearInterval(timer);
  }, [playing, phase, speed, lines.length]);

  useEffect(() => {
    if (phase === "live" && lines.length && t >= end) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" }); }, [t]);

  async function finish() {
    setPhase("processing");
    try {
      const res = await fetch(`/api/zoom/meetings/${id}/process`, { method: "POST" });
      const meetingId = await readPipeline(res, (s) => setSteps((p) => mergeStep(p, s)));
      router.push(`/meetings/${meetingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  if (!zoom) return <div className="text-muted">Joining the call…</div>;
  const shown = lines.filter((l) => l.at <= t);
  const speaking = shown[shown.length - 1]?.speaker;
  const people: string[] = JSON.parse(zoom.participants_json);
  const detected = shown.filter((l) => l.tag);
  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--live)]">
            {phase === "live" ? <><span className="live-dot" /> LIVE ON ZOOM · {mm(t)}</> : "MEETING ENDED"}
          </div>
          <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{zoom.topic}</h1>
        </div>
        {phase === "live" && (
          <div className="flex items-center gap-2">
            <button className="btn" onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Resume"}</button>
            {[2, 4, 8].map((s) => (
              <button key={s} className={`btn btn-sm ${speed === s ? "!border-accent/50 !text-accent" : ""}`} onClick={() => setSpeed(s)}>{s}×</button>
            ))}
            <button className="btn !border-bad/40 !text-bad" onClick={() => { setT(end); }}>End meeting</button>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {people.map((p) => {
              const active = speaking && p.startsWith(speaking) && phase === "live";
              return (
                <div key={p} className={`card relative flex aspect-[4/3] flex-col items-center justify-center gap-3 transition ${active ? "!border-good shadow-[0_0_0_2px_var(--good)]" : ""}`}>
                  <Avatar user={{ name: p, color: colorOf(p) }} size={64} />
                  <div className="text-sm font-medium">{p}</div>
                  {active && <span className="wave absolute right-3 top-3"><span /><span /><span /><span /><span /></span>}
                </div>
              );
            })}
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live transcript</h2>
              <span className="chip"><span className="h-2 w-2 rounded-full bg-good" /> Speaker names from Zoom</span>
            </div>
            <div ref={feed} className="scroll-thin max-h-[380px] space-y-4 overflow-y-auto pr-2">
              {shown.map((l, i) => (
                <div key={i} className="flex gap-3 rise">
                  <Avatar user={{ name: l.speaker, color: colorOf(l.speaker) }} size={32} />
                  <div>
                    <div className="text-sm"><span className="font-semibold">{l.speaker}</span> <span className="text-muted">{mm(l.at)}</span></div>
                    <div className={`text-[16px] leading-relaxed ${l.tag ? "text-ink" : "text-ink/85"}`}>{l.text}</div>
                  </div>
                </div>
              ))}
              {phase === "live" && <div className="flex items-center gap-2 text-sm text-muted"><span className="wave"><span /><span /><span /><span /><span /></span> listening…</div>}
            </div>
          </div>
        </div>

        <div className="card glow p-6">
          {phase === "live" ? (
            <>
              <div className="mb-1 flex items-center gap-3 text-lg font-semibold">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-accent-ink">✦</span> AI notes, live
              </div>
              <p className="mb-5 text-sm text-muted">FollowThru notetaker is in the call and building the follow-ups as you talk.</p>
              <div className="scroll-thin max-h-[600px] space-y-3 overflow-y-auto pr-1">
                {[...detected].reverse().map((l) => {
                  const tag = TAG[l.tag!];
                  return (
                    <div key={l.at} className={`rounded-2xl border p-4 rise ${tag.cls}`}>
                      <div className="text-xs font-bold uppercase tracking-wider">{tag.icon} {tag.label} · {l.speaker}</div>
                      <div className="mt-1 text-[15px] text-ink">{l.text}</div>
                    </div>
                  );
                })}
                {detected.length === 0 && <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Decisions and action items appear here as they&apos;re said.</div>}
              </div>
            </>
          ) : phase === "processing" ? (
            <AgentSteps steps={steps} title="Meeting ended. Following through…" />
          ) : (
            <div className="text-bad">{error}</div>
          )}
        </div>
      </section>
    </div>
  );
}
