import { aiEnabled, LLMError, nowContext, structured } from "./ai";
import { all, newId, nowIso, run, upsertPerson, type DecisionRow, type MeetingRow, type PersonRow } from "./db";
import { findFixture } from "./fixtures";
import { mockClean, mockExtract, mockPlan } from "./mock";
import * as P from "./prompts";
import { CleanSpeech, ConflictJudgement, DraftPlan, Extraction, type DraftItem } from "./schemas";

/** Rough minutes a person would spend producing each follow-up by hand. */
export const MINUTES_SAVED: Record<string, number> = { email: 8, calendar: 4, doc: 25, announce: 5, task: 3 };

export type PipelineEvent =
  | { type: "step"; step: string; status: "running" | "done"; detail?: string }
  | { type: "done"; meetingId: string }
  | { type: "error"; message: string };

type Emit = (e: PipelineEvent) => void;

/** Demo mode paces the steps so the agent timeline is readable on screen. */
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How long a demo meeting waits on the free AI tier before finishing with the hand-checked results. */
const DEMO_AI_BUDGET_MS = 10_000;

export async function runPipeline(raw: string, emit: Emit, heldAt = new Date(), source = "recap"): Promise<string> {
  const meetingId = newId();
  const curated = aiEnabled() && !!findFixture(raw);
  let abandoned = false;
  const liveRun = runSteps(raw, (e) => { if (!abandoned) emit(e); }, heldAt, source, meetingId, aiEnabled());
  try {
    if (!curated) return await liveRun;
    // A slow free tier shouldn't stall a demo: race the live run against the budget.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const budget = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new LLMError(504, "AI took too long")), DEMO_AI_BUDGET_MS); });
    try {
      return await Promise.race([liveRun, budget]);
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // The free AI tier can hit its per-minute quota or be overloaded. For the demo meetings,
    // fall back to the hand-checked results so the run still completes.
    if (!(err instanceof LLMError) || !curated) throw err;
    console.warn(`[pipeline] AI unavailable (${err.status}), using curated results`);
    abandoned = true;
    // The live run may still be going: once it settles, remove everything it wrote.
    liveRun.catch(() => {}).finally(() => discardMeeting(meetingId).catch(() => {}));
    return runSteps(raw, emit, heldAt, source, newId(), false);
  }
}

/** Like Promise.all, but waits for every branch before throwing, so nothing still writes to a meeting being discarded. */
async function settled<T extends readonly unknown[]>(work: { [K in keyof T]: Promise<T[K]> }): Promise<T> {
  const results = await Promise.allSettled(work);
  const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed) throw failed.reason;
  return results.map((r) => (r as PromiseFulfilledResult<unknown>).value) as unknown as T;
}

async function discardMeeting(id: string) {
  await run("DELETE FROM conflicts WHERE new_decision_id IN (SELECT id FROM decisions WHERE meeting_id = ?)", [id]);
  for (const table of ["drafts", "action_items", "decisions"]) await run(`DELETE FROM ${table} WHERE meeting_id = ?`, [id]);
  await run("DELETE FROM meetings WHERE id = ?", [id]);
}

