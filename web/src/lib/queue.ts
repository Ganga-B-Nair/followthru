import { all, nowIso, one, run, type DraftRow } from "./db";
import {
  createGithubIssue, createNotionPage, gcalUrl, githubEnabled, gmailUrl, notionEnabled, taskMarkdown,
  type Calendar, type Doc, type Email, type Task,
} from "./executors";
import type { VoiceCommand } from "./schemas";

export type Payload = { email: Email | null; calendar: Calendar | null; doc: Doc | null; announce: { channel_hint: string; text: string } | null; task: Task | null };

export type ExecResult = { id: string; ok: boolean; url: string | null; note: string };

/** Ship drafts that are already approved. Nothing unapproved ever leaves the app. */
export async function executeApproved(ids: string[]): Promise<ExecResult[]> {
  const results: ExecResult[] = [];
  for (const id of ids) {
    const d = await one<DraftRow>("SELECT * FROM drafts WHERE id = ?", [id]);
    if (!d) continue;
    if (d.status !== "approved") {
      results.push({ id, ok: false, url: null, note: "Not approved" });
      continue;
    }
    const p: Payload = JSON.parse(d.payload_json);
    try {
      let url: string | null = null;
      let note = "";
      if (d.executor === "email" && p.email) {
        url = gmailUrl(p.email);
        note = "Opens in Gmail, ready to send";
      } else if (d.executor === "calendar" && p.calendar) {
        url = gcalUrl(p.calendar);
        note = "Opens in Google Calendar, ready to save";
      } else if (d.executor === "doc" && p.doc) {
        if (notionEnabled()) {
          url = await createNotionPage(p.doc.title, p.doc.markdown);
          note = "Created in Notion";
        } else note = "Copied as Markdown (connect Notion to create pages)";
      } else if (d.executor === "task" && p.task) {
        if (githubEnabled()) {
          url = await createGithubIssue(p.task);
          note = "GitHub issue created";
        } else if (notionEnabled()) {
          url = await createNotionPage(p.task.title, taskMarkdown(p.task));
          note = "Task created in Notion";
        } else note = "Added to FollowThru's tracker";
      } else if (d.executor === "announce") {
        note = "Copy and paste into your group";
      }
      await run("UPDATE drafts SET status = 'executed', external_url = ?, executed_at = ? WHERE id = ?", [url, nowIso(), id]);
      results.push({ id, ok: true, url, note });
    } catch (err) {
      results.push({ id, ok: false, url: null, note: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

/** Apply approve/reject/edit operations produced by a voice command or the UI. */
export async function applyOps(ops: VoiceCommand["ops"]): Promise<void> {
  for (const op of ops) {
    for (const id of op.ids) {
      const d = await one<DraftRow>("SELECT * FROM drafts WHERE id = ?", [id]);
      if (!d || d.status === "executed") continue;
      if (op.op === "approve") await run("UPDATE drafts SET status = 'approved' WHERE id = ?", [id]);
      else if (op.op === "reject") await run("UPDATE drafts SET status = 'rejected' WHERE id = ?", [id]);
      else if (op.op === "edit" && op.field && op.value != null) {
        const payload = JSON.parse(d.payload_json);
        setPath(payload, op.field, op.value);
        await run("UPDATE drafts SET payload_json = ? WHERE id = ?", [JSON.stringify(payload), id]);
      }
    }
  }
}

function setPath(obj: Record<string, unknown>, path: string, value: string) {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (const k of keys.slice(0, -1)) {
    if (typeof cur[k] !== "object" || cur[k] === null) return;
    cur = cur[k] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  cur[last] = Array.isArray(cur[last]) ? value.split(/\s*,\s*/) : value;
}

export async function queueSummary(meetingId: string) {
  const drafts = await all<DraftRow>("SELECT * FROM drafts WHERE meeting_id = ? ORDER BY rowid", [meetingId]);
  return drafts.map((d) => {
    const p: Payload = JSON.parse(d.payload_json);
    const label = p.email?.subject ?? p.calendar?.title ?? p.doc?.title ?? p.task?.title ?? p.announce?.text.slice(0, 60) ?? "";
    const when = p.calendar ? ` at ${p.calendar.start_iso}` : p.task?.due_iso ? ` due ${p.task.due_iso}` : "";
    return `[${d.id}] (${d.status}) ${d.executor}: ${label}${when}`;
  });
}
