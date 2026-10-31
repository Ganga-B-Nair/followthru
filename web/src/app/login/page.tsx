"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { Avatar, type User } from "@/components/SessionProvider";

export default function Login() {
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { fetch("/api/auth").then((r) => r.json()).then((d) => setUsers(d.demoUsers ?? [])); }, []);

  async function signIn(id: string) {
    setBusy(id);
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
    window.location.href = "/";
  }

  const lead = users.find((u) => u.role === "lead");
  const members = users.filter((u) => u.role === "member");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-14 lg:flex">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent/25 blur-[120px]" />
        <div className="absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-accent-2/15 blur-[120px]" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-xl font-bold text-accent-ink">↗</span>
          <span className="text-xl font-semibold">FollowThru</span>
        </div>
        <div className="relative max-w-xl">
          <div className="chip mb-6 !border-zoom/40 !text-[var(--zoom)]"><Icon name="video" size={14} /> Works alongside Zoom</div>
          <h1 className="text-[56px] font-semibold leading-[1.05] tracking-tight">
            Other tools turn meetings into to-dos.<br /><span className="gradient-text">FollowThru turns them into done.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            An AI notetaker joins your Zoom call. When it ends, the follow-up emails, invites, docs and tasks are already drafted,
            checked against everything your team decided before, and waiting for one approval.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 text-sm">
          {[["🎙️", "Built for voice", "Wispr Flow in, structured work out"], ["🧠", "Remembers", "Catches contradicting decisions"], ["✅", "Does the work", "Approve by click or by voice"]].map(([i, t, d]) => (
            <div key={t} className="card p-4"><div className="text-xl">{i}</div><div className="mt-2 font-semibold">{t}</div><div className="text-muted">{d}</div></div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-muted">Demo workspace · Acme Product Team. Pick an account to see what each role can see.</p>

          <button disabled className="btn btn-zoom btn-lg mt-8 w-full opacity-60" title="Production sign-in: Sign in with Zoom (OAuth)">
            <Icon name="video" /> Sign in with Zoom <span className="text-xs opacity-80">(production)</span>
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-line" /> DEMO ACCOUNTS <div className="h-px flex-1 bg-line" /></div>

          {lead && (
            <button onClick={() => signIn(lead.id)} disabled={!!busy}
              className="card glow mb-3 flex w-full items-center gap-4 p-5 text-left transition hover:scale-[1.01]">
              <Avatar user={lead} size={48} />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-lg font-semibold">{lead.name} <span className="chip !border-accent/40 !text-accent">Team lead</span></div>
                <div className="text-sm text-muted">{lead.title} · sees everything, controls what members see</div>
              </div>
              <Icon name="arrow" className="text-muted" />
            </button>
          )}
          {members.map((u) => (
            <button key={u.id} onClick={() => signIn(u.id)} disabled={!!busy}
              className="card mb-3 flex w-full items-center gap-4 p-4 text-left transition hover:bg-surface-2">
              <Avatar user={u} size={42} />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold">{u.name} <span className="chip !border-good/40 !text-good">Team member</span></div>
                <div className="text-sm text-muted">{u.title}</div>
              </div>
              {busy === u.id ? <span className="text-sm text-muted">Signing in…</span> : <Icon name="arrow" className="text-muted" />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