async function runSteps(raw: string, emit: Emit, heldAt: Date, source: string, meetingId: string, live: boolean): Promise<string> {
  const fixture = live ? null : findFixture(raw);
  const beat = () => (live ? Promise.resolve() : pause(350));
  const ctx = nowContext(heldAt);

  // 1 + 2. Speech-to-Intent and extraction run in parallel: extraction reads the raw text and
  // resolves self-corrections itself, so it doesn't wait for the cleaned transcript.
  emit({ type: "step", step: "clean", status: "running", detail: "Cleaning up fillers and self-corrections" });
  emit({ type: "step", step: "extract", status: "running", detail: "Pulling out decisions, owners and deadlines" });
  const cleaning = (async (): Promise<CleanSpeech> => {
    const clean = live
      ? await structured({ schema: CleanSpeech, system: P.CLEAN_SPEECH, user: `<raw_dictation>
${raw}
</raw_dictation>`, effort: "low", fast: true })
      : fixture?.clean ?? mockClean(raw);
    await beat();
    const nCorr = clean.corrections.filter((c) => c.kind === "self_correction").length;
    emit({ type: "step", step: "clean", status: "done", detail: `${nCorr} self-correction${nCorr === 1 ? "" : "s"} resolved, ${clean.corrections.length - nCorr} fillers and digressions removed` });
    return clean;
  })();
  const extracting = (async (): Promise<Extraction> => {
    const ex = live
      ? await structured({ schema: Extraction, system: P.EXTRACT, user: `${ctx}

<meeting>
${raw}
</meeting>`, effort: "medium" })
      : fixture?.extract ?? mockExtract((await cleaning).clean_text);
    await beat();
    await beat();
    emit({ type: "step", step: "extract", status: "done", detail: `${ex.meeting_type.replace("_", " ")} meeting: ${ex.decisions.length} decisions, ${ex.action_items.length} action items` });
    return ex;
  })();
  const [clean, ex] = await settled([cleaning, extracting] as const);

  // Store the meeting, people, decisions and action items.
  await run(
    `INSERT INTO meetings (id, title, meeting_type, held_at, raw_text, clean_text, corrections_json, attendees_json, summary, key_points_json, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [meetingId, ex.title, ex.meeting_type, heldAt.toISOString(), raw, clean.clean_text,
     JSON.stringify(clean.corrections), JSON.stringify(ex.attendees), ex.summary, JSON.stringify(ex.key_points), source, nowIso()],
  );
  for (const a of ex.attendees) await upsertPerson(a.name, a.email);
  const decisionIds: string[] = [];
  for (const d of ex.decisions) {
    const id = newId();
    decisionIds.push(id);
    await run("INSERT INTO decisions (id, meeting_id, text, topic_tags_json, speaker, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, meetingId, d.text, JSON.stringify(d.topic_tags), d.speaker, heldAt.toISOString()]);
  }
  const actionIds: string[] = [];
  for (const a of ex.action_items) {
    const id = newId();
    actionIds.push(id);
    if (a.owner) await upsertPerson(a.owner);
    await run(
      `INSERT INTO action_items (id, meeting_id, text, owner, owner_confidence, due_at, due_phrase, due_confidence, implicit, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, meetingId, a.text, a.owner, a.owner_confidence, a.due_iso, a.due_phrase, a.due_confidence, a.implicit ? 1 : 0, nowIso()],
    );
  }

  // 3. Recall related past decisions
  emit({ type: "step", step: "recall", status: "running", detail: "Searching decision memory" });
  const candidates = await recall(ex, meetingId);
  await beat();
  emit({ type: "step", step: "recall", status: "done", detail: `${candidates.length} related past decision${candidates.length === 1 ? "" : "s"} found` });

  // 4 + 5. Conflict judge and execution drafting run in parallel.
  emit({ type: "step", step: "conflicts", status: "running", detail: "Checking for contradictions with earlier meetings" });
  emit({ type: "step", step: "draft", status: "running", detail: "Drafting the follow-up work" });

  const people = await all<PersonRow>("SELECT * FROM people");
  const judge = (async () => {
    if (fixture) {
      await pause(500);
      let n = 0;
      for (const c of fixture.conflicts) {
        const old = candidates.find((d) => d.text.includes(c.old_contains));
        if (!old || !decisionIds[c.new_index]) continue;
        await run("INSERT INTO conflicts (id, new_decision_id, old_decision_id, kind, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [newId(), decisionIds[c.new_index], old.id, c.kind, c.explanation, nowIso()]);
        if (c.kind === "contradicts") n++;
      }
      return n;
    }
    if (!live || candidates.length === 0 || ex.decisions.length === 0) return 0;
    const out = await structured({
      schema: ConflictJudgement, system: P.JUDGE_CONFLICTS, effort: "medium",
      user: `<new_decisions meeting="${ex.title}" date="${heldAt.toDateString()}">\n${ex.decisions.map((d, i) => `[${i}] ${d.text}`).join("\n")}\n</new_decisions>\n\n<earlier_decisions>\n${candidates.map((c) => `[${c.id}] (${c.meeting_title}, ${new Date(c.created_at).toDateString()}) ${c.text}`).join("\n")}\n</earlier_decisions>`,
    });
    let n = 0;
    for (const r of out.results) {
      if (r.kind === "unrelated" || !decisionIds[r.new_index] || !candidates.some((c) => c.id === r.old_id)) continue;
      await run("INSERT INTO conflicts (id, new_decision_id, old_decision_id, kind, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [newId(), decisionIds[r.new_index], r.old_id, r.kind, r.explanation, nowIso()]);
      if (r.kind === "contradicts") n++;
    }
    return n;
  })().then((n) => {
    emit({ type: "step", step: "conflicts", status: "done", detail: n ? `⚠ ${n} conflict${n === 1 ? "" : "s"} with earlier decisions` : "No conflicts with earlier decisions" });
  });

  const draft = (async () => {
    const plan: DraftPlan = live
      ? await structured({
          schema: DraftPlan, system: P.PLAN_AND_DRAFT, effort: "medium",
          user: `${ctx}\n\nMeeting: ${ex.title} (type: ${ex.meeting_type})\nSummary: ${ex.summary}\n\n<known_people>\n${people.map((p) => `${p.name}${p.email ? ` <${p.email}>` : ""}`).join("\n")}\n</known_people>\n\n<decisions>\n${ex.decisions.map((d) => `- ${d.text}`).join("\n")}\n</decisions>\n\n<action_items>\n${ex.action_items.map((a, i) => `[${i}] ${a.text} | owner: ${a.owner ?? "unknown"} | due: ${a.due_iso ?? a.due_phrase ?? "none"}`).join("\n")}\n</action_items>\n\n<related_earlier_decisions>\n${candidates.map((c) => `- (${c.meeting_title}) ${c.text}`).join("\n") || "none"}\n</related_earlier_decisions>\n\n<meeting_text>\n${clean.clean_text}\n</meeting_text>`,
        })
      : fixture ? (await pause(800), fixture.plan) : mockPlan(ex);
    let minutes = 0;
    for (const d of plan.drafts) {
      const m = MINUTES_SAVED[d.executor] ?? 0;
      minutes += m;
      await run("INSERT INTO drafts (id, meeting_id, action_item_id, executor, why, payload_json, minutes_saved) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId(), meetingId, actionIds[d.action_index] ?? null, d.executor, d.why, JSON.stringify(payloadOf(d)), m]);
    }
    await run("UPDATE meetings SET minutes_saved = ? WHERE id = ?", [minutes, meetingId]);
    return { n: plan.drafts.length, minutes };
  })().then(({ n, minutes }) => {
    emit({ type: "step", step: "draft", status: "done", detail: `${n} follow-ups drafted, about ${minutes} minutes of work` });
  });

  await settled([judge, draft] as const);
  emit({ type: "done", meetingId });
  return meetingId;
}

function payloadOf(d: DraftItem) {
  return { email: d.email, calendar: d.calendar, doc: d.doc, announce: d.announce, task: d.task };
}

type Candidate = DecisionRow & { meeting_title: string };

/** Topic-tag and keyword overlap against active decisions from other meetings. */
async function recall(ex: Extraction, meetingId: string): Promise<Candidate[]> {
  const rows = await all<Candidate>(
    `SELECT d.*, m.title AS meeting_title FROM decisions d JOIN meetings m ON m.id = d.meeting_id
     WHERE d.meeting_id != ? AND d.status != 'superseded' ORDER BY d.created_at DESC LIMIT 300`,
    [meetingId],
  );
  const tags = new Set(ex.decisions.flatMap((d) => d.topic_tags.map((t) => t.toLowerCase())));
  const words = new Set(ex.decisions.flatMap((d) => keywords(d.text)));
  const scored = rows.map((r) => {
    const rTags: string[] = JSON.parse(r.topic_tags_json || "[]");
    const score = rTags.filter((t) => tags.has(t.toLowerCase())).length * 3 + keywords(r.text).filter((w) => words.has(w)).length;
    return { r, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 15).map((s) => s.r);
}

const STOP = new Set("the a an and or to of in on for with by is are be will we our at this that it from as next until".split(" "));
function keywords(s: string): string[] {
  return (s.toLowerCase().match(/[a-z₹0-9]{3,}/g) ?? []).filter((w) => !STOP.has(w));
}

export type MeetingBundle = Awaited<ReturnType<typeof loadMeeting>>;

export async function loadMeeting(id: string) {
  const meeting = (await all<MeetingRow>("SELECT * FROM meetings WHERE id = ?", [id]))[0];
  if (!meeting) return null;
  const decisions = await all<DecisionRow>("SELECT * FROM decisions WHERE meeting_id = ? ORDER BY rowid", [id]);
  const actions = await all("SELECT * FROM action_items WHERE meeting_id = ? ORDER BY rowid", [id]);
  const drafts = await all("SELECT * FROM drafts WHERE meeting_id = ? ORDER BY rowid", [id]);
  const conflicts = await all(
    `SELECT c.*, nd.text AS new_text, od.text AS old_text, om.title AS old_meeting_title, om.held_at AS old_meeting_date
     FROM conflicts c JOIN decisions nd ON nd.id = c.new_decision_id JOIN decisions od ON od.id = c.old_decision_id
     JOIN meetings om ON om.id = od.meeting_id WHERE nd.meeting_id = ?`,
    [id],
  );
  return { meeting, decisions, actions, drafts, conflicts };
}
