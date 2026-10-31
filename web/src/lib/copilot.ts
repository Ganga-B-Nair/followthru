import { chatCompletion, nowContext, provider, type OpenAIMessage } from "./ai";
import { askMemory, runTool, tools as memoryTools } from "./ask";
import { all, one, run, type ConflictRow, type DraftRow } from "./db";
import { COPILOT } from "./prompts";
import { applyOps, executeApproved, type Payload } from "./queue";

// Copilot: a chat agent that acts on what the meeting agent produced. Memory tools are shared with Ask;
// the action tools below change drafts, tasks and conflicts, and are only offered to users who may approve.

type Fn = { type: "function"; function: { name: string; description: string; parameters: Record<string, unknown> } };
const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]): Fn =>
  ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });

const READ_TOOLS: Fn[] = [
  ...memoryTools.map((t): Fn => ({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.input_schema as Record<string, unknown> } })),
  fn("list_drafts", "List follow-up drafts with id, kind, title, status (pending/approved/executed/rejected) and meeting. Optionally filter by meeting_id and/or status.",
    { meeting_id: { type: "string" }, status: { type: "string", enum: ["pending", "approved", "executed", "rejected"] } }, []),
  fn("get_draft", "Get one draft's full payload (email to/subject/body, calendar title/start_iso/end_iso/agenda, doc title/markdown, announce text, task).",
    { id: { type: "string" } }, ["id"]),
];

const WRITE_TOOLS: Fn[] = [
  fn("edit_draft", "Change fields of a pending draft. field is a dotted path such as email.body, email.subject, calendar.start_iso, calendar.end_iso, doc.markdown, announce.text, task.due_iso; value is the complete new value.",
    { id: { type: "string" }, changes: { type: "array", items: { type: "object", properties: { field: { type: "string" }, value: { type: "string" } }, required: ["field", "value"] } } }, ["id", "changes"]),
  fn("set_draft_status", "Approve or skip (reject) drafts. Only when the user asked for it.",
    { ids: { type: "array", items: { type: "string" } }, status: { type: "string", enum: ["approved", "rejected"] } }, ["ids", "status"]),
  fn("ship_approved", "Ship approved drafts: emails open in Gmail, invites in Google Calendar, docs go to Notion. Only when the user asked to send or ship.",
    { ids: { type: "array", items: { type: "string" } } }, ["ids"]),
  fn("update_action_item", "Mark an action item open, done or blocked (with a reason).",
    { id: { type: "string" }, status: { type: "string", enum: ["open", "done", "blocked"] }, blocked_reason: { type: "string" } }, ["id", "status"]),
  fn("resolve_conflict", "Resolve a conflict: supersede (today's decision replaces the old one), keep_both, or flag for the next meeting.",
    { id: { type: "string" }, resolution: { type: "string", enum: ["supersede", "keep_both", "flag"] } }, ["id", "resolution"]),
];
const WRITE_NAMES = new Set(WRITE_TOOLS.map((t) => t.function.name));

const label = (p: Payload) => p.email?.subject ?? p.calendar?.title ?? p.doc?.title ?? p.task?.title ?? p.announce?.text.slice(0, 70) ?? "";

