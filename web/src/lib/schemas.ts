import { z } from "zod";

// Structured-output schemas. Every field is required; "absent" is expressed as null
// so the JSON schema stays strict.

export const MEETING_TYPES = [
  "work", "client", "class", "doctor", "household", "committee",
  "parent_teacher", "interview", "vendor", "other",
] as const;

export const CleanSpeech = z.object({
  clean_text: z.string().describe("The speaker's final intent as clean prose. Keep 'Name:' speaker labels if present."),
  corrections: z.array(
    z.object({
      original: z.string().describe("Exact substring of the raw text that was discarded or rewritten"),
      resolved: z.string().describe("What it became in the clean text ('' if simply removed)"),
      kind: z.enum(["self_correction", "filler", "digression"]),
    }),
  ),
});
export type CleanSpeech = z.infer<typeof CleanSpeech>;

export const Extraction = z.object({
  title: z.string(),
  meeting_type: z.enum(MEETING_TYPES),
  summary: z.string().describe("Two sentences, plain language"),
  key_points: z.array(z.string()).describe("3-6 short AI notes: the most important points of the meeting"),
  attendees: z.array(z.object({ name: z.string(), email: z.string().nullable() })),
  decisions: z.array(
    z.object({
      text: z.string().describe("The decision as one self-contained sentence"),
      topic_tags: z.array(z.string()).describe("2-4 lowercase topic tags, e.g. 'launch', 'pricing', 'rent'"),
      speaker: z.string().nullable(),
    }),
  ),
  action_items: z.array(
    z.object({
      text: z.string(),
      owner: z.string().nullable(),
      owner_confidence: z.enum(["high", "low"]),
      due_iso: z.string().nullable().describe("ISO 8601 datetime with offset, resolved from relative phrases"),
      due_phrase: z.string().nullable().describe("The words used, e.g. 'next Thursday'"),
      due_confidence: z.enum(["high", "low"]),
      implicit: z.boolean().describe("True for soft commitments like 'I'll look into it'"),
    }),
  ),
});
export type Extraction = z.infer<typeof Extraction>;

export const ConflictJudgement = z.object({
  results: z.array(
    z.object({
      new_index: z.number().int(),
      old_id: z.string(),
      kind: z.enum(["contradicts", "refines", "unrelated"]),
      explanation: z.string().describe("One sentence a busy person understands, citing both decisions"),
    }),
  ),
});

export const DraftPlan = z.object({
  drafts: z.array(
    z.object({
      action_index: z.number().int().describe("Index into action_items, or -1 for a follow-up not tied to one item"),
      executor: z.enum(["email", "calendar", "doc", "announce", "task"]),
      why: z.string().describe("Why this executor, in under 12 words"),
      email: z.object({ to: z.array(z.string()), subject: z.string(), body: z.string() }).nullable(),
      calendar: z.object({
        title: z.string(), start_iso: z.string(), end_iso: z.string(),
        attendees: z.array(z.string()), agenda: z.string(),
      }).nullable(),
      doc: z.object({ title: z.string(), markdown: z.string() }).nullable(),
      announce: z.object({ channel_hint: z.string(), text: z.string() }).nullable(),
      task: z.object({
        title: z.string(), description: z.string(), owner: z.string().nullable(), due_iso: z.string().nullable(),
      }).nullable(),
    }),
  ),
});
export type DraftPlan = z.infer<typeof DraftPlan>;
export type DraftItem = DraftPlan["drafts"][number];

export const VoiceCommand = z.object({
  ops: z.array(
    z.object({
      op: z.enum(["approve", "reject", "edit"]),
      ids: z.array(z.string()),
      field: z.string().nullable().describe("For edit: dotted path inside the payload, e.g. 'calendar.start_iso' or 'email.subject'"),
      value: z.string().nullable(),
    }),
  ),
  confirm_text: z.string().describe("Read-back of exactly what will happen, for the user to confirm"),
});
export type VoiceCommand = z.infer<typeof VoiceCommand>;

export const CheckinParse = z.object({
  updates: z.array(
    z.object({
      action_id: z.string(),
      status: z.enum(["open", "done", "blocked"]),
      blocked_reason: z.string().nullable(),
      new_due_iso: z.string().nullable(),
    }),
  ),
  confirm_text: z.string(),
});
export type CheckinParse = z.infer<typeof CheckinParse>;

export const Markdown = z.object({ markdown: z.string() });

export const LiveNote = z.object({
  tag: z.enum(["decision", "action", "correction", "none"]),
  note: z.string().describe("The note as it should appear in meeting notes: one short sentence, final intent only"),
});
export type LiveNote = z.infer<typeof LiveNote>;
