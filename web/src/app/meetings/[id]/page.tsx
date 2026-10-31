"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { COPILOT_CHANGED } from "@/components/Copilot";
import DraftCard, { type Draft } from "@/components/DraftCard";
import Icon from "@/components/Icon";
import Markdown from "@/components/Markdown";
import SpeechDiff from "@/components/SpeechDiff";
import { fmtDate, typeMeta } from "@/lib/ui";

type Bundle = {
  meeting: { id: string; title: string; meeting_type: string; held_at: string; raw_text: string; clean_text: string; corrections_json: string; summary: string; minutes_saved: number; key_points_json: string | null; source: string | null };
  decisions: { id: string; text: string; status: string; speaker: string | null }[];
  actions: { id: string; text: string; owner: string | null; owner_confidence: string; due_at: string | null; due_phrase: string | null; due_confidence: string; implicit: number; status: string }[];
  drafts: Draft[];
  viewer: { role: string; person: string; perms: Record<string, boolean> };
  error?: string;
  conflicts: { id: string; kind: string; explanation: string; resolution: string | null; new_text: string; old_text: string; old_meeting_title: string; old_meeting_date: string }[];
};
type Ops = { op: string; ids: string[]; field: string | null; value: string | null }[];
type Tab = "notes" | "transcript" | "conflicts" | "approve" | "next";

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = useState<Bundle | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [shipping, setShipping] = useState(false);
  const [voice, setVoice] = useState("");
  const [voicePlan, setVoicePlan] = useState<{ ops: Ops; confirm_text: string } | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(true);
  const [tab, setTab] = useState<Tab>("notes");

  const load = useCallback(() => fetch(`/api/meetings/${id}`).then((r) => r.json()).then(setB), [id]);
  useEffect(() => { load(); }, [load]);
  // Copilot can edit, approve and ship from the chat panel; reload when it does.
  useEffect(() => {
    window.addEventListener(COPILOT_CHANGED, load);
    return () => window.removeEventListener(COPILOT_CHANGED, load);
  }, [load]);

  if (!b) return <div className="text-muted">Loading…</div>;
  if (b.error || !b.meeting) return <div className="card p-8 text-lg"><Icon name="lock" className="mb-3 text-muted" />{b.error ?? "Meeting not found."} <Link className="text-accent" href="/meetings">Back to meetings</Link></div>;

  const { meeting, decisions, actions, drafts, conflicts } = b;
  const corrections = JSON.parse(meeting.corrections_json || "[]");
  const selfCorrections = corrections.filter((c: { kind: string }) => c.kind === "self_correction").length;
  const approved = drafts.filter((d) => d.status === "approved");
  const pending = drafts.filter((d) => d.status === "pending");
  const shippedMinutes = drafts.filter((d) => d.status === "executed").reduce((s, d) => s + d.minutes_saved, 0);
  const tm = typeMeta(meeting.meeting_type);
  const openConflicts = conflicts.filter((c) => !c.resolution);
  const canApprove = b.viewer?.perms.approve_drafts ?? false;
  const keyPoints: string[] = JSON.parse(meeting.key_points_json || "[]");
  const isZoom = meeting.source === "zoom";

  async function ship(ids: string[]) {
    setShipping(true);
    const r = await fetch("/api/drafts/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).then((r) => r.json());
    setNotes((n) => ({ ...n, ...Object.fromEntries(r.results.map((x: { id: string; note: string }) => [x.id, x.note])) }));
    setShipping(false);
    load();
  }

  async function approveAll() {
    await Promise.all(pending.map((d) => fetch(`/api/drafts/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) })));
    load();
  }

  async function interpretVoice() {
    setVoiceBusy(true);
    setVoiceErr(null);
    const r = await fetch("/api/voice-command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetingId: id, text: voice }) });
    const data = await r.json();
    if (!r.ok) setVoiceErr(data.error);
    else setVoicePlan(data);
    setVoiceBusy(false);
  }

  async function confirmVoice() {
    if (!voicePlan) return;
    setVoiceBusy(true);
    const r = await fetch("/api/voice-command", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetingId: id, ops: voicePlan.ops, confirm: true }) }).then((r) => r.json());
    setNotes((n) => ({ ...n, ...Object.fromEntries((r.results ?? []).map((x: { id: string; note: string }) => [x.id, x.note])) }));
    setVoicePlan(null);
    setVoice("");
    setVoiceBusy(false);
    load();
  }

  async function resolve(cid: string, resolution: string) {
    await fetch(`/api/conflicts/${cid}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolution }) });
    load();
  }

  async function makeBrief() {
    setBriefBusy(true);
    const r = await fetch(`/api/brief?meetingId=${id}`).then((r) => r.json());
    setBrief(r.markdown ?? r.error);
    setBriefBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this meeting and everything extracted from it?")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    router.push("/meetings");
  }

  const TABS: { id: Tab; label: string; hint: string; icon: string; badge?: number; tone?: string }[] = [
    { id: "notes", label: "AI notes", hint: "Summary, decisions, owners", icon: "sparkle", badge: decisions.length + actions.length },
    { id: "transcript", label: isZoom ? "Transcript" : "What you said", hint: `${selfCorrections} self-correction${selfCorrections === 1 ? "" : "s"} resolved`, icon: "mic" },
    { id: "conflicts", label: "Conflict guard", hint: openConflicts.length ? `${openConflicts.length} need a decision` : "All consistent", icon: "alert", badge: openConflicts.length || undefined, tone: "warn" },
    { id: "approve", label: "Approve & ship", hint: `${pending.length} waiting · ~${meeting.minutes_saved} min of work`, icon: "check", badge: pending.length || undefined, tone: "accent" },
    { id: "next", label: "Next meeting", hint: "Open-Loop Brief", icon: "calendar" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {isZoom && <span className="chip !border-zoom/40 !text-[var(--zoom)]"><Icon name="video" size={14} /> Zoom · AI notetaker</span>}
            <span className="chip">{tm.icon} {tm.label}</span>
            <span>{fmtDate(meeting.held_at, true)}</span>
          </div>
          <h1 className="text-[32px] font-semibold tracking-tight">{meeting.title}</h1>
          <p className="mt-2 max-w-3xl text-lg text-muted">{meeting.summary}</p>
        </div>
        <div className="card glow min-w-56 p-6 text-center">
          <div className="gradient-text text-5xl font-semibold">~{meeting.minutes_saved}<span className="text-2xl"> min</span></div>
          <div className="text-xs text-muted">of follow-up work drafted for you</div>
          {shippedMinutes > 0 && <div className="mt-1 text-xs text-good">{shippedMinutes} min already shipped</div>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] [&>*]:min-w-0">
        <nav className="card h-fit space-y-1 p-3 lg:sticky lg:top-6">
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${tab === t.id ? "bg-accent-soft shadow-[inset_0_0_0_1px_rgba(163,177,138,0.35)]" : "hover:bg-surface-2"}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${tab === t.id ? "bg-gradient-to-br from-accent to-accent-2 text-accent-ink" : "bg-surface-2 text-muted"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${tab === t.id ? "text-ink" : "text-ink/80"}`}>{t.label}</span>
                <span className="block truncate text-xs text-muted">{t.hint}</span>
              </span>
              {t.badge ? <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.tone === "warn" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"}`}>{t.badge}</span> : null}
            </button>
          ))}
          {pending.length > 0 && tab !== "approve" && (
            <button className="btn btn-primary mt-2 w-full" onClick={() => setTab("approve")}>Review {pending.length} follow-ups →</button>
          )}
        </nav>

        <div key={tab} className="rise space-y-6">
          {tab === "notes" && (<>
      {keyPoints.length > 0 && (
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Icon name="sparkle" className="text-accent" /> AI notes</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {keyPoints.map((k, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-line bg-surface-2 p-4 text-[16px]"><span className="text-good">●</span>{k}</div>
            ))}
          </div>
        </section>
      )}

      {/* Decisions + actions */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 text-xl font-semibold">Decisions</h2>
          {decisions.length === 0 && <div className="text-sm text-muted">No decisions detected.</div>}
          <ul className="space-y-3 text-[16px]">
            {decisions.map((d) => (
              <li key={d.id} className="flex gap-2"><span className="text-accent">◆</span><span>{d.text}{d.speaker && <span className="text-muted"> · {d.speaker}</span>}</span></li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="mb-3 text-xl font-semibold">Who owes what</h2>
          {actions.length === 0 && <div className="text-sm text-muted">No action items detected.</div>}
          <ul className="space-y-3 text-[16px]">
            {actions.map((a) => (
              <li key={a.id}>
                <div>{a.text}{a.implicit ? <span className="chip ml-1">soft commitment</span> : null}</div>
                <div className="text-xs text-muted">
                  {a.owner ?? "Unassigned"}{a.owner_confidence === "low" && " ❓"} ·{" "}
                  {a.due_at ? fmtDate(a.due_at, true) : a.due_phrase ?? "no deadline"}{a.due_confidence === "low" && (a.due_at || a.due_phrase) && " ❓ needs confirmation"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

          </>)}
          {tab === "transcript" && (<>
      {/* Speech to intent */}
      {(
        <section className="card p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{isZoom ? "📝 Transcript → what was meant" : "🎙️ What you said → what you meant"}</h2>
            <div className="flex items-center gap-2">
              <span className="chip">{selfCorrections} self-correction{selfCorrections === 1 ? "" : "s"} resolved</span>
              <button className="btn btn-sm" onClick={() => setShowRaw(!showRaw)}>{showRaw ? "Show clean" : "Show raw"}</button>
            </div>
          </div>
          <div className="whitespace-pre-line">{showRaw ? <SpeechDiff raw={meeting.raw_text} corrections={corrections} /> : <p className="text-[16px] leading-8">{meeting.clean_text}</p>}</div>
        </section>
      )}

          </>)}
          {tab === "conflicts" && (<>
      {/* Conflicts */}
      {(
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">⚠️ Conflict guard {openConflicts.length > 0 && <span className="chip !bg-warn-soft !text-warn">{openConflicts.length} need a decision</span>}</h2>
          {conflicts.length === 0 && <div className="card p-8 text-center text-muted">No contradictions with earlier meetings. Everything decided today is consistent with your decision memory.</div>}
          {conflicts.map((c) => (
            <div key={c.id} className={`card border-l-4 p-6 ${c.kind === "contradicts" ? "border-l-warn" : "border-l-accent"}`}>
              <div className="text-[17px] font-medium">{c.explanation}</div>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-surface-2 p-2"><div className="text-xs text-muted">Today</div>{c.new_text}</div>
                <div className="rounded-lg bg-surface-2 p-2"><div className="text-xs text-muted">{c.old_meeting_title} · {fmtDate(c.old_meeting_date)}</div>{c.old_text}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.resolution ? (
                  <span className="chip">Resolved: {c.resolution.replace("_", " ")}</span>
                ) : (
                  <>
                    <button className="btn btn-sm btn-primary" onClick={() => resolve(c.id, "supersede")}>Today&apos;s decision replaces it</button>
                    <button className="btn btn-sm" onClick={() => resolve(c.id, "keep_both")}>Both stand</button>
                    <button className="btn btn-sm" onClick={() => resolve(c.id, "flag")}>Flag for next meeting</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

          </>)}
          {tab === "approve" && (<>
      {/* Approval queue */}
      <section className="rise">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">✅ Approval queue</h2>
            <p className="text-muted">{canApprove ? "Nothing leaves FollowThru until you approve it." : "Read-only: your team lead approves follow-ups for this team."}</p>
          </div>
          {canApprove && pending.length > 0 && <button className="btn" onClick={approveAll}>Approve all {pending.length}</button>}
        </div>

        {/* Voice approval */}
        {canApprove && <div className="card glow mb-5 p-6">
          <div className="mb-2 text-sm font-medium">🎙️ Approve by voice</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="field" value={voice} onChange={(e) => setVoice(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && voice.trim()) interpretVoice(); }}
              placeholder={'Hold Wispr Flow: "Ship everything except the team announcement, and move the sync to Wednesday"'} />
            <button className="btn btn-primary shrink-0" disabled={!voice.trim() || voiceBusy} onClick={interpretVoice}>{voiceBusy ? "Thinking…" : "Interpret"}</button>
          </div>
          {voiceErr && <div className="mt-2 text-sm text-bad">{voiceErr}</div>}
          {voicePlan && (
            <div className="mt-3 rounded-lg bg-accent-soft p-3 text-sm">
              <div className="font-medium">{voicePlan.confirm_text}</div>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-sm btn-primary" disabled={voiceBusy} onClick={confirmVoice}>Confirm &amp; ship</button>
                <button className="btn btn-sm" onClick={() => setVoicePlan(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>}

        <div className="grid gap-4">
          {drafts.map((d) => <DraftCard key={d.id + d.payload_json + d.status} draft={d} note={notes[d.id]} onChange={load} readOnly={!canApprove} />)}
        </div>
      </section>

          </>)}
          {tab === "next" && (<>
      {/* Open-loop brief */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">🔁 Open-Loop Brief</h2>
            <p className="text-sm text-muted">The agenda for your next meeting with these people, built from everything still unresolved.</p>
          </div>
          <button className="btn btn-sm" disabled={briefBusy} onClick={makeBrief}>{briefBusy ? "Writing…" : brief ? "Regenerate" : "Generate brief"}</button>
        </div>
        {brief && <div className="mt-3 rounded-lg bg-surface-2 p-4"><Markdown text={brief} /></div>}
      </section>

          </>)}
        </div>
      </div>

      {b.viewer?.role === "lead" && <div className="text-right"><button className="btn btn-sm" onClick={remove}>Delete meeting</button></div>}

      {/* Ship bar */}
      {approved.length > 0 && (
        <div className="fixed bottom-0 left-[272px] right-0 z-10 border-t border-line bg-bg-2/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm"><b>{approved.length}</b> approved · ~{approved.reduce((s, d) => s + d.minutes_saved, 0)} min of work</div>
            <button className="btn btn-primary" disabled={shipping} onClick={() => ship(approved.map((d) => d.id))}>{shipping ? "Shipping…" : "Ship approved →"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
