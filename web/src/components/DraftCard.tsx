"use client";

import { useState } from "react";
import Markdown from "./Markdown";

export type Draft = {
  id: string; executor: string; why: string; payload_json: string; status: string;
  external_url: string | null; minutes_saved: number;
};
type Payload = Record<string, Record<string, unknown> | null>;

const META: Record<string, { icon: string; label: string; ship: string }> = {
  email: { icon: "✉️", label: "Email", ship: "Open in Gmail" },
  calendar: { icon: "📅", label: "Calendar invite", ship: "Open in Google Calendar" },
  doc: { icon: "📄", label: "Document", ship: "Open in Notion" },
  announce: { icon: "📣", label: "Announcement", ship: "Copy" },
  task: { icon: "☑️", label: "Task", ship: "Open task" },
};

const fmt = (iso?: unknown) =>
  typeof iso === "string" && iso
    ? new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

export default function DraftCard({ draft, note, onChange, readOnly = false }: { draft: Draft; note?: string; onChange: () => void; readOnly?: boolean }) {
  const payload: Payload = JSON.parse(draft.payload_json);
  const body = payload[draft.executor] ?? {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v ?? "")])),
  );
  const meta = META[draft.executor] ?? META.task;

  async function patch(data: object) {
    await fetch(`/api/drafts/${draft.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    onChange();
  }

  async function save() {
    const next: Record<string, unknown> = { ...body };
    for (const [k, v] of Object.entries(form)) next[k] = Array.isArray(body[k]) ? v.split(/\s*,\s*/).filter(Boolean) : v;
    await patch({ payload: { ...payload, [draft.executor]: next } });
    setEditing(false);
  }

  const copyText = String(body.markdown ?? body.text ?? body.body ?? body.description ?? "");
  const executed = draft.status === "executed";
  const tone =
    executed ? "border-good/40" : draft.status === "approved" ? "border-accent/60 ring-1 ring-accent/30" : draft.status === "rejected" ? "opacity-50" : "";

  return (
    <div className={`card p-6 ${tone}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-lg">{meta.icon}</span>
        <span className="text-[17px] font-semibold">{meta.label}</span>
        <span className="chip">{draft.why}</span>
        <span className="chip ml-auto">~{draft.minutes_saved} min saved</span>
      </div>

      {editing ? (
        <div className="space-y-2">
          {Object.keys(form).map((k) => (
            <label key={k} className="block text-xs text-muted">
              {k.replace("_", " ")}
              {["body", "markdown", "agenda", "description", "text"].includes(k) ? (
                <textarea className="field mt-1 font-mono text-[13px]" rows={k === "markdown" ? 12 : 6} value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              ) : (
                <input className="field mt-1" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              )}
            </label>
          ))}
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={save}>Save</button>
            <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <Preview executor={draft.executor} body={body} />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {executed ? (
          <>
            <span className="chip !bg-good-soft !text-good">✓ Shipped</span>
            {draft.external_url && (
              <a className="btn btn-sm btn-primary" href={draft.external_url} target="_blank" rel="noreferrer">{meta.ship} ↗</a>
            )}
            {draft.executor === "calendar" && <a className="btn btn-sm" href={`/api/drafts/${draft.id}/ics`}>Download .ics</a>}
            {!draft.external_url && copyText && (
              <button className="btn btn-sm" onClick={() => navigator.clipboard.writeText(copyText)}>Copy text</button>
            )}
            {note && <span className="text-xs text-muted">{note}</span>}
          </>
        ) : readOnly ? (
          <span className="chip">{draft.status === "approved" ? "Approved by lead" : draft.status === "rejected" ? "Rejected" : "Waiting for lead approval"}</span>
        ) : (
          <>
            <button className={`btn btn-sm ${draft.status === "approved" ? "btn-primary" : ""}`}
              onClick={() => patch({ status: draft.status === "approved" ? "pending" : "approved" })}>
              {draft.status === "approved" ? "✓ Approved" : "Approve"}
            </button>
            <button className="btn btn-sm" onClick={() => patch({ status: draft.status === "rejected" ? "pending" : "rejected" })}>
              {draft.status === "rejected" ? "Restore" : "Reject"}
            </button>
            {!editing && <button className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>}
          </>
        )}
      </div>
    </div>
  );
}

function Preview({ executor, body }: { executor: string; body: Record<string, unknown> }) {
  const s = (k: string) => String(body[k] ?? "");
  const list = (k: string) => (Array.isArray(body[k]) ? (body[k] as string[]).join(", ") : s(k));
  if (executor === "email")
    return (
      <div className="space-y-1 text-sm">
        <div><span className="text-muted">To:</span> {list("to") || <span className="rounded bg-warn-soft px-1 text-warn">add recipient</span>}</div>
        <div><span className="text-muted">Subject:</span> <b>{s("subject")}</b></div>
        <div className="mt-2 rounded-lg bg-surface-2 p-3"><Markdown text={s("body")} /></div>
      </div>
    );
  if (executor === "calendar")
    return (
      <div className="space-y-1 text-sm">
        <div className="font-semibold">{s("title")}</div>
        <div>{fmt(body.start_iso)} – {fmt(body.end_iso).split(", ").pop()}</div>
        {list("attendees") && <div><span className="text-muted">With:</span> {list("attendees")}</div>}
        <div className="mt-2 rounded-lg bg-surface-2 p-3"><Markdown text={s("agenda")} /></div>
      </div>
    );
  if (executor === "doc")
    return (
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold">{s("title")} <span className="font-normal text-muted">(preview)</span></summary>
        <div className="mt-2 max-h-80 overflow-auto rounded-lg bg-surface-2 p-3"><Markdown text={s("markdown")} /></div>
      </details>
    );
  if (executor === "announce")
    return (
      <div className="text-sm">
        <div className="text-muted">For: {s("channel_hint")}</div>
        <div className="mt-2 rounded-lg bg-surface-2 p-3"><Markdown text={s("text")} /></div>
      </div>
    );
  return (
    <div className="text-sm">
      <div className="font-semibold">{s("title")}</div>
      <div className="text-muted">{[s("owner") && `Owner: ${s("owner")}`, body.due_iso ? `Due ${fmt(body.due_iso)}` : ""].filter(Boolean).join(" · ")}</div>
      <div className="mt-1"><Markdown text={s("description")} /></div>
    </div>
  );
}
