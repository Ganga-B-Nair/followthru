"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useSession } from "@/components/SessionProvider";

type Integration = {
  id: string; name: string; category: string; blurb: string; does: string[]; scopes: string[]; color: string; letter: string;
  primary?: boolean; soon?: boolean; state: { status: string; account: string | null; connected_at: string | null };
};

function Logo({ i, size = 48 }: { i: Pick<Integration, "color" | "letter">; size?: number }) {
  const dark = i.color === "#E6E6E6";
  return (
    <span className="grid shrink-0 place-items-center rounded-2xl font-bold"
      style={{ width: size, height: size, fontSize: size * 0.42, background: i.color, color: dark ? "#111" : "#fff", boxShadow: `0 10px 30px -12px ${i.color}` }}>
      {i.letter}
    </span>
  );
}

export default function Connections() {
  const { user } = useSession();
  const [data, setData] = useState<{ canManage: boolean; integrations: Integration[] } | null>(null);
  const [consent, setConsent] = useState<Integration | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetch("/api/integrations").then((r) => r.json()).then(setData), []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "connect" | "disconnect") {
    setBusy(true);
    await fetch(`/api/integrations/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setConsent(null);
    load();
  }

  if (!data) return <div className="text-muted">Loading connections…</div>;
  const zoom = data.integrations.find((i) => i.primary)!;
  const rest = data.integrations.filter((i) => !i.primary);
  const groups = [...new Set(rest.map((i) => i.category))];
  const connected = data.integrations.filter((i) => i.state.status === "connected").length;

  const Action = ({ i }: { i: Integration }) =>
    i.soon ? <span className="chip">Coming soon</span>
      : i.state.status === "connected" ? (
        <div className="flex items-center gap-2">
          <span className="chip !border-good/40 !text-good">● Connected</span>
          {data.canManage && <button className="btn btn-sm" onClick={() => act(i.id, "disconnect")}>Disconnect</button>}
        </div>
      ) : data.canManage ? <button className="btn btn-sm btn-primary" onClick={() => setConsent(i)}>Connect</button>
      : <span className="chip"><Icon name="lock" size={13} /> Ask your team lead</span>;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-[34px] font-semibold tracking-tight">Connections</h1>
        <p className="mt-1 text-lg text-muted">FollowThru works alongside the tools you already use. It isn&apos;t a new meeting platform. {connected} connected.</p>
      </section>

      <section className="card glow relative overflow-hidden p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-zoom/25 blur-[90px]" />
        <div className="relative flex flex-wrap items-start gap-6">
          <Logo i={zoom} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">Zoom</h2>
              <span className="chip !border-zoom/40 !text-[var(--zoom)]">Primary meeting source</span>
            </div>
            <p className="mt-2 max-w-2xl text-[16px] text-muted">{zoom.blurb}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {zoom.does.map((d, n) => (
                <div key={d} className="rounded-xl border border-line bg-surface-2 p-3.5 text-[15px]">
                  <div className="mb-1 text-xs font-bold text-good">STEP {n + 1}</div>{d}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-line bg-black/30 p-4 font-mono text-sm text-muted">
              <div className="mb-1 text-xs font-sans font-semibold uppercase tracking-wider">Webhook endpoint (Zoom Marketplace app)</div>
              POST {typeof window !== "undefined" ? window.location.origin : ""}/api/zoom/webhook
              <div className="mt-1 text-xs">events: endpoint.url_validation · meeting.started · meeting.ended · recording.transcript_completed</div>
            </div>
          </div>
          <Action i={zoom} />
        </div>
      </section>

      {groups.map((g) => (
        <section key={g}>
          <div className="label mb-3">{g}</div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rest.filter((i) => i.category === g).map((i) => (
              <div key={i.id} className={`card flex flex-col p-6 ${i.soon ? "opacity-60" : ""}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <Logo i={i} />
                  <Action i={i} />
                </div>
                <div className="text-lg font-semibold">{i.name}</div>
                <p className="mt-1 flex-1 text-[15px] text-muted">{i.blurb}</p>
                {i.state.status === "connected" && i.state.account && <div className="mt-3 text-sm text-muted">as {i.state.account}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}

      {consent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => !busy && setConsent(null)}>
          <div className="card w-full max-w-md !bg-surface-solid p-8 rise" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-2xl font-bold text-accent-ink">↗</span>
              <span className="text-2xl text-muted">⇄</span>
              <Logo i={consent} size={56} />
            </div>
            <h3 className="text-center text-xl font-semibold">FollowThru wants to access your {consent.name} account</h3>
            <p className="mt-1 text-center text-sm text-muted">Signed in as {user?.email}</p>
            <div className="mt-6 space-y-2.5">
              {consent.does.map((d) => <div key={d} className="flex gap-3 text-[15px]"><span className="text-good">✓</span>{d}</div>)}
            </div>
            <div className="mt-4 rounded-xl bg-surface-2 p-3 font-mono text-xs text-muted">scopes: {consent.scopes.join(", ")}</div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button className="btn" onClick={() => setConsent(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-primary" onClick={() => act(consent.id, "connect")} disabled={busy}>{busy ? "Authorizing…" : "Allow"}</button>
            </div>
            <p className="mt-4 text-center text-xs text-muted">Demo consent screen. In production this is {consent.name}&apos;s own OAuth page.</p>
          </div>
        </div>
      )}
    </div>
  );
}