async function runCopilotTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_drafts": {
      const where: string[] = [];
      const args: string[] = [];
      if (input.meeting_id) { where.push("d.meeting_id = ?"); args.push(String(input.meeting_id)); }
      if (input.status) { where.push("d.status = ?"); args.push(String(input.status)); }
      const rows = await all<DraftRow & { meeting: string }>(
        `SELECT d.*, m.title AS meeting FROM drafts d JOIN meetings m ON m.id = d.meeting_id ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY m.held_at DESC LIMIT 30`, args);
      return rows.map((d) => ({ id: d.id, kind: d.executor, title: label(JSON.parse(d.payload_json)), status: d.status, meeting: d.meeting }));
    }
    case "get_draft": {
      const d = await one<DraftRow>("SELECT * FROM drafts WHERE id = ?", [String(input.id)]);
      return d ? { id: d.id, kind: d.executor, status: d.status, payload: JSON.parse(d.payload_json) } : { error: "No draft with that id" };
    }
    case "edit_draft": {
      const changes = (input.changes as { field: string; value: string }[] | undefined) ?? [];
      await applyOps(changes.map((c) => ({ op: "edit" as const, ids: [String(input.id)], field: c.field, value: c.value })));
      return { ok: true, changed: changes.map((c) => c.field) };
    }
    case "set_draft_status": {
      const ids = (input.ids as string[] | undefined) ?? [];
      await applyOps([{ op: input.status === "approved" ? "approve" : "reject", ids, field: null, value: null }]);
      return { ok: true, count: ids.length };
    }
    case "ship_approved":
      return executeApproved((input.ids as string[] | undefined) ?? []);
    case "update_action_item":
      await run("UPDATE action_items SET status = ?, blocked_reason = ? WHERE id = ?", [String(input.status), (input.blocked_reason as string | undefined) ?? null, String(input.id)]);
      return { ok: true };
    case "resolve_conflict": {
      const c = await one<ConflictRow>("SELECT * FROM conflicts WHERE id = ?", [String(input.id)]);
      if (!c) return { error: "No conflict with that id" };
      await run("UPDATE conflicts SET resolution = ? WHERE id = ?", [String(input.resolution), c.id]);
      if (input.resolution === "supersede") await run("UPDATE decisions SET status = 'superseded', superseded_by = ? WHERE id = ?", [c.new_decision_id, c.old_decision_id]);
      else if (input.resolution === "flag") await run("UPDATE decisions SET status = 'flagged' WHERE id IN (?, ?)", [c.new_decision_id, c.old_decision_id]);
      return { ok: true };
    }
    // Copilot needs ids to act on, which the shared Ask versions of these two leave out.
    case "get_conflicts":
      return all(
        `SELECT c.id, c.kind, c.explanation, c.resolution, nd.text AS new_decision, od.text AS old_decision FROM conflicts c
         JOIN decisions nd ON nd.id = c.new_decision_id JOIN decisions od ON od.id = c.old_decision_id ORDER BY c.created_at DESC LIMIT 20`);
    case "list_action_items": {
      const rows = await all<{ owner: string | null; status: string }>(
        "SELECT a.id, a.text, a.owner, a.due_at, a.status, m.title AS meeting FROM action_items a JOIN meetings m ON m.id = a.meeting_id ORDER BY a.due_at LIMIT 60");
      return rows.filter((r) => (!input.owner || r.owner?.toLowerCase() === String(input.owner).toLowerCase()) && (!input.status || r.status === input.status));
    }
    default:
      return runTool(name, input);
  }
}

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type CopilotStep = { tool: string; args: Record<string, unknown>; acted: boolean };

export async function copilot(
  history: ChatTurn[], page: { path: string; meetingId: string | null }, canAct: boolean,
): Promise<{ answer: string; steps: CopilotStep[]; changed: boolean }> {
  // Without an OpenAI-compatible model, Copilot answers from memory only (the Ask agent).
  if (provider() !== "openai") {
    const r = await askMemory(history[history.length - 1]?.content ?? "");
    return { answer: r.answer, steps: r.steps.map((s) => ({ tool: s.split("(")[0], args: {}, acted: false })), changed: false };
  }
  const fnTools = canAct ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS;
  const context = `${nowContext()}\nPage: ${page.path}${page.meetingId ? ` (meeting id ${page.meetingId})` : ""}`
    + (canAct ? "" : "\nThis user is a team member without approval rights: look things up, but you cannot change drafts, tasks or conflicts.");
  const messages: OpenAIMessage[] = [
    { role: "system", content: `${COPILOT}\n\n${context}` },
    ...history.slice(-10).map((h): OpenAIMessage => ({ role: h.role, content: h.content })),
  ];
  const steps: CopilotStep[] = [];
  for (let turn = 0; turn < 8; turn++) {
    const out = await chatCompletion({ messages, tools: fnTools, tool_choice: "auto" });
    const msg = out.choices[0].message;
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
    if (!msg.tool_calls?.length) return { answer: msg.content ?? "", steps, changed: steps.some((s) => s.acted) };
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || "{}"); } catch {}
      const acted = WRITE_NAMES.has(call.function.name);
      steps.push({ tool: call.function.name, args, acted });
      let content: string;
      try {
        content = acted && !canAct ? "Error: this user can't make changes" : JSON.stringify(await runCopilotTool(call.function.name, args));
      } catch (err) {
        content = `Error: ${String(err)}`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
  }
  return { answer: "I ran out of steps on that one. Try a narrower request.", steps, changed: steps.some((s) => s.acted) };
}
