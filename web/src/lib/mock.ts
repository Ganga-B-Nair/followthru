// Demo mode: a small rule-based stand-in used only when no Claude credential is set,
// so the UI can be explored offline. Real runs always go through Claude.
import type { CleanSpeech, DraftPlan, Extraction } from "./schemas";

const FILLERS = /\b(um+|uh+|erm|like,|you know,?|basically,?|so yeah,?|i mean,?)\s*/gi;
const CORRECTION = /([^,.]{1,40}?),?\s*(?:no wait|no no|sorry|actually|i mean),?\s*([^,.]{1,40})/gi;

export function mockClean(raw: string): CleanSpeech {
  const corrections: CleanSpeech["corrections"] = [];
  let text = raw.replace(CORRECTION, (m, _a: string, b: string) => {
    corrections.push({ original: m.trim(), resolved: b.trim(), kind: "self_correction" });
    return b;
  });
  const fillers = text.match(FILLERS);
  if (fillers) corrections.push({ original: fillers[0].trim(), resolved: "", kind: "filler" });
  text = text.replace(FILLERS, "").replace(/\s{2,}/g, " ").trim();
  return { clean_text: text, corrections };
}

export function mockExtract(clean: string): Extraction {
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const decisions = sentences
    .filter((s) => /\b(decided|agreed|we('| a)re going|we'll|let's|is set|stays)\b/i.test(s))
    .map((s) => ({ text: s, topic_tags: tagsFor(s), speaker: null }));
  const action_items = sentences
    .filter((s) => /\b(will|to send|to email|needs to|should|i'll)\b/i.test(s))
    .map((s) => {
      const owner = s.match(/\b([A-Z][a-z]+)\s+(will|to|needs|should)\b/)?.[1] ?? null;
      return {
        text: s, owner, owner_confidence: owner ? ("high" as const) : ("low" as const),
        due_iso: null, due_phrase: s.match(/\b(today|tomorrow|next \w+|by \w+|on \w+day)\b/i)?.[0] ?? null,
        due_confidence: "low" as const, implicit: /i'll look/i.test(s),
      };
    });
  const names = [...new Set(action_items.map((a) => a.owner).filter((n): n is string => !!n))];
  return {
    title: "Meeting recap (demo mode)", meeting_type: "work",
    summary: "Demo mode: add a free GEMINI_API_KEY for real extraction.",
    key_points: decisions.slice(0, 4).map((d) => d.text),
    attendees: names.map((name) => ({ name, email: null })),
    decisions, action_items,
  };
}

export function mockPlan(ex: Extraction): DraftPlan {
  return {
    drafts: ex.action_items.map((a, i) => {
      const isEmail = /\b(email|send|tell|reply|confirm)\b/i.test(a.text);
      const isMeet = /\b(sync|meet|call|appointment|catch up)\b/i.test(a.text);
      const base = { action_index: i, email: null, calendar: null, doc: null, announce: null, task: null };
      if (isEmail) return { ...base, executor: "email" as const, why: "Message to send", email: { to: [], subject: a.text.slice(0, 60), body: `Hi,\n\n${a.text}\n\nThanks` } };
      if (isMeet) {
        const start = new Date(Date.now() + 2 * 864e5);
        return { ...base, executor: "calendar" as const, why: "Meeting to schedule", calendar: { title: a.text.slice(0, 60), start_iso: start.toISOString(), end_iso: new Date(+start + 18e5).toISOString(), attendees: [], agenda: a.text } };
      }
      return { ...base, executor: "task" as const, why: "Needs a person to do it", task: { title: a.text.slice(0, 80), description: a.text, owner: a.owner, due_iso: a.due_iso } };
    }),
  };
}

function tagsFor(s: string): string[] {
  const words = s.toLowerCase().match(/\b(launch|pricing|price|rent|deadline|budget|release|hiring|exam|assignment|repair|design|qa)\b/g);
  return [...new Set(words ?? ["general"])];
}
