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

// You join as Priya. Everyone else is a placeholder participant whose lines come from the Zoom transcript.
const ME = "Priya";
const COLORS: Record<string, string> = { Priya: "#a3b18a", Meera: "#7fa7a0", Ravi: "#d9b36c", Arjun: "#c98a6b" };
const colorOf = (name: string) => COLORS[name.split(" ")[0]] ?? "#7c8a70";
const first = (name: string) => name.split(" ")[0];

const TAG = {
  decision: { label: "Decision", cls: "border-accent/40 bg-accent-soft text-accent", icon: "◆" },
  action: { label: "Action item", cls: "border-good/40 bg-good-soft text-good", icon: "✓" },
  correction: { label: "Self-correction resolved", cls: "border-warn/40 bg-warn-soft text-warn", icon: "↺" },
};

/* Minimal typing for the browser's Web Speech API (Chrome and Edge ship it as webkitSpeechRecognition). */
type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void;
};
function makeRecognition(): Recognition | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return R ? new R() : null;
}

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
  const [micOk, setMicOk] = useState(true);
  const [voices, setVoices] = useState(true);
  const [cam, setCam] = useState<MediaStream | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);

  const video = useRef<HTMLVideoElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const rec = useRef<Recognition | null>(null);
  const othersTalking = useRef(false);
  const buffer = useRef("");
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linesRef = useRef<Line[]>([]);
  const idxRef = useRef(0);
  const live = useRef(false);

  useEffect(() => {
    fetch(`/api/zoom/meetings/${id}`).then((r) => r.json()).then((d) => {
      setZoom(d.meeting);
      setScript(d.transcript ?? []);
      if (d.meeting?.meeting_id) router.replace(`/meetings/${d.meeting.meeting_id}`);
    });
  }, [id, router]);

  // Camera preview starts in the lobby so you can check yourself before joining.
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((s) => { stream = s; setCam(s); })
      .catch(() => setCamErr("Camera blocked. Allow it in the address bar to appear on video."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => { if (video.current && cam) video.current.srcObject = cam; }, [cam, phase]);

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

  /** Your words go to the AI notetaker; it decides whether they're a decision, an action or a correction. */
  const noteFromAI = useCallback(async (line: Line) => {
    const context = linesRef.current.slice(-8, -1).map((l) => `${l.speaker}: ${l.text}`);
    try {
      const r = await fetch("/api/live/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speaker: ME, text: line.text, context }) });
      const n = (await r.json()) as { tag: Tag | "none"; note: string };
      if (r.ok && n.tag !== "none") setNotes((p) => [...p, { key: line.at, tag: n.tag as Tag, speaker: `${ME} (you)`, text: n.note, ai: true }]);
    } catch {}
  }, []);

  const advance = useCallback(() => { idxRef.current += 1; setIdx(idxRef.current); }, []);

  /** A pause in your speech ends the utterance; if it was your turn, the meeting moves on. */
  const commitSpeech = useCallback(() => {
    const text = buffer.current.trim();
    buffer.current = "";
    setInterim("");
    if (!text || !live.current) return;
    const line = addLine({ speaker: ME, text, you: true });
    noteFromAI(line);
    if (script[idxRef.current]?.speaker === ME) advance();
  }, [addLine, noteFromAI, advance, script]);
  // Recognition callbacks are created once; this ref keeps them calling the latest commitSpeech.
  const commitRef = useRef(commitSpeech);
  useEffect(() => { commitRef.current = commitSpeech; }, [commitSpeech]);

  function startListening() {
    const r = makeRecognition();
    if (!r) { setMicOk(false); return; }
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-IN";
    r.onresult = (e) => {
      if (othersTalking.current) return; // ignore the placeholder voices coming out of your speakers
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) buffer.current += ` ${res[0].transcript}`;
        else partial += res[0].transcript;
      }
      setInterim(`${buffer.current} ${partial}`.trim());
      if (commitTimer.current) clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(() => commitRef.current(), 1400);
    };
    r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") setMicOk(false); };
    r.onend = () => { if (live.current) try { r.start(); } catch {} };
    try { r.start(); } catch { setMicOk(false); }
    rec.current = r;
  }
  function join() {
    live.current = true;
    setPhase("live");
    startListening();
  }

  // The meeting engine: placeholder participants speak their lines; on your turn it waits for you.
  useEffect(() => {
    if (phase !== "live" || !script.length) return;
    const item = script[idx];
    if (!item) { finish(); return; }
    if (item.speaker === ME) {
      setSpeaking(ME);
      // Without a microphone, your line plays from the script so the demo still runs.
      if (!micOk) {
        const t = setTimeout(() => { addLine({ speaker: ME, text: item.text, you: true }); pushScripted(item); advance(); }, 2500);
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
  }, [phase, idx, script, micOk]);

  function pushScripted(item: ScriptLine) {
    if (item.tag) setNotes((p) => [...p, { key: 1000 + linesRef.current.length, tag: item.tag!, speaker: item.speaker, text: item.text, ai: false }]);
  }

  function skipMyLine() {
    const item = script[idxRef.current];
    if (item?.speaker !== ME) return;
    addLine({ speaker: ME, text: item.text, you: true });
    pushScripted(item);
    advance();
  }

  async function finish() {
    if (!live.current) return;
    live.current = false;
    if (commitTimer.current) clearTimeout(commitTimer.current);
    rec.current?.stop();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setSpeaking(null);
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
  const cue = phase === "live" && script[idx]?.speaker === ME ? script[idx] : null;
  const mm = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const myTile = (big: boolean) => (
    <div className={`card relative overflow-hidden ${big ? "aspect-video" : "aspect-[4/3]"} ${speaking === ME && (interim || phase === "lobby") ? "!border-good shadow-[0_0_0_2px_var(--good)]" : ""}`}>
      {cam ? <video ref={video} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
        : <div className="grid h-full place-items-center"><Avatar user={{ name: me, color: colorOf(me) }} size={big ? 96 : 64} /></div>}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-sm backdrop-blur">
        <Icon name="mic" size={13} className={micOk ? "text-good" : "text-bad"} /> {me} (you)
      </div>
      {interim && <span className="wave absolute right-3 top-3"><span /><span /><span /><span /><span /></span>}
    </div>
  );

  if (phase === "lobby") {
    return (
      <div className="mx-auto grid max-w-6xl items-center gap-10 pt-6 lg:grid-cols-[1.4fr_1fr]">
        {myTile(true)}
        <div>
          <div className="chip mb-4 !border-zoom/40 !text-[var(--zoom)]"><Icon name="video" size={14} /> Zoom · FollowThru notetaker will join</div>
          <h1 className="text-[40px] font-semibold leading-tight tracking-tight">{zoom.topic}</h1>
          <p className="mt-3 text-lg text-muted">{others.map(first).join(", ")} are already in the call. Your camera and microphone are live; FollowThru transcribes what you say and takes notes as you go.</p>
          {camErr && <p className="mt-3 text-sm text-warn">{camErr}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn btn-zoom btn-lg" onClick={join}><Icon name="video" /> Join with camera &amp; mic</button>
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={voices} onChange={(e) => setVoices(e.target.checked)} /> Play participants&apos; voices</label>
          </div>
          <p className="mt-4 text-xs text-muted">Speech recognition runs in your browser (Chrome or Edge). Use headphones if participant voices are on.</p>
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
        {phase === "live" && <button className="btn !border-bad/40 !text-bad" onClick={finish}>End meeting</button>}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
        <div className="space-y-5">
          {/* Speaker view: your camera large, the rest of the call stacked beside it. */}
          <div className="grid grid-cols-[2fr_1fr] gap-4">
            {myTile(true)}
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

          {cue && (
            <div className="card glow rise p-5">
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="label">Your turn: say it in your own words</div>
                <button className="btn btn-sm" onClick={skipMyLine}>Skip line</button>
              </div>
              <div className="text-xl leading-relaxed">“{cue.text}”</div>
              {!micOk && <div className="mt-2 text-sm text-warn">Microphone unavailable, so your line plays automatically.</div>}
            </div>
          )}

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
                    <div className="text-sm"><span className="font-semibold">{l.speaker}{l.you && " (you)"}</span> {l.you && <span className="chip !py-0 !text-[11px]">live mic</span>}</div>
                    <div className="text-[16px] leading-relaxed text-ink/90">{l.text}</div>
                  </div>
                </div>
              ))}
              {interim && (
                <div className="flex gap-3 opacity-70">
                  <Avatar user={{ name: ME, color: colorOf(ME) }} size={32} />
                  <div><div className="text-sm font-semibold">{ME} (you)</div><div className="text-[16px] italic">{interim}…</div></div>
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
