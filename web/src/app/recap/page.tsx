"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AgentSteps, { mergeStep, readPipeline, type Step } from "@/components/AgentSteps";
import Icon from "@/components/Icon";
import { SAMPLES } from "@/lib/samples";

const AUTO_SEND_SECONDS = 4;

export default function Recap() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(30);
  const [autoSend, setAutoSend] = useState<number | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const prevLen = useRef(0);

  // 30-second walk-out timer while the user holds their Wispr Flow key.
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [recording]);

  // Auto-send countdown after Wispr Flow drops a block of text in.
  useEffect(() => {
    if (autoSend === null) return;
    if (autoSend === 0) { submit(); return; }
    const t = setTimeout(() => setAutoSend((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);

  function onChange(v: string) {
    const jump = v.length - prevLen.current;
    prevLen.current = v.length;
    setText(v);
    // Dictation arrives in bursts; typing arrives a character at a time.
    if (jump > 25 && v.trim().length > 40) setAutoSend(AUTO_SEND_SECONDS);
    else setAutoSend(null);
  }

  async function submit() {
    setAutoSend(null);
    setRecording(false);
    if (text.trim().length < 10 || running) return;
    setRunning(true);
    setError(null);
    setSteps([]);
    try {
      const res = await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const id = await readPipeline(res, (s) => setSteps((p) => mergeStep(p, s)));
      router.push(`/meetings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <section className="mb-8 pt-2 text-center">
        <div className="chip mx-auto mb-5"><Icon name="mic" size={14} /> For in-person meetings, calls and everything Zoom doesn&apos;t record</div>
        <h1 className="text-[46px] font-semibold leading-tight tracking-tight">Talk for 30 seconds.<br /><span className="gradient-text">The follow-ups are done.</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          Walking out of a meeting, a class, a doctor&apos;s visit or a call with your landlord? Hold your <b className="text-ink">Wispr Flow</b> key and ramble.
          Fillers, tangents and &quot;no wait, Thursday&quot; are fine.
        </p>
      </section>

      {!running ? (
        <div className="card glow p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => { setRecording(true); setTimer(30); area.current?.focus(); }} className={`btn btn-primary btn-lg ${recording ? "listening" : ""}`}>
              <Icon name="mic" /> {recording ? `Listening… 0:${String(timer).padStart(2, "0")}` : "Start 30-second Walk-out Recap"}
            </button>
            <span className="text-muted">Hold your Wispr Flow hotkey and speak</span>
          </div>
          <textarea ref={area} value={text} onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
            autoFocus rows={8}
            placeholder={'"Okay so um, quick recap. We decided to launch Friday, no wait, Thursday. Priya will email Acme the new pricing…"'}
            className="field resize-y !p-5 text-[18px] leading-relaxed" />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Try a sample:</span>
              {SAMPLES.map((s) => (
                <button key={s.label} className="btn btn-sm" onClick={() => { prevLen.current = s.text.length; setText(s.text); setAutoSend(null); }}>{s.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {autoSend !== null && <button className="btn btn-sm" onClick={() => setAutoSend(null)}>Sending in {autoSend}s · keep editing</button>}
              <button className="btn btn-primary btn-lg" disabled={text.trim().length < 10} onClick={submit}>Follow through <Icon name="arrow" /></button>
            </div>
          </div>
          {error && <div className="mt-4 rounded-xl bg-bad-soft p-4 text-bad">{error}</div>}
        </div>
      ) : (
        <div className="card glow p-8">
          <AgentSteps steps={steps} />
          {error && <div className="mt-4 rounded-xl bg-bad-soft p-4 text-bad">{error}</div>}
        </div>
      )}
    </div>
  );
}
