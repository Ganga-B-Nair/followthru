"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { curtain } from "@/components/Curtain";
import Logo from "@/components/Logo";

// The opening of the demo video: a voice-bar loader, three questions, the reveal, then the curtain
// closes and opens on the sign-in page. Starting it also resets the demo data, so every take is fresh.

type Scene = "idle" | "loading" | 0 | 1 | 2 | "intro";

const QUESTIONS = [
  { lead: "Are you tired of", line: "meetings that end with “so… who’s sending that?”" },
  { lead: "Are you tired of", line: "taking notes. Over. And over. And over again?" },
  { lead: "Do you wish", line: "every meeting turned into done?", sub: "Emails sent. Invites booked. Docs written. Before you’re back at your desk." },
];
const BEAT_MS = 3400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wispr Flow-style voice bars. */
function VoiceBars({ count = 28, height = 72 }: { count?: number; height?: number }) {
  return (
    <div className="flex items-center justify-center gap-[5px]" style={{ height }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="voice-bar w-[5px] rounded-full bg-gradient-to-t from-accent-2 to-accent"
          style={{ height, animationDelay: `${(i * 97) % 900}ms`, animationDuration: `${700 + ((i * 53) % 500)}ms` }} />
      ))}
    </div>
  );
}

export default function Intro() {
  const router = useRouter();
  const [scene, setScene] = useState<Scene>("idle");
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  async function start() {
    if (started.current) return;
    started.current = true;
    setScene("loading");
    // Fresh demo data for this take, then sign out so the video opens on the sign-in page.
    const prep = (async () => {
      await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: "u-priya" }) });
      await fetch("/api/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
      await fetch("/api/auth", { method: "DELETE" });
    })().catch(() => {});
    const t0 = Date.now();
    while (Date.now() - t0 < 3600) {
      setProgress(Math.min(100, ((Date.now() - t0) / 3600) * 100));
      await sleep(40);
    }
    setProgress(100);
    await prep;
    await sleep(350);
    for (const i of [0, 1, 2] as const) {
      setScene(i);
      await sleep(BEAT_MS);
    }
    setScene("intro");
    await sleep(4200);
    await curtain("closed");
    router.push("/login");
    await sleep(700);
    await curtain("open");
  }

  useEffect(() => {
    // Coming back from the closing screen for another take: the curtain is still drawn.
    curtain("open");
    const key = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") start(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 grid cursor-default place-items-center overflow-hidden bg-bg" onClick={start}>
      <div className="pointer-events-none absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-accent-2/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-accent/10 blur-[140px]" />

      {scene === "idle" && <div className="text-sm text-muted/30">Click to begin</div>}

      {scene === "loading" && (
        <div className="rise w-[520px] max-w-[90vw] text-center">
          <VoiceBars />
          <div className="mt-10 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 flex justify-between text-sm text-muted">
            <span>Listening to your meetings…</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {typeof scene === "number" && (
        <div key={scene} className="intro-line max-w-5xl px-10 text-center">
          <div className="mb-4 text-2xl font-medium text-accent">{QUESTIONS[scene].lead}</div>
          <div className="font-display text-[68px] font-semibold leading-[1.08] tracking-tight text-ink">{QUESTIONS[scene].line}</div>
          {QUESTIONS[scene].sub && <div className="mx-auto mt-6 max-w-3xl text-2xl text-muted">{QUESTIONS[scene].sub}</div>}
        </div>
      )}

      {scene === "intro" && (
        <div className="intro-line text-center">
          <div className="mb-6 text-2xl font-medium tracking-[0.3em] text-muted">INTRODUCING</div>
          <div className="mx-auto mb-6 w-fit"><Logo size={96} /></div>
          <div className="gradient-text font-display text-[96px] font-semibold leading-none tracking-tight">FollowThru</div>
          <div className="mt-6 text-2xl text-muted">Other tools turn meetings into to-dos. <span className="text-ink">FollowThru turns them into done.</span></div>
          <div className="mt-10 opacity-70"><VoiceBars count={16} height={28} /></div>
        </div>
      )}
    </div>
  );
}
