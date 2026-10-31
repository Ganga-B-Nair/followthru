import { Client as Notion } from "@notionhq/client";

// Gmail and Google Calendar open as pre-filled pages in the user's own signed-in
// browser, so FollowThru never holds Google credentials. Notion and GitHub use
// tokens configured on the server.

type Email = { to: string[]; subject: string; body: string };
type Calendar = { title: string; start_iso: string; end_iso: string; attendees: string[]; agenda: string };
type Doc = { title: string; markdown: string };
type Task = { title: string; description: string; owner: string | null; due_iso: string | null };

const realAddresses = (xs: string[]) => xs.filter((x) => /^[^\s@\[]+@[^\s@]+\.[^\s@]+$/.test(x));

export function gmailUrl(e: Email): string {
  const q = new URLSearchParams({ view: "cm", fs: "1", to: realAddresses(e.to).join(","), su: e.subject, body: e.body });
  return `https://mail.google.com/mail/?${q}`;
}

const gcalStamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function gcalUrl(c: Calendar): string {
  const q = new URLSearchParams({
    action: "TEMPLATE", text: c.title, dates: `${gcalStamp(c.start_iso)}/${gcalStamp(c.end_iso)}`,
    details: c.agenda, add: realAddresses(c.attendees).join(","),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function ics(c: Calendar): string {
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FollowThru//EN", "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@followthru`, `DTSTAMP:${gcalStamp(new Date().toISOString())}`,
    `DTSTART:${gcalStamp(c.start_iso)}`, `DTEND:${gcalStamp(c.end_iso)}`,
    `SUMMARY:${esc(c.title)}`, `DESCRIPTION:${esc(c.agenda)}`,
    ...realAddresses(c.attendees).map((a) => `ATTENDEE:mailto:${a}`),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export const notionEnabled = () => Boolean(process.env.NOTION_TOKEN && process.env.NOTION_PARENT_PAGE_ID);
export const githubEnabled = () => Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);

const rich = (content: string) => [{ type: "text" as const, text: { content: content.slice(0, 1900) } }];

/** Minimal Markdown to Notion blocks: headings, bullets, checkboxes, paragraphs. */
function blocks(markdown: string) {
  return markdown.split("\n").filter((l) => l.trim()).slice(0, 95).map((line) => {
    const t = line.trim();
    if (t.startsWith("### ")) return { object: "block" as const, type: "heading_3" as const, heading_3: { rich_text: rich(t.slice(4)) } };
    if (t.startsWith("## ")) return { object: "block" as const, type: "heading_2" as const, heading_2: { rich_text: rich(t.slice(3)) } };
    if (t.startsWith("# ")) return { object: "block" as const, type: "heading_1" as const, heading_1: { rich_text: rich(t.slice(2)) } };
    const todo = t.match(/^[-*] \[( |x)\] (.*)/i);
    if (todo) return { object: "block" as const, type: "to_do" as const, to_do: { rich_text: rich(todo[2]), checked: todo[1] !== " " } };
    if (/^[-*] /.test(t)) return { object: "block" as const, type: "bulleted_list_item" as const, bulleted_list_item: { rich_text: rich(t.slice(2)) } };
    return { object: "block" as const, type: "paragraph" as const, paragraph: { rich_text: rich(t) } };
  });
}

export async function createNotionPage(title: string, markdown: string): Promise<string> {
  const notion = new Notion({ auth: process.env.NOTION_TOKEN });
  const page = await notion.pages.create({
    parent: { page_id: process.env.NOTION_PARENT_PAGE_ID! },
    properties: { title: { title: rich(title) } },
    children: blocks(markdown),
  });
  return "url" in page ? page.url : `https://www.notion.so/${page.id.replace(/-/g, "")}`;
}

export function taskMarkdown(t: Task): string {
  return [
    `- [ ] ${t.title}`,
    t.owner ? `Owner: ${t.owner}` : "",
    t.due_iso ? `Due: ${new Date(t.due_iso).toLocaleString("en-GB", { timeZone: process.env.FOLLOWTHRU_TZ || "Asia/Kolkata" })}` : "",
    "", t.description,
  ].filter((l, i) => l || i === 3).join("\n");
}

export async function createGithubIssue(t: Task): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({ title: t.title, body: taskMarkdown(t) }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return (await res.json()).html_url as string;
}

export type { Calendar, Doc, Email, Task };
