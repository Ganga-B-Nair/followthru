"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtDate, typeMeta } from "@/lib/ui";

type D = { id: string; text: string; status: string; meeting_id: string; meeting_title: string; meeting_type: string; held_at: string; topic_tags_json: string };
type C = { id: string; new_decision_id: string; old_decision_id: string; kind: string; explanation: string; resolution: string | null };

const STATUS: Record<string, string> = { active: "", superseded: "line-through text-muted", flagged: "" };

export default function Decisions() {
  const [data, setData] = useState<{ decisions: D[]; conflicts: C[] } | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { fetch("/api/decisions").then((r) => r.json()).then(setData); }, []);

  const list = (data?.decisions ?? []).filter((d) => !q || `${d.text} ${d.topic_tags_json} ${d.meeting_title}`.toLowerCase().includes(q.toLowerCase()));
  const conflictFor = (id: string) => data?.conflicts.filter((c) => c.new_decision_id === id || c.old_decision_id === id) ?? [];

  return (
    <div>
      <h1 className="text-[34px] font-semibold tracking-tight">Decision memory</h1>
      <p className="mb-6 mt-1 text-lg text-muted">Every decision from every meeting, with what replaced what.</p>
      <input className="field mb-4" placeholder="Filter: launch, rent, exam…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ol className="relative space-y-3 border-l-2 border-line pl-5">
        {list.map((d) => {
          const t = typeMeta(d.meeting_type);
          const cs = conflictFor(d.id);
          return (
            <li key={d.id} className="relative">
              <span className={`absolute -left-[27px] top-4 h-3 w-3 rounded-full ${d.status === "superseded" ? "bg-line" : d.status === "flagged" ? "bg-warn" : "bg-accent"}`} />
              <div className="card p-5">
                <div className={`text-[16px] ${STATUS[d.status] ?? ""}`}>{d.text}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>{t.icon}</span>
                  <Link href={`/meetings/${d.meeting_id}`} className="hover:underline">{d.meeting_title}</Link>
                  <span>· {fmtDate(d.held_at)}</span>
                  {d.status !== "active" && <span className={`chip ${d.status === "flagged" ? "!bg-warn-soft !text-warn" : ""}`}>{d.status}</span>}
                  {(JSON.parse(d.topic_tags_json || "[]") as string[]).map((tag) => <span key={tag} className="chip">#{tag}</span>)}
                </div>
                {cs.map((c) => (
                  <div key={c.id} className="mt-2 rounded-lg bg-warn-soft p-2 text-xs text-warn">⚠ {c.explanation}{c.resolution ? ` (resolved: ${c.resolution.replace("_", " ")})` : ""}</div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      {list.length === 0 && <div className="text-sm text-muted">No decisions yet.</div>}
    </div>
  );
}
