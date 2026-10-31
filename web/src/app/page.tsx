"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useSession } from "@/components/SessionProvider";
import { fmtDate, typeMeta } from "@/lib/ui";

type Zoom = { id: string; topic: string; start_at: string; duration: number; status: string; notetaker: number; participants_json: string; meeting_id: string | null };
type Dash = {
  stats: { minutes: number; shipped: number; conflicts: number; followThrough: number; openLoops: number } | null;
  zoom: Zoom[];
  meetings: { id: string; title: string; meeting_type: string; held_at: string; summary: string; source: string }[];
  myItems: { id: string; text: string; due_at: string | null; status: string; meeting_title: string }[];
  teamItems: { id: string; text: string; owner: string | null; due_at: string | null; status: string }[];
  pending: { meeting_id: string; title: string; n: number }[];
  decisions: { text: string; status: string; meeting_title: string; held_at: string }[];
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function Dashboard() {
  const { user } = useSession();
  const [d, setD] = useState<Dash | null>(null);
  const load = useCallback(() => fetch("/api/dashboard").then((r) => r.json()).then(setD), []);
  useEffect(() => { load(); }, [load]);

  async function toggleNotetaker(z: Zoom) {
    await fetch(`/api/zoom/meetings/${z.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notetaker: !z.notetaker }) });
    load();
  }

  if (!d || !user) return <div className="text-muted">Loading your workspace…</div>;
  const live = d.zoom.find((z) => z.status === "live" || z.status === "ended");
  const upcoming = d.zoom.filter((z) => z.status === "scheduled");
  const now = Date.now();

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight">{greeting()}, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-lg text-muted">
            {d.pending.length ? `${d.pending.reduce((a, p) => a + p.n, 0)} follow-ups are drafted and waiting for you.` : "Everything from your meetings is followed through."}
          </p>
        </div>
        <Link href="/recap" className="btn btn-primary btn-lg"><Icon name="mic" /> Walk-out Recap</Link>
      </section>

      {live && (
        <section className="card glow relative overflow-hidden p-7 rise">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zoom/25 blur-[90px]" />
          <div className="relative flex flex-wrap items-center gap-6">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-zoom text-white shadow-lg shadow-zoom/40"><Icon name="video" size={30} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--live)]">
                {live.status === "live" ? <><span className="live-dot" /> LIVE ON ZOOM</> : "ENDED ON ZOOM · TRANSCRIPT READY"}
              </div>
              <div className="mt-1 text-2xl font-semibold">{live.topic}</div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-muted">
                <span className="flex items-center gap-2"><span className="wave"><span /><span /><span /><span /><span /></span> FollowThru notetaker is in the call</span>
                <span>· {JSON.parse(live.participants_json).length} participants</span>
              </div>
            </div>
            <Link href={`/live/${live.id}`} className="btn btn-zoom btn-lg">Open live notes <Icon name="arrow" /></Link>
          </div>
        </section>
      )}

      {d.stats && (
        <section className="grid grid-cols-2 gap-5 xl:grid-cols-4">
          {[
            { label: "Hours of follow-up done for you", value: `${(d.stats.minutes / 60).toFixed(1)}h`, icon: "clock", tone: "text-accent" },
            { label: "Follow-ups shipped", value: d.stats.shipped, icon: "zap", tone: "text-good" },
            { label: "Contradictions caught", value: d.stats.conflicts, icon: "alert", tone: "text-warn" },
            { label: "Team follow-through rate", value: `${d.stats.followThrough}%`, icon: "check", tone: "text-good" },
          ].map((s, i) => (
            <div key={s.label} className="card p-6 rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl bg-surface-2 ${s.tone}`}><Icon name={s.icon} /></div>
              <div className="text-4xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-1 text-muted">{s.label}</div>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr] [&>*]:min-w-0">
        <div className="space-y-6">
          {d.pending.length > 0 && (
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Waiting for your approval</h2>
                <span className="chip">{d.pending.reduce((a, p) => a + p.n, 0)} drafts</span>
              </div>
              <div className="space-y-2">
                {d.pending.map((p) => (
                  <Link key={p.meeting_id} href={`/meetings/${p.meeting_id}`} className="flex items-center justify-between rounded-xl border border-line px-4 py-3.5 hover:bg-surface-2">
                    <span className="font-medium">{p.title}</span>
                    <span className="flex items-center gap-2 text-accent">{p.n} ready <Icon name="arrow" size={16} /></span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Upcoming on Zoom</h2>
              <span className="chip !border-zoom/40 !text-[var(--zoom)]"><Icon name="calendar" size={14} /> Synced from Google Calendar</span>
            </div>
            <div className="divide-y divide-line">
              {upcoming.map((z) => (
                <div key={z.id} className="flex items-center gap-4 py-3.5">
                  <div className="w-24 shrink-0 text-sm">
                    <div className="font-semibold">{new Date(z.start_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</div>
                    <div className="text-muted">{new Date(z.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{z.topic}</div>
                    <div className="truncate text-sm text-muted">{JSON.parse(z.participants_json).join(", ")}</div>
                  </div>
                  <button onClick={() => toggleNotetaker(z)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${z.notetaker ? "border-accent/40 bg-accent-soft text-accent" : "border-line text-muted"}`}>
                    <span className={`h-2 w-2 rounded-full ${z.notetaker ? "bg-accent" : "bg-muted"}`} /> {z.notetaker ? "Notetaker joins" : "Notetaker off"}
                  </button>
                </div>
              ))}
              {upcoming.length === 0 && <div className="py-3 text-muted">No upcoming Zoom meetings you&apos;re invited to.</div>}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent meeting notes</h2>
              <Link href="/meetings" className="text-sm text-accent">All meetings →</Link>
            </div>
            <div className="space-y-2">
              {d.meetings.map((m) => (
                <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center gap-4 rounded-xl px-3 py-3 hover:bg-surface-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-lg">{m.source === "zoom" ? <Icon name="video" className="text-[var(--zoom)]" /> : typeMeta(m.meeting_type).icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.title}</div>
                    <div className="truncate text-sm text-muted">{m.summary}</div>
                  </div>
                  <span className="shrink-0 text-sm text-muted">{fmtDate(m.held_at)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 text-xl font-semibold">On your plate</h2>
            {d.myItems.length === 0 && <div className="text-muted">Nothing assigned to you. 🎉</div>}
            <div className="space-y-3">
              {d.myItems.map((i) => {
                const overdue = i.due_at && new Date(i.due_at).getTime() < now;
                return (
                  <div key={i.id} className="rounded-xl border border-line p-3.5">
                    <div className="font-medium">{i.text}</div>
                    <div className={`mt-1 text-sm ${overdue ? "text-bad" : "text-muted"}`}>
                      {i.due_at ? `${overdue ? "Overdue · " : "Due "}${fmtDate(i.due_at, true)}` : "No deadline"} · {i.meeting_title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {d.teamItems.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-4 text-xl font-semibold">Team open loops</h2>
              <div className="space-y-2.5">
                {d.teamItems.map((i) => (
                  <div key={i.id} className="flex items-start justify-between gap-3 text-[15px]">
                    <span>{i.text}</span>
                    <span className="chip shrink-0">{i.owner ?? "Unassigned"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.decisions.length > 0 && (
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Latest decisions</h2>
                <Link href="/decisions" className="text-sm text-accent">Memory →</Link>
              </div>
              <div className="space-y-3">
                {d.decisions.map((x, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mt-1.5 text-accent">◆</span>
                    <div>
                      <div className={x.status === "superseded" ? "text-muted line-through" : ""}>{x.text}</div>
                      <div className="text-sm text-muted">{x.meeting_title} · {fmtDate(x.held_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
