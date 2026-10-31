import type Anthropic from "@anthropic-ai/sdk";
import { chatCompletion, claude, modelName, nowContext, provider, type OpenAIMessage } from "./ai";
import { all } from "./db";
import { ASK } from "./prompts";

// A real tool-use agent: Claude decides which memory lookups to run, loops until it can answer.

const tools: Anthropic.Tool[] = [
  {
    name: "search_decisions",
    description: "Full-text search over every decision ever recorded, newest first. Returns decision text, status (active/superseded/flagged), meeting title and date.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "One or two keywords, e.g. 'launch' or 'rent'" } }, required: ["query"], additionalProperties: false },
    strict: true,
  },
  {
    name: "list_action_items",
    description: "List action items, optionally filtered by owner name and/or status (open, done, blocked). Returns text, owner, due date, status and meeting.",
    input_schema: {
      type: "object",
      properties: { owner: { type: ["string", "null"] }, status: { type: ["string", "null"], enum: ["open", "done", "blocked", null] } },
      required: ["owner", "status"], additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "list_meetings",
    description: "List recent meetings with id, title, type, date and two-sentence summary.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    name: "get_conflicts",
    description: "List detected conflicts between decisions, with explanation and how each was resolved.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
];

async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_decisions": {
      const terms = String(input.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      const rows = await all<{ text: string }>(
        `SELECT d.text, d.status, m.title AS meeting, m.held_at AS date FROM decisions d JOIN meetings m ON m.id = d.meeting_id ORDER BY m.held_at DESC LIMIT 500`,
      );
      return rows.filter((r) => terms.some((t) => r.text.toLowerCase().includes(t))).slice(0, 20);
    }
    case "list_action_items": {
      const where: string[] = [];
      const args: string[] = [];
      if (input.owner) { where.push("a.owner = ? COLLATE NOCASE"); args.push(String(input.owner)); }
      if (input.status) { where.push("a.status = ?"); args.push(String(input.status)); }
      return all(
        `SELECT a.text, a.owner, a.due_at, a.status, a.blocked_reason, m.title AS meeting FROM action_items a JOIN meetings m ON m.id = a.meeting_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY a.due_at LIMIT 40`, args);
    }
    case "list_meetings":
      return all("SELECT id, title, meeting_type, held_at, summary FROM meetings ORDER BY held_at DESC LIMIT 30");
    case "get_conflicts":
      return all(
        `SELECT c.kind, c.explanation, c.resolution, nd.text AS new_decision, od.text AS old_decision FROM conflicts c
         JOIN decisions nd ON nd.id = c.new_decision_id JOIN decisions od ON od.id = c.old_decision_id ORDER BY c.created_at DESC LIMIT 20`);
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

export async function askMemory(question: string): Promise<{ answer: string; steps: string[] }> {
  if (provider() === "openai") return askOpenAI(question);
  if (provider() === "demo") return askDemo(question);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `${nowContext()}\n\n${question}` }];
  const steps: string[] = [];
  for (let turn = 0; turn < 8; turn++) {
    const response = await claude().messages.create({
      model: modelName(), max_tokens: 8000, system: ASK, tools, messages,
      output_config: { effort: "low" },
    });
    if (response.stop_reason === "refusal") return { answer: "I can't help with that one.", steps };
    // Append the full content (thinking blocks included) so the conversation stays valid.
    messages.push({ role: "assistant", content: response.content });
    const calls = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || calls.length === 0) {
      const answer = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
      return { answer, steps };
    }
    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      calls.map(async (c) => {
        steps.push(`${c.name}(${JSON.stringify(c.input)})`);
        try {
          return { type: "tool_result" as const, tool_use_id: c.id, content: JSON.stringify(await runTool(c.name, c.input as Record<string, unknown>)) };
        } catch (err) {
          return { type: "tool_result" as const, tool_use_id: c.id, content: String(err), is_error: true };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }
  return { answer: "I couldn't finish searching memory. Try a narrower question.", steps };
}

/** Same agent loop for OpenAI-compatible providers (Gemini free tier, Groq, OpenRouter). */
async function askOpenAI(question: string): Promise<{ answer: string; steps: string[] }> {
  const fnTools = tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  const messages: OpenAIMessage[] = [{ role: "system", content: ASK }, { role: "user", content: `${nowContext()}

${question}` }];
  const steps: string[] = [];
  for (let turn = 0; turn < 8; turn++) {
    const out = await chatCompletion({ messages, tools: fnTools, tool_choice: "auto" });
    const msg = out.choices[0].message;
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
    if (!msg.tool_calls?.length) return { answer: msg.content ?? "", steps };
    for (const call of msg.tool_calls) {
      steps.push(`${call.function.name}(${call.function.arguments})`);
      let content: string;
      try {
        content = JSON.stringify(await runTool(call.function.name, JSON.parse(call.function.arguments || "{}")));
      } catch (err) {
        content = `Error: ${String(err)}`;
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
  }
  return { answer: "I couldn't finish searching memory. Try a narrower question.", steps };
}

/** No key: keyword search over memory, so Ask still works in demo recordings. */
async function askDemo(question: string): Promise<{ answer: string; steps: string[] }> {
  const STOP = new Set("what when where who did does do we i my the a an is are was about for to of and or have has still any across".split(" "));
  const words = (question.toLowerCase().match(/[a-z0-9₹]{3,}/g) ?? []).filter((w) => !STOP.has(w));
  const steps = [`search_decisions(${JSON.stringify({ query: words.join(" ") })})`, `list_action_items({"status":"open"})`];
  const decisions = (await runTool("search_decisions", { query: words.join(" ") })) as { text: string; status: string; meeting: string; date: string }[];
  const items = ((await runTool("list_action_items", { owner: null, status: null })) as { text: string; owner: string; due_at: string | null; status: string; meeting: string }[])
    .filter((i) => i.status !== "done" && (words.some((w) => i.text.toLowerCase().includes(w)) || /overdue|owe|pending|open/.test(question.toLowerCase())));
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "no date");
  const lines: string[] = [];
  if (decisions.length) {
    lines.push("**Decisions on record**");
    for (const d of decisions.slice(0, 5)) lines.push(`- ${d.text} (${d.meeting}, ${fmt(d.date)})${d.status !== "active" ? ` [${d.status}]` : ""}`);
  }
  if (items.length) {
    lines.push("", "**Still open**");
    for (const i of items.slice(0, 6)) lines.push(`- ${i.text}: ${i.owner ?? "unassigned"}, due ${fmt(i.due_at)} (${i.meeting})`);
  }
  return { answer: lines.length ? lines.join("\n") : "I couldn't find anything about that in your meetings.", steps };
}
