"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AgentSteps, { mergeStep, readPipeline, type Step } from "@/components/AgentSteps";
import Icon from "@/components/Icon";
import { Avatar } from "@/components/SessionProvider";

type Tag = "decision" | "action" | "correction";
type ScriptLine = { speaker: string; text: string; at: number; tag?: Tag };
type Line = { speaker: string; text: string; at: number; you?: boolean };
type Note = { key: number; tag: Tag; speaker: string; text: string; ai: boolean };
type Zoom = { id: string; topic: string; status: string; participants_json: string; meeting_id: string | null };

// You join as Priya; everyone else is a placeholder participant whose lines come from the Zoom transcript.
// Your own lines are scripted too: you say them on camera, and a voice meter on your microphone types the
// line out as you speak and commits it when you pause (Space commits it straight away).
const ME = "Priya";
const COLORS: Record<string, string> = { Priya: "#a3b18a", Meera: "#7fa7a0", Ravi: "#d9b36c", Arjun: "#c98a6b" };
const colorOf = (name: string) => COLORS[name.split(" ")[0]] ?? "#7c8a70";
const first = (name: string) => name.split(" ")[0];
const WORD_MS = 150;      // how fast your line types out while you're talking
const PAUSE_MS = 1100;    // silence that ends your turn

const TAG = {
  decision: { label: "Decision", cls: "border-accent/40 bg-accent-soft text-accent", icon: "◆" },
  action: { label: "Action item", cls: "border-good/40 bg-good-soft text-good", icon: "✓" },
  correction: { label: "Self-correction resolved", cls: "border-warn/40 bg-warn-soft text-warn", icon: "↺" },
};

