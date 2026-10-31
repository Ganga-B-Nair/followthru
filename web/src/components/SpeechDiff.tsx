import type { ReactNode } from "react";

type Correction = { original: string; resolved: string; kind: "self_correction" | "filler" | "digression" };

/** Raw dictation with every discarded phrase struck through and its resolution shown inline. */
export default function SpeechDiff({ raw, corrections }: { raw: string; corrections: Correction[] }) {
  const lower = raw.toLowerCase();
  const spans: { start: number; end: number; c: Correction }[] = [];
  for (const c of corrections) {
    if (!c.original) continue;
    let from = 0;
    for (;;) {
      const i = lower.indexOf(c.original.toLowerCase(), from);
      if (i === -1) break;
      const end = i + c.original.length;
      if (!spans.some((s) => i < s.end && end > s.start)) { spans.push({ start: i, end, c }); break; }
      from = i + 1;
    }
  }
  spans.sort((a, b) => a.start - b.start);

  const out: ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, k) => {
    if (s.start > pos) out.push(plain(raw.slice(pos, s.start), k));
    const text = raw.slice(s.start, s.end);
    if (s.c.kind === "self_correction") {
      out.push(
        <span key={k} className="whitespace-normal">
          <del className="rounded bg-bad-soft px-0.5 text-bad decoration-2">{text}</del>
          {s.c.resolved && <ins className="ml-1 rounded bg-good-soft px-1 font-medium text-good no-underline">→ {s.c.resolved}</ins>}
        </span>,
      );
    } else if (s.c.kind === "digression") {
      out.push(<del key={k} className="text-muted/70 decoration-muted/50" title="Digression removed">{text}</del>);
    } else {
      out.push(<del key={k} className="text-muted/60 decoration-muted/40" title="Filler removed">{text}</del>);
    }
    pos = s.end;
  });
  if (pos < raw.length) out.push(plain(raw.slice(pos), "end"));
  return <p className="text-[16px] leading-8">{out}</p>;
}

/** Bold "Speaker:" labels at the start of transcript lines. */
function plain(text: string, key: string | number): ReactNode {
  const parts = text.split(/((?:^|\n)[A-Z][\w .]{0,30}:)/g);
  return <span key={`p${key}`}>{parts.map((p, i) => (/^\n?[A-Z][\w .]{0,30}:$/.test(p) ? <b key={i} className="text-good">{p}</b> : p))}</span>;
}
