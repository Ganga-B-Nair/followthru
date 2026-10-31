"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useSession } from "@/components/SessionProvider";
import { fmtDate, typeMeta } from "@/lib/ui";

type M = { id: string; title: string; meeting_type: string; held_at: string; summary: string; minutes_saved: number; pending: number; source: string };
type Z = { id: string; topic: string; start_at: string; status: string; notetaker: number; participants_json: string; meeting_id: string | null };

export default function Meetings() {
  const { user } = useSession();
  const [meetings, setMeetings] = useState<M[] | null>(null);
  const [zoom, setZoom] = useState<Z[]>([]);
  const load = useCallback(() => {
    fetch("/api/meetings").then((r) => r.json()).then((d) => setMeetings(d.meetings));
    fetch("/api/zoom/meetings").then((r) => r.json()).then((d) => setZoom(d.meetings ?? []));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function reset() {
    if (!confirm("Reset the demo workspace? This clears everything and reloads the demo data.")) return;
    await fetch("/api/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
    window.location.href = "/";
  }

  const calendar = zoom.filter((z) => z.status !== "processed");

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight">Meetings</h1>
          <p className="mt-1 text-lg text-muted">Zoom calls the notetaker joins, plus everything you recapped by voice.</p>
        </div>
        <div className="flex gap-3">
          {user?.role === "lead" && <button className="btn" onClick={reset}>Reset demo</button>}
          <Link className="btn btn-primary" href="/recap"><Icon name="mic" /> New recap</Link>
        </div>
      </section>

      <section>
        <div className="label mb-3">On Zoom</div>
        <div className="grid gap-4 md:grid-cols-2">
          {calendar.map((z) => (
            <div key={z.id} className={`card flex items-center gap-4 p-5 ${z.status === "live" ? "glow" : ""}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zoom/15 text-[var(--zoom)]"><Icon name="video" size={24} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  {z.status === "live" && <span className="live-dot" />} {z.topic}
                </div>
                <div className="text-sm text-muted">
                  {z.status === "live" ? "Happening now" : `${fmtDate(z.start_at, true)}`} · {JSON.parse(z.participants_json).length} people · notetaker {z.notetaker ? "on" : "off"}
                </div>
              </div>
              {z.status === "live" || z.status === "ended" ? <Link href={`/live/${z.id}`} className="btn btn-zoom btn-sm">Live notes</Link> : <span className="chip">Scheduled</span>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="label mb-3">Notes &amp; follow-ups</div>
        {meetings?.length === 0 && <div className="card p-8 text-center text-muted">No meeting notes you can see yet.</div>}
        <div className="grid gap-4">
          {meetings?.map((m) => {
            const t = typeMeta(m.meeting_type);
            return (
              <Link key={m.id} href={`/meetings/${m.id}`} className="card flex items-center gap-5 p-5 transition hover:border-accent/40">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl">
                  {m.source === "zoom" ? <Icon name="video" className="text-[var(--zoom)]" /> : t.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span className="chip">{m.source === "zoom" ? "Zoom" : "Voice recap"}</span>
                    <span className="chip">{t.icon} {t.label}</span>
                    <span>{fmtDate(m.held_at, true)}</span>
                    {m.pending > 0 && <span className="chip !border-accent/40 !text-accent">{m.pending} awaiting approval</span>}
                  </div>
                  <div className="mt-1.5 text-lg font-semibold">{m.title}</div>
                  <div className="text-muted">{m.summary}</div>
                </div>
                {m.minutes_saved > 0 && <div className="hidden shrink-0 text-right sm:block"><div className="text-2xl font-semibold text-accent">{m.minutes_saved}m</div><div className="text-xs text-muted">saved</div></div>}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