export default function Live() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [script, setScript] = useState<ScriptLine[]>([]);
  const [phase, setPhase] = useState<"lobby" | "live" | "processing" | "error">("lobby");
  const [idx, setIdx] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasMic, setHasMic] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [level, setLevel] = useState(0);
  const [voices, setVoices] = useState(true);
  const [mediaErr, setMediaErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);

  const video = useRef<HTMLVideoElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const linesRef = useRef<Line[]>([]);
  const idxRef = useRef(0);
  const live = useRef(false);
  const othersTalking = useRef(false);
  const micOnRef = useRef(true);
  const audioCtx = useRef<AudioContext | null>(null);
  // Voice-meter state for your current line.
  const shownWords = useRef(0);
  const lastVoice = useRef(0);
  const lastWord = useRef(0);
  const noise = useRef(0.01);

  useEffect(() => {
    fetch(`/api/zoom/meetings/${id}`).then((r) => r.json()).then((d) => {
      setZoom(d.meeting);
      setScript(d.transcript ?? []);
      if (d.meeting?.meeting_id) router.replace(`/meetings/${d.meeting.meeting_id}`);
    });
  }, [id, router]);

  // Camera and microphone start in the lobby so you can check yourself before joining.
  useEffect(() => {
    let s: MediaStream | null = null;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) { setMediaErr("This browser can't open a camera here."); return; }
    md.getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
      .then((x) => { s = x; setStream(x); setHasMic(true); })
      .catch(() => md.getUserMedia({ video: true }).then((x) => { s = x; setStream(x); setMediaErr("Microphone blocked: your lines will play automatically."); }))
      .catch(() => setMediaErr("Camera and microphone blocked. Allow them in the address bar to appear on video."));
    return () => { s?.getTracks().forEach((t) => t.stop()); audioCtx.current?.close().catch(() => {}); };
  }, []);
  useEffect(() => { if (video.current && stream) video.current.srcObject = stream; }, [stream, phase, camOn]);
  useEffect(() => { stream?.getVideoTracks().forEach((t) => { t.enabled = camOn; }); }, [stream, camOn]);
  useEffect(() => { micOnRef.current = micOn; stream?.getAudioTracks().forEach((t) => { t.enabled = micOn; }); }, [stream, micOn]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" }); }, [lines, interim]);

  const addLine = useCallback((l: Omit<Line, "at">) => {
    const line = { ...l, at: linesRef.current.length };
    linesRef.current = [...linesRef.current, line];
    setLines(linesRef.current);
    return line;
  }, []);

  const pushScripted = useCallback((item: ScriptLine, speaker = item.speaker) => {
    if (item.tag) setNotes((p) => [...p, { key: 1000 + linesRef.current.length, tag: item.tag!, speaker, text: item.text, ai: false }]);
  }, []);

  /** Your line goes to the AI notetaker, which decides whether it's a decision, an action or a correction. */
  const noteFromAI = useCallback(async (line: Line, item: ScriptLine) => {
    // The note appears at once from the transcript; the AI's version replaces it if it answers in time.
    const speaker = `${ME} (you)`;
    if (item.tag) setNotes((p) => [...p, { key: line.at, tag: item.tag!, speaker, text: item.text, ai: false }]);
    const context = linesRef.current.slice(-8, -1).map((l) => `${l.speaker}: ${l.text}`);
    try {
      const r = await fetch("/api/live/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speaker: ME, text: line.text, context }) });
      const n = (await r.json()) as { tag: Tag | "none"; note: string };
      if (!r.ok || n.tag === "none") return;
      const ai: Note = { key: line.at, tag: n.tag, speaker, text: n.note, ai: true };
      setNotes((p) => (p.some((x) => x.key === line.at) ? p.map((x) => (x.key === line.at ? ai : x)) : [...p, ai]));
    } catch {} // free AI busy: the transcript's note stays
  }, []);

  const advance = useCallback(() => { idxRef.current += 1; setIdx(idxRef.current); }, []);

  /** Finish your current line: print it in full, send it to the notetaker, and hand over to the next speaker. */
  const commitMine = useCallback(() => {
    const item = script[idxRef.current];
    if (!live.current || item?.speaker !== ME) return;
    shownWords.current = 0;
    setInterim("");
    const line = addLine({ speaker: ME, text: item.text, you: true });
    noteFromAI(line, item);
    advance();
  }, [script, addLine, noteFromAI, advance]);
  const commitRef = useRef(commitMine);
  useEffect(() => { commitRef.current = commitMine; }, [commitMine]);

  /** Voice meter on your microphone: talking types your line out word by word; a pause ends your turn. */
  function startMeter() {
    if (!stream?.getAudioTracks().length) return;
    const ctx = new AudioContext();
    audioCtx.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      if (ctx.state === "closed") return;
      analyser.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      const now = performance.now();
      const loud = micOnRef.current && rms > Math.max(0.012, noise.current * 2.5);
      if (!loud) noise.current = noise.current * 0.995 + rms * 0.005; // track the room's background level
      setLevel(micOnRef.current ? Math.min(1, rms * 9) : 0);

      const item = script[idxRef.current];
      if (live.current && item?.speaker === ME && !othersTalking.current) {
        const words = item.text.split(" ");
        if (loud) lastVoice.current = now;
        const talking = now - lastVoice.current < 450;
        if (talking && now - lastWord.current > WORD_MS && shownWords.current < words.length) {
          shownWords.current += 1;
          lastWord.current = now;
          setInterim(words.slice(0, shownWords.current).join(" "));
        }
        const said = shownWords.current / words.length;
        if (shownWords.current > 0 && now - lastVoice.current > (said >= 1 ? 600 : PAUSE_MS) && said >= 0.6) commitRef.current();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function join() {
    live.current = true;
    setPhase("live");
    startMeter();
  }

  // Space finishes your line straight away (handy if the room is noisy).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== "Space" || phase !== "live" || (e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      commitRef.current();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [phase]);

  // The meeting engine: placeholder participants speak their lines; on your turn it waits for you.
  useEffect(() => {
    if (phase !== "live" || !script.length) return;
    const item = script[idx];
    if (!item) { finish(); return; }
    if (item.speaker === ME) {
      setSpeaking(ME);
      lastVoice.current = 0;
      // Without a microphone, your line plays from the script so the demo still runs.
      if (!hasMic) {
        const t = setTimeout(() => commitRef.current(), 2600);
        return () => clearTimeout(t);
      }
      return;
    }
    let cancelled = false;
    const t0 = setTimeout(() => {
      if (cancelled) return;
      setSpeaking(item.speaker);
      othersTalking.current = true;
      addLine({ speaker: item.speaker, text: item.text });
      pushScripted(item);
      const done = () => {
        if (cancelled) return;
        othersTalking.current = false;
        setSpeaking(null);
        setTimeout(() => !cancelled && advance(), 350);
      };
      if (voices && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(item.text);
        const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
        const pick = { Ravi: 1, Meera: 2, Arjun: 3 }[first(item.speaker)] ?? 0;
        if (vs.length) u.voice = vs[pick % vs.length];
        u.rate = 1.08;
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      } else {
        setTimeout(done, Math.max(1600, item.text.length * 55));
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(t0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, script, hasMic]);

  async function finish() {
    if (!live.current) return;
    live.current = false;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    audioCtx.current?.close().catch(() => {});
    setSpeaking(null);
    setInterim("");
    setPhase("processing");
    try {
      const res = await fetch(`/api/zoom/meetings/${id}/process`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: linesRef.current.map((l) => ({ speaker: l.speaker, text: l.text })) }),
      });
      const meetingId = await readPipeline(res, (s) => setSteps((p) => mergeStep(p, s)));
      router.push(`/meetings/${meetingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  if (!zoom) return <div className="text-muted">Joining the call…</div>;
  const people: string[] = JSON.parse(zoom.participants_json);
  const others = people.filter((p) => first(p) !== ME);
  const me = people.find((p) => first(p) === ME) ?? "Priya Nair";
  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const meTalking = phase !== "lobby" && !!interim;

  const controls = (
    <div className="flex items-center gap-2">
      <button className={`btn btn-sm !rounded-full !px-3.5 ${micOn ? "" : "!border-bad/50 !bg-bad-soft !text-bad"}`} onClick={() => setMicOn(!micOn)} disabled={!hasMic} title={micOn ? "Mute" : "Unmute"}>
        <Icon name="mic" size={16} /> {micOn ? "Mute" : "Unmute"}
        {hasMic && micOn && (
          <span className="ml-1 flex h-4 items-end gap-[2px]">
            {[0.25, 0.5, 0.75, 1].map((t) => <span key={t} className={`w-[3px] rounded-sm transition-all ${level >= t * 0.6 ? "bg-good" : "bg-line"}`} style={{ height: `${t * 100}%` }} />)}
          </span>
        )}
      </button>
      <button className={`btn btn-sm !rounded-full !px-3.5 ${camOn ? "" : "!border-bad/50 !bg-bad-soft !text-bad"}`} onClick={() => setCamOn(!camOn)} disabled={!stream} title={camOn ? "Stop video" : "Start video"}>
        <Icon name="video" size={16} /> {camOn ? "Stop video" : "Start video"}
      </button>
    </div>
  );

  const myTile = (
    <div className={`card relative aspect-video overflow-hidden transition ${meTalking ? "!border-good shadow-[0_0_0_2px_var(--good),0_0_40px_-8px_var(--good)]" : ""}`}>
      {stream && camOn ? <video ref={video} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        : <div className="grid h-full place-items-center"><Avatar user={{ name: me, color: colorOf(me) }} size={96} /></div>}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm backdrop-blur">
        <Icon name="mic" size={13} className={hasMic && micOn ? "text-good" : "text-bad"} /> {me} (you){!micOn && " · muted"}
      </div>
      {meTalking && <span className="wave absolute right-3 top-3"><span /><span /><span /><span /><span /></span>}
    </div>
  );

  if (phase === "lobby") {
    return (
      <div className="mx-auto grid max-w-6xl items-center gap-10 pt-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {myTile}
          <div className="flex justify-center">{controls}</div>
        </div>
        <div>
          <div className="chip mb-4 !border-zoom/40 !text-[var(--zoom)]"><Icon name="video" size={14} /> Zoom · FollowThru notetaker will join</div>
          <h1 className="text-[40px] font-semibold leading-tight tracking-tight">{zoom.topic}</h1>
          <p className="mt-3 text-lg text-muted">{others.map(first).join(", ")} are already in the call. FollowThru joins as your notetaker: it transcribes the call and writes notes as you talk.</p>
          {mediaErr && <p className="mt-3 text-sm text-warn">{mediaErr}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn btn-zoom btn-lg" onClick={join}><Icon name="video" /> Join meeting</button>
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={voices} onChange={(e) => setVoices(e.target.checked)} /> Participants&apos; audio</label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--live)]">
            {phase === "live" ? <><span className="live-dot" /> LIVE ON ZOOM · {mm(elapsed)} · FollowThru notetaker recording</> : "MEETING ENDED"}
          </div>
          <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{zoom.topic}</h1>
        </div>
        {phase === "live" && (
          <div className="flex items-center gap-3">
            {controls}
            <button className="btn !border-bad/40 !text-bad" onClick={finish}>End meeting</button>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="space-y-5">
          {/* Speaker view: your camera large, the rest of the call stacked beside it. */}
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            {myTile}
            <div className="grid grid-rows-3 gap-3">
              {others.map((p) => {
                const active = speaking && first(p) === first(speaking);
                return (
                  <div key={p} className={`card relative flex items-center gap-3 px-4 transition duration-300 ${active ? "!border-good shadow-[0_0_0_2px_var(--good),0_0_40px_-8px_var(--good)]" : "opacity-75"}`}>
                    <Avatar user={{ name: p, color: colorOf(p) }} size={active ? 52 : 44} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p}</div>
                      <div className="text-xs text-muted">{active ? "Speaking…" : "Camera off"}</div>
                    </div>
                    {active && <span className="wave absolute right-3 top-1/2 -translate-y-1/2"><span /><span /><span /><span /><span /></span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live transcript</h2>
              <span className="chip"><span className="h-2 w-2 rounded-full bg-good" /> Speaker names from Zoom</span>
            </div>
            <div ref={feed} className="scroll-thin max-h-[320px] space-y-4 overflow-y-auto pr-2">
              {lines.map((l) => (
                <div key={l.at} className="rise flex gap-3">
                  <Avatar user={{ name: l.speaker, color: colorOf(l.speaker) }} size={32} />
                  <div>
                    <div className="text-sm"><span className="font-semibold">{l.speaker}{l.you && " (you)"}</span></div>
                    <div className="text-[16px] leading-relaxed text-ink/90">{l.text}</div>
                  </div>
                </div>
              ))}
              {interim && (
                <div className="flex gap-3 opacity-80">
                  <Avatar user={{ name: ME, color: colorOf(ME) }} size={32} />
                  <div><div className="text-sm font-semibold">{ME} (you)</div><div className="text-[16px]">{interim}<span className="ml-0.5 animate-pulse text-accent">▍</span></div></div>
                </div>
              )}
              {phase === "live" && !interim && <div className="flex items-center gap-2 text-sm text-muted"><span className="wave"><span /><span /><span /><span /><span /></span> listening…</div>}
            </div>
          </div>
        </div>

        <div className="card glow p-6">
          {phase === "live" ? (
            <>
              <div className="mb-1 flex items-center gap-3 text-lg font-semibold">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-accent-ink">✦</span> AI notes, live
              </div>
              <p className="mb-5 text-sm text-muted">FollowThru is in the call, turning what&apos;s said into decisions and action items.</p>
              <div className="scroll-thin max-h-[640px] space-y-3 overflow-y-auto pr-1">
                {[...notes].reverse().map((n) => {
                  const tag = TAG[n.tag];
                  return (
                    <div key={n.key} className={`rise rounded-2xl border p-4 ${tag.cls}`}>
                      <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider">
                        <span>{tag.icon} {tag.label} · {n.speaker}</span>
                        {n.ai && <span className="rounded-full bg-black/25 px-2 py-0.5 normal-case tracking-normal text-ink/80">✦ AI from your voice</span>}
                      </div>
                      <div className="mt-1 text-[15px] text-ink">{n.text}</div>
                    </div>
                  );
                })}
                {notes.length === 0 && <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Decisions and action items appear here as they&apos;re said.</div>}
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
