"use client";

import { useCallback, useEffect, useState } from "react";
import Markdown from "@/components/Markdown";
import { fmtDate } from "@/lib/ui";

type Person = { name: string; email: string | null; open_count: number; done_count: number };
type Item = { id: string; text: string; owner: string | null; due_at: string | null; status: string; blocked_reason: string | null; meeting_title: string };
type Update = { action_id: string; status: string; blocked_reason: string | null; new_due_iso: string | null };

export default function People() {
  const [data, setData] = useState<{ people: Person[]; items: Item[] } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [digest, setDigest] = useState<{ markdown: string; emailUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkin, setCheckin] = useState("");
  const [plan, setPlan] = useState<{ updates: Update[]; confirm_text: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => fetch("/api/people").then((r) => r.json()).then((d) => {
    setData(d);
    setSel((s) => s ?? d.people[0]?.name ?? null);
  }), []);
  useEffect(() => { load(); }, [load]);

  const items = data?.items.filter((i) => i.owner?.toLowerCase() === sel?.toLowerCase()) ?? [];
  const now = Date.now();

  async function makeDigest() {
    setBusy(true);
    const d = await fetch(`/api/digest?person=${encodeURIComponent(sel!)}`).then((r) => r.json());
    if (d.error) setErr(d.error); else setDigest(d);
    setBusy(false);
  }

  async function parseCheckin() {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/checkins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person: sel, text: checkin }) });
    const d = await r.json();
    if (!r.ok) setErr(d.error); else setPlan(d);
    setBusy(false);
  }

  async function confirmCheckin() {
    await fetch("/api/checkins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person: sel, text: checkin, updates: plan!.updates, confirm: true }) });
    setPlan(null);
    setCheckin("");
    load();
  }

  async function toggle(i: Item) {
    await fetch(`/api/actions/${i.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: i.status === "done" ? "open" : "done" }) });
    load();
  }

  return (
    <div>
      <h1 className="text-[34px] font-semibold tracking-tight">People</h1>
      <p className="mb-6 mt-1 text-lg text-muted">What each person owes, a weekly digest, and voice check-ins.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {data?.people.map((p) => (
          <button key={p.name} onClick={() => { setSel(p.name); setDigest(null); setPlan(null); }}
            className={`btn btn-sm ${sel === p.name ? "btn-primary" : ""}`}>
            {p.name} <span className="opacity-70">{p.open_count}</span>
          </button>
        ))}
      </div>
      {sel && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
          <div className="card p-6">
            <h2 className="mb-2 font-semibold">{sel === "Me" ? "Your" : `${sel}'s`} items</h2>
            {items.length === 0 && <div className="text-sm text-muted">Nothing assigned.</div>}
            <ul className="space-y-2">
              {items.map((i) => {
                const overdue = i.status !== "done" && i.due_at && new Date(i.due_at).getTime() < now;
                return (
                  <li key={i.id} className="flex gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={i.status === "done"} onChange={() => toggle(i)} />
                    <div>
                      <div className={i.status === "done" ? "text-muted line-through" : ""}>{i.text}</div>
                      <div className="text-xs text-muted">
                        {i.due_at ? <span className={overdue ? "text-bad" : ""}>{overdue ? "Overdue · " : "Due "}{fmtDate(i.due_at, true)}</span> : "No deadline"} · {i.meeting_title}
                        {i.status === "blocked" && <span className="text-warn"> · Blocked: {i.blocked_reason}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="card p-6">
              <div className="mb-2 text-sm font-medium">🎙️ Voice check-in</div>
              <textarea className="field" rows={3} value={checkin} onChange={(e) => setCheckin(e.target.value)}
                placeholder={'"Done with the regression suite, uh, but the sign-off is stuck waiting on Priya"'} />
              <button className="btn btn-sm btn-primary mt-2" disabled={!checkin.trim() || busy} onClick={parseCheckin}>Update my items</button>
              {err && <div className="mt-2 text-sm text-bad">{err}</div>}
              {plan && (
                <div className="mt-3 rounded-lg bg-accent-soft p-3 text-sm">
                  <div className="font-medium">{plan.confirm_text}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn btn-sm btn-primary" onClick={confirmCheckin}>Confirm</button>
                    <button className="btn btn-sm" onClick={() => setPlan(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">📬 Weekly digest</div>
                <button className="btn btn-sm" disabled={busy} onClick={makeDigest}>{busy ? "Writing…" : "Generate"}</button>
              </div>
              {digest && (
                <>
                  <div className="mt-3 rounded-lg bg-surface-2 p-3"><Markdown text={digest.markdown} /></div>
                  <a className="btn btn-sm mt-2" href={digest.emailUrl} target="_blank" rel="noreferrer">Email it to {sel} ↗</a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
