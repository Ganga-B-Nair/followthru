import { Fragment, type ReactNode } from "react";

// Small Markdown renderer for agent output: headings, lists, checkboxes, bold, and [[TODO]] highlights.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\[TODO:[^\]]*\]\])/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("[[TODO")) return <span key={i} className="todo">{part.slice(2, -2)}</span>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: ReactNode[] } | null = null;
  const flush = () => {
    if (!list) return;
    out.push(list.ordered ? <ol key={out.length}>{list.items}</ol> : <ul key={out.length}>{list.items}</ul>);
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3})\s+(.*)/);
    const todo = line.match(/^\s*[-*]\s+\[( |x)\]\s+(.*)/i);
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (h) {
      flush();
      const Tag = (h[1].length === 1 ? "h1" : h[1].length === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
      out.push(<Tag key={out.length}>{inline(h[2])}</Tag>);
    } else if (todo || bullet || num) {
      const ordered = Boolean(num && !bullet);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      const content = todo ? <>{todo[1] === " " ? "☐ " : "☑ "}{inline(todo[2])}</> : inline((bullet ?? num)![1]);
      list.items.push(<li key={list.items.length} className={todo ? "list-none -ml-4" : ""}>{content}</li>);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      out.push(<p key={out.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="md text-sm leading-relaxed">{out}</div>;
}
