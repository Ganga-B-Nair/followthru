"use client";

import { useState } from "react";
import Markdown from "@/components/Markdown";

const EXAMPLES = [
  "What did we decide about the launch date, and has it changed?",
  "What do I still owe the landlord?",
  "What's overdue across everything?",
  "When is my physics test?",
];

export default function Ask() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ answer?: string; steps?: string[]; error?: string } | null>(null);

  async function ask(question = q) {
    if (!question.trim()) return;
    setQ(question);
    setBusy(true);
    setRes(null);
    const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    setRes(await r.json());
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-[34px] font-semibold tracking-tight">Ask your meetings</h1>
      <p className="mb-6 mt-1 text-lg text-muted">Speak a question with Wispr Flow. The memory agent searches every decision and commitment and cites where each answer came from.</p>
      <div className="card p-6">
        <textarea className="field" rows={3} value={q} onChange={(e) => setQ(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
          placeholder={'"Um, what did we land on for pricing, the Pro plan I mean?"'} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((e) => <button key={e} className="btn btn-sm" onClick={() => ask(e)}>{e}</button>)}
          </div>
          <button className="btn btn-primary" disabled={busy || !q.trim()} onClick={() => ask()}>{busy ? "Searching…" : "Ask"}</button>
        </div>
      </div>
      {res && (
        <div className="card mt-4 p-4">
          {res.error ? <div className="text-sm text-bad">{res.error}</div> : <Markdown text={res.answer ?? ""} />}
          {res.steps && res.steps.length > 0 && (
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer">Agent ran {res.steps.length} memory lookup{res.steps.length === 1 ? "" : "s"}</summary>
              <ul className="mt-1 space-y-0.5 font-mono">{res.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
