"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import Markdown from "./Markdown";

type Step = { tool: string; args: Record<string, unknown>; acted: boolean };
type Msg = { role: "user" | "assistant"; content: string; steps?: Step[]; error?: boolean };

/** Plain-language labels for the agent's tool calls, shown under each reply. */
const STEP_LABEL: Record<string, string> = {
  search_decisions: "Searched decisions", list_action_items: "Checked action items", list_meetings: "Looked through meetings",
  get_conflicts: "Checked conflicts", list_drafts: "Read the approval queue", get_draft: "Opened a draft",
  edit_draft: "Edited a draft", set_draft_status: "Updated approvals", ship_approved: "Shipped follow-ups",
  update_action_item: "Updated a task", resolve_conflict: "Resolved a conflict",
};

/** Tells open pages that Closer changed data, so they reload. */
export const CLOSER_CHANGED = "followthru:changed";

export default function Closer() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const feed = useRef<HTMLDivElement>(null);
  const meetingId = path.match(/^\/meetings\/([^/]+)/)?.[1] ?? null;

  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

  if (path.startsWith("/login") || path.startsWith("/live")) return null;

  const suggestions = meetingId
    ? ["Make the Acme email shorter and warmer", "Move the kickoff call to Tuesday at 4pm", "Approve everything except the announcement", "What did we decide about dark mode before today?"]
    : ["What's overdue across the team?", "What's waiting for my approval?", "Prep me for the Acme beta kickoff", "What did we decide about the launch date?"];

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text.trim() }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/closer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })), page: { path, meetingId } }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Closer is unavailable");
      setMsgs((m) => [...m, { role: "assistant", content: data.answer || "Done.", steps: data.steps }]);
      if (data.changed) window.dispatchEvent(new Event(CLOSER_CHANGED));
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : String(err), error: true }]);
    }
    setBusy(false);
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="fixed bottom-24 right-7 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-br from-accent to-accent-2 py-3.5 pl-4 pr-5 font-semibold text-accent-ink shadow-[0_18px_40px_-12px_rgba(88,129,87,0.9)] transition hover:scale-[1.03]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-ink/15 text-base">✦</span> Closer
        </button>
      )}
      {open && (
        <aside className="fixed bottom-0 right-0 top-0 z-40 flex w-[440px] max-w-full flex-col border-l border-line bg-bg-2/95 shadow-[-30px_0_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg text-accent-ink">✦</span>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold">Closer</div>
              <div className="text-xs text-muted">Closes your open loops: it edits, approves and ships for you.</div>
            </div>
            <button className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div ref={feed} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {msgs.length === 0 && (
              <div className="rise">
                <p className="mb-4 text-[15px] text-muted">
                  Ask about any meeting, or tell me what to change. {meetingId ? "I can see the meeting you have open." : ""} Hold your <b className="text-ink">Wispr Flow</b> key and just talk.
                </p>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-left text-[15px] transition hover:border-accent/40 hover:bg-accent-soft">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`rise flex ${m.role === "user" ? "justify-end" : ""}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] ${m.role === "user" ? "bg-accent-soft text-ink" : m.error ? "border border-bad/40 bg-bad-soft text-bad" : "border border-line bg-surface"}`}>
                  {m.steps && m.steps.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.steps.map((s, j) => (
                        <span key={j} className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${s.acted ? "bg-good-soft text-good" : "bg-surface-2 text-muted"}`}>
                          {s.acted ? "✓ " : "⌕ "}{STEP_LABEL[s.tool] ?? s.tool}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.role === "assistant" && !m.error ? <div className="md"><Markdown text={m.content} /></div> : m.content}
                </div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-muted"><span className="wave"><span /><span /><span /><span /><span /></span> Working…</div>}
          </div>

          <form className="border-t border-line p-4" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <div className="flex gap-2">
              <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="“Make the Acme email warmer and ship it”" />
              <button className="btn btn-primary shrink-0" disabled={!input.trim() || busy}><Icon name="arrow" /></button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
