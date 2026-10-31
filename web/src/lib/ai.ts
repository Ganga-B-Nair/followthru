import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const TIMEZONE = process.env.FOLLOWTHRU_TZ || "Asia/Kolkata";

// Three ways to run the agent, picked from whichever key is configured:
//  - "anthropic": Claude (ANTHROPIC_API_KEY)
//  - "openai":    any OpenAI-compatible endpoint. Defaults to Google Gemini's free tier
//                 (GEMINI_API_KEY from aistudio.google.com); Groq or OpenRouter work via LLM_BASE_URL.
//  - "demo":      no key. Curated results for the demo recordings, rule-based for anything else.
export type Provider = "anthropic" | "openai" | "demo";

export function provider(): Provider {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "anthropic";
  if (process.env.GEMINI_API_KEY || process.env.LLM_API_KEY) return "openai";
  return "demo";
}

export const aiEnabled = () => provider() !== "demo";

const OPENAI_BASE = () =>
  process.env.LLM_BASE_URL || (process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai" : "https://api.groq.com/openai/v1");
const OPENAI_KEY = () => process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || "";

export function modelName(): string {
  if (provider() === "anthropic") return process.env.FOLLOWTHRU_MODEL || "claude-opus-5-5";
  if (provider() === "openai") return process.env.LLM_MODEL || (process.env.GEMINI_API_KEY ? "gemini-3.5-flash" : "llama-3.3-70b-versatile");
  return "demo";
}

let anthropic: Anthropic | null = null;
export function claude(): Anthropic {
  if (!anthropic) anthropic = new Anthropic();
  return anthropic;
}

export type Effort = "low" | "medium" | "high";

/** One structured model call, validated against the zod schema. */
export async function structured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  user: string;
  effort?: Effort;
  maxTokens?: number;
  /** Mechanical tasks skip model reasoning, which is most of the free tier's latency. */
  fast?: boolean;
  /** Give up sooner than the default, for calls a live screen is waiting on. */
  timeoutMs?: number;
}): Promise<z.infer<S>> {
  return provider() === "anthropic" ? structuredClaude(opts) : structuredOpenAI(opts);
}

/** Claude with structured outputs and server-side refusal fallback. */
async function structuredClaude<S extends z.ZodType>(opts: { schema: S; system: string; user: string; effort?: Effort; maxTokens?: number }): Promise<z.infer<S>> {
  const response = await claude().beta.messages.parse({
    model: modelName(),
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined this request${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : ""}`);
  }
  if (response.stop_reason === "max_tokens") throw new Error("Claude ran out of output tokens; try a shorter input");
  if (response.parsed_output == null) throw new Error("Claude returned output that did not match the schema");
  return response.parsed_output as z.infer<S>;
}

export class LLMError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const isGemini = () => !process.env.LLM_BASE_URL && !!process.env.GEMINI_API_KEY;
/** Free-tier Gemini models get overloaded; when the main one is busy, the lighter one answers. */
const FALLBACK_MODEL = () => process.env.LLM_FALLBACK_MODEL || (isGemini() ? "gemini-3.5-flash-lite" : "");
// When the free tier slows down, failing fast lets the demo fall back to curated results instead of stalling.
const CALL_TIMEOUT_MS = 12_000;

async function postChat(model: string, body: Record<string, unknown>, reasoning: "none" | "low" = "low", timeoutMs = CALL_TIMEOUT_MS) {
  const res = await fetch(`${OPENAI_BASE()}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY()}` },
    // Low (or no) reasoning keeps Gemini at seconds per call instead of tens of seconds.
    body: JSON.stringify({ model, ...(isGemini() ? { reasoning_effort: reasoning } : {}), ...body }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((err: unknown) => {
    throw new LLMError(504, err instanceof Error && err.name === "TimeoutError" ? `no answer within ${timeoutMs / 1000}s` : String(err));
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = (Array.isArray(j) ? j[0] : j)?.error?.message ?? text;
    } catch {}
    throw new LLMError(res.status, msg.slice(0, 300));
  }
  return res.json();
}

export async function chatCompletion(body: Record<string, unknown>, fast = false, timeoutMs?: number): Promise<{ choices: { message: OpenAIMessage; finish_reason: string }[] }> {
  try {
    return await postChat(modelName(), body, fast ? "none" : "low", timeoutMs);
  } catch (err) {
    const fallback = FALLBACK_MODEL();
    // A quick "busy" answer is worth one retry on the lighter model; a timeout isn't, it would double the wait.
    const busy = err instanceof LLMError && [404, 429, 500, 503].includes(err.status);
    if (!busy || !fallback || fallback === modelName()) throw err;
    return postChat(fallback, body, "low", timeoutMs);
  }
}

export type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

/** JSON mode plus the schema in the prompt; zod validates and one retry repairs mistakes. */
async function structuredOpenAI<S extends z.ZodType>(opts: { schema: S; system: string; user: string; maxTokens?: number; fast?: boolean; timeoutMs?: number }): Promise<z.infer<S>> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const messages: OpenAIMessage[] = [
    { role: "system", content: `${opts.system}\n\nRespond with ONLY a JSON object (no prose, no code fences) that matches this JSON Schema exactly. Every property is required; use null where a value is absent.\n${jsonSchema}` },
    { role: "user", content: opts.user },
  ];
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    const out = await chatCompletion({ messages, response_format: { type: "json_object" }, max_tokens: opts.maxTokens ?? 8000 }, opts.fast, opts.timeoutMs);
    console.log(`[ai] ${opts.system.slice(0, 28)}… attempt ${attempt + 1}: ${Date.now() - started}ms`);
    const text = (out.choices[0]?.message.content ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      messages.push({ role: "assistant", content: text }, { role: "user", content: "That was not valid JSON. Reply with the JSON object only." });
      continue;
    }
    const check = opts.schema.safeParse(parsed);
    if (check.success) return check.data;
    messages.push(
      { role: "assistant", content: text },
      { role: "user", content: `The JSON did not match the schema: ${check.error.message.slice(0, 800)}. Reply with the corrected JSON object only.` },
    );
  }
  throw new Error("The model returned output that did not match the schema twice");
}

/** Turn an API failure into one sentence a user can act on. */
export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.";
  if (err instanceof Anthropic.RateLimitError) return "Claude is rate-limited right now. Wait a few seconds and try again.";
  if (err instanceof Anthropic.APIError) {
    const inner = (err.error as { error?: { message?: string } } | undefined)?.error?.message;
    return `Claude API error ${err.status ?? ""}: ${inner ?? err.message}`.trim();
  }
  if (err instanceof LLMError) {
    if (err.status === 429) return "The free AI tier is rate-limited. Wait a minute and try again.";
    if (err.status === 503 || err.status === 504) return "The free AI model is busy right now. Try again in a few seconds.";
    if (err.status === 401 || err.status === 403) return "The AI key was rejected. Check GEMINI_API_KEY (or LLM_API_KEY) in .env.local.";
    if (err.status === 404) return `Model "${modelName()}" was not found. Set LLM_MODEL in .env.local to a model your key can use.`;
    return `AI error ${err.status}: ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

/** Wrap a route handler so model failures come back as a readable JSON error. */
export function safe<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(err);
      return Response.json({ error: friendlyError(err) }, { status: 502 });
    }
  };
}

/** Current date/time in the user's timezone, for resolving "next Thursday". */
export function nowContext(at = new Date()): string {
  const local = at.toLocaleString("en-GB", {
    timeZone: TIMEZONE, weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  return `Current date and time: ${local} (timezone ${TIMEZONE}, ISO now ${at.toISOString()}).`;
}
