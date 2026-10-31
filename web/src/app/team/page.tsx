"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Avatar, useSession, type User } from "@/components/SessionProvider";

type Perm = { key: string; label: string; hint: string };
type Data = { catalog: Perm[]; member: Record<string, boolean>; users: User[]; canEdit: boolean };

export default function Team() {
  const { user, refresh } = useSession();
  const [d, setD] = useState<Data | null>(null);
  const [voice, setVoice] = useState("");
  const [plan, setPlan] = useState<{ changes: { key: string; allow: boolean }[]; confirm_text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string[]>([]);

  const load = useCallback(() => fetch("/api/permissions").then((r) => r.json()).then(setD), []);
  useEffect(() => { load(); }, [load]);

  async function save(member: Record<string, boolean>, changed: string[]) {
    const r = await fetch("/api/permissions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ member }) }).then((r) => r.json());
    setD((x) => (x ? { ...x, member: r.member } : x));
    setFlash(changed);
    setTimeout(() => setFlash([]), 1600);
    refresh();
  }

  async function setRole(u: User, role: "lead" | "member") {
    const r = await fetch("/api/permissions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: { userId: u.id, role } }) }).then((r) => r.json());
    setD((x) => (x ? { ...x, users: r.users } : x));
  }

  async function interpret() {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/permissions/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: voice }) });
    const j = await r.json();
    if (!r.ok) setErr(j.error); else setPlan(j);
    setBusy(false);
  }

  async function applyPlan() {
    if (!plan) return;
    await save(Object.fromEntries(plan.changes.map((c) => [c.key, c.allow])), plan.changes.map((c) => c.key));
    setPlan(null);
    setVoice("");
  }

  if (!d) return <div className="text-muted">Loading team…</div>;
  if (!d.canEdit) return <div className="card p-8 text-lg">Only the team lead can manage roles. You&apos;re signed in as a team member.</div>;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-[34px] font-semibold tracking-tight">Team &amp; roles</h1>
        <p className="mt-1 text-lg text-muted">Team leads see everything. You decide what team members can see and do.</p>
      </section>

      <section className="card glow p-7">
        <div className="mb-3 flex items-center gap-3 text-lg font-semibold"><Icon name="mic" className="text-accent" /> Say what members can see</div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <input className="field !py-3.5 text-[16px]" value={voice} onChange={(e) => setVoice(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && voice.trim()) interpret(); }}
            placeholder={'Hold Wispr Flow: "Let members see all meeting notes and conflicts, but not each other\'s tasks"'} />
          <button className="btn btn-primary btn-lg shrink-0" disabled={!voice.trim() || busy} onClick={interpret}>{busy ? "Thinking…" : "Interpret"}</button>
        </div>
        {err && <div className="mt-3 text-bad">{err}</div>}
        {plan && (
          <div className="mt-4 rounded-2xl border border-accent/30 bg-accent-soft p-4 rise">
            <div className="text-[16px] font-medium">{plan.confirm_text}</div>
            {plan.changes.length > 0 && (
              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={applyPlan}>Confirm</button>
                <button className="btn btn-sm" onClick={() => setPlan(null)}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_150px_150px] items-center border-b border-line px-7 py-4">
          <div className="label">Permission</div>
          <div className="label text-center">Team lead</div>
          <div className="label text-center">Team member</div>
        </div>
        {d.catalog.map((p) => (
          <div key={p.key} className={`grid grid-cols-[1fr_150px_150px] items-center border-b border-line px-7 py-4 transition last:border-0 ${flash.includes(p.key) ? "bg-accent-soft" : ""}`}>
            <div>
              <div className="text-[16px] font-medium">{p.label}</div>
              <div className="text-sm text-muted">{p.hint}</div>
            </div>
            <div className="flex justify-center"><span className="chip !border-accent/40 !text-accent"><Icon name="lock" size={12} /> Always</span></div>
            <div className="flex justify-center">
              <button role="switch" aria-checked={d.member[p.key]} onClick={() => save({ [p.key]: !d.member[p.key] }, [p.key])}
                className={`relative h-7 w-12 rounded-full transition ${d.member[p.key] ? "bg-gradient-to-r from-accent to-accent-2" : "bg-surface-2 border border-line"}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${d.member[p.key] ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="label mb-3">People</div>
        <div className="grid gap-4 md:grid-cols-2">
          {d.users.map((u) => (
            <div key={u.id} className="card flex items-center gap-4 p-5">
              <Avatar user={u} size={48} />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">{u.name}</div>
                <div className="text-sm text-muted">{u.title} · {u.email}</div>
              </div>
              {u.id === user?.id ? (
                <span className="chip !border-accent/40 !text-accent">Team lead (you)</span>
              ) : (
                <select className="field !w-auto !py-2 text-sm" value={u.role} onChange={(e) => setRole(u, e.target.value as "lead" | "member")}>
                  <option value="lead">Team lead</option>
                  <option value="member">Team member</option>
                </select>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
