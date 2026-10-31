// Curated agent results for the demo meetings. Used only in demo mode (no AI key), so
// recordings always show what the live agent produces for these exact inputs.
import type { CleanSpeech, DraftPlan, Extraction } from "./schemas";

export type TranscriptLine = { speaker: string; text: string; at: number; tag?: "decision" | "action" | "correction" };

export type Fixture = {
  match: string;
  clean: CleanSpeech;
  extract: Extraction;
  conflicts: { new_index: number; old_contains: string; kind: "contradicts" | "refines"; explanation: string }[];
  plan: DraftPlan;
};

const blank = { email: null, calendar: null, doc: null, announce: null, task: null };

export const SPRINT_TRANSCRIPT: TranscriptLine[] = [
  { at: 0, speaker: "Priya", text: "Okay, let's get started. This is sprint 14 planning. Arjun, Meera, Ravi, thanks for joining." },
  { at: 6, speaker: "Priya", text: "First thing. I think we should drop the dark-mode export from this sprint. It's not what customers are asking for.", tag: "decision" },
  { at: 13, speaker: "Ravi", text: "Agreed. Onboarding redesign is the bigger win. Let's commit to shipping that in sprint 14.", tag: "decision" },
  { at: 20, speaker: "Meera", text: "For the Acme beta, how many users are we inviting? Thirty? Actually, no, let's keep it to twenty so we can support them properly.", tag: "correction" },
  { at: 28, speaker: "Priya", text: "Twenty it is. Beta starts Monday the 9th.", tag: "decision" },
  { at: 32, speaker: "Priya", text: "Meera, can you email Acme and get the twenty users invited?" },
  { at: 36, speaker: "Meera", text: "Yep, I'll send that today.", tag: "action" },
  { at: 39, speaker: "Arjun", text: "I'll set up the beta feedback form by Friday.", tag: "action" },
  { at: 44, speaker: "Priya", text: "Ravi, can you write the beta onboarding guide? Something they can follow without us on a call." },
  { at: 50, speaker: "Ravi", text: "Sure, I'll have a draft by Wednesday.", tag: "action" },
  { at: 54, speaker: "Priya", text: "And let's book a kickoff call with Acme on Monday at 11, um, actually make it 11:30, I have a conflict.", tag: "correction" },
  { at: 62, speaker: "Arjun", text: "Should we tell the rest of the team dark mode is out? Support has been promising it to customers." },
  { at: 68, speaker: "Priya", text: "Yes, someone please post that in the team channel. Okay, that's it, thanks all.", tag: "action" },
];

export const transcriptText = (lines: TranscriptLine[]) => lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");

const FIXTURES: Fixture[] = [
  {
    match: "Okay so um quick recap of the product sync",
    clean: {
      clean_text:
        "Quick recap of the product sync. Priya, Ravi and Meera were there. We decided we're launching v2 on Thursday 5 November, because marketing wants the full week. Priya will email Acme the revised pricing, since she owns the Acme account, and the Pro plan is going up to ₹1,199 a month. Let's do a design sync next Tuesday at 3 with Meera to finalize the onboarding screens. Ravi will write up the rollout plan by Monday. Someone should tell the whole team that the launch date moved.",
      corrections: [
        { original: "Friday, no wait, Thursday the 5th", resolved: "Thursday the 5th", kind: "self_correction" },
        { original: "Ravi will email Acme the revised pricing, actually no, Priya will", resolved: "Priya will email Acme the revised pricing", kind: "self_correction" },
        { original: "Oh and the coffee machine is broken again, anyway.", resolved: "", kind: "digression" },
        { original: "Okay so um", resolved: "", kind: "filler" },
      ],
    },
    extract: {
      title: "Product sync: v2 launch date and Acme pricing",
      meeting_type: "work",
      summary: "The team moved the v2 launch to Thursday 5 November and raised Pro pricing to ₹1,199 a month. Follow-ups cover the Acme pricing email, a design sync and the rollout plan.",
      key_points: [
        "v2 launch moves to Thu 5 Nov so marketing gets the full week",
        "Pro plan goes from ₹999 to ₹1,199 per month; Priya tells Acme",
        "Onboarding screens get finalized with Meera on Tuesday",
        "Ravi owns the rollout plan, due Monday",
      ],
      attendees: [
        { name: "Priya", email: "priya@example.com" },
        { name: "Ravi", email: "ravi@example.com" },
        { name: "Meera", email: "meera@example.com" },
      ],
      decisions: [
        { text: "The v2 launch moves to Thursday 5 November so marketing gets the full week.", topic_tags: ["launch", "release"], speaker: null },
        { text: "Pro plan pricing goes up to ₹1,199 per month.", topic_tags: ["pricing", "launch"], speaker: null },
        { text: "Onboarding screens get finalized in a design sync on Tuesday 3 November.", topic_tags: ["design", "onboarding"], speaker: null },
      ],
      action_items: [
        { text: "Email Acme the revised Pro pricing (₹1,199/month)", owner: "Priya", owner_confidence: "high", due_iso: null, due_phrase: null, due_confidence: "low", implicit: false },
        { text: "Run the design sync with Meera to finalize onboarding screens", owner: "Me", owner_confidence: "high", due_iso: "2026-11-03T15:00:00+05:30", due_phrase: "next Tuesday at 3", due_confidence: "high", implicit: false },
        { text: "Write up the v2 rollout plan", owner: "Ravi", owner_confidence: "high", due_iso: "2026-11-02T10:00:00+05:30", due_phrase: "by Monday", due_confidence: "high", implicit: false },
        { text: "Tell the whole team that the launch date moved", owner: null, owner_confidence: "low", due_iso: null, due_phrase: null, due_confidence: "low", implicit: true },
      ],
    },
    conflicts: [
      { new_index: 0, old_contains: "blocked until QA", kind: "contradicts", explanation: "Today you set the v2 launch for Thu 5 Nov, but on 23 Oct the launch was blocked until QA signs off, and Meera's sign-off is only due on the evening of 5 Nov." },
      { new_index: 1, old_contains: "₹999", kind: "contradicts", explanation: "Today the Pro plan goes to ₹1,199 a month, but on 23 Oct you agreed it stays at ₹999 for the launch." },
    ],
    plan: {
      drafts: [
        {
          ...blank, action_index: 0, executor: "email", why: "Pricing change must reach the client in writing",
          email: {
            to: ["[[TODO: Acme contact email]]"],
            subject: "Updated Pro plan pricing ahead of our v2 launch",
            body: "Hi [[TODO: Acme contact name]],\n\nA quick heads-up before our v2 launch on Thursday 5 November: the Pro plan is moving to ₹1,199 per month.\n\nNothing changes for you until your next renewal, and I'm happy to walk you through what's new in v2 so you can see where the extra value is.\n\nWould a 15-minute call this week work?\n\nBest,\nPriya",
          },
        },
        {
          ...blank, action_index: 1, executor: "calendar", why: "Meeting with a time agreed",
          calendar: {
            title: "Design sync: finalize onboarding screens",
            start_iso: "2026-11-03T15:00:00+05:30", end_iso: "2026-11-03T15:45:00+05:30",
            attendees: ["meera@example.com"],
            agenda: "1. Walk through the latest onboarding screens (Meera)\n2. Lock copy and empty states\n3. Confirm the hand-off date so they make the Thu 5 Nov launch",
          },
        },
        {
          ...blank, action_index: 2, executor: "doc", why: "Plan write-up, drafted from today's decisions",
          doc: {
            title: "v2 rollout plan (draft)",
            markdown: "# v2 rollout plan\n\n**Launch:** Thursday 5 November\n**Owner:** Ravi\n\n## Decisions so far\n- Launch moved to Thu 5 Nov so marketing gets the full week\n- Pro plan goes to ₹1,199/month (Priya tells Acme)\n- Onboarding screens finalized in the Tue 3 Nov design sync\n\n## Risks\n- QA sign-off is due the evening of 5 Nov, the same day as launch [[TODO: confirm with Meera]]\n\n## Checklist\n- [ ] Regression suite signed off\n- [ ] Pricing page updated to ₹1,199\n- [ ] Acme notified\n- [ ] Release notes published\n- [ ] Support briefed on the new onboarding flow\n\n## Rollback\n[[TODO: rollback owner and trigger]]",
          },
        },
        {
          ...blank, action_index: 3, executor: "announce", why: "Whole team needs to know the date moved",
          announce: {
            channel_hint: "Team channel (Slack)",
            text: "📣 **v2 launch update:** we're now launching on **Thursday 5 November** so marketing gets the full week. Pro pricing moves to ₹1,199/month with the launch. Questions → Priya.",
          },
        },
        {
          ...blank, action_index: -1, executor: "task", why: "Launch date now depends on QA timing",
          task: {
            title: "Confirm QA sign-off lands before the Thu 5 Nov launch",
            description: "The launch moved to 5 Nov, but QA sign-off was due that evening. Confirm the regression suite can be signed off by 4 Nov, or flag the risk.",
            owner: "Meera", due_iso: "2026-11-04T18:00:00+05:30",
          },
        },
      ],
    },
  },
  {
    match: "So I just got off the phone with Mr. Sharma",
    clean: {
      clean_text:
        "I just got off the phone with Mr. Sharma, the landlord. He says rent is going up to ₹20,000 from January. He won't cover the plumbing any more; I have to pay the plumber myself. He's coming to inspect the flat on Saturday at 11. I need to send him the plumber's bill, and I should get all of this in writing.",
      corrections: [
        { original: "from December, no sorry, from January", resolved: "from January", kind: "self_correction" },
        { original: "which, honestly, whatever.", resolved: "", kind: "digression" },
        { original: "And he, like, he won't", resolved: "He won't", kind: "filler" },
        { original: "Um, he says", resolved: "He says", kind: "filler" },
      ],
    },
    extract: {
      title: "Call with landlord: rent increase and plumbing",
      meeting_type: "vendor",
      summary: "Mr. Sharma is raising rent to ₹20,000 from January and will no longer pay for plumbing. He inspects the flat on Saturday 7 November at 11:00.",
      key_points: ["Rent ₹18,000 → ₹20,000 from January", "Plumbing repairs now on the tenant", "Inspection Sat 7 Nov, 11:00", "Nothing agreed in writing yet"],
      attendees: [{ name: "Mr. Sharma", email: null }, { name: "Me", email: null }],
      decisions: [
        { text: "Rent goes up to ₹20,000 per month from January 2027.", topic_tags: ["rent", "lease"], speaker: "Mr. Sharma" },
        { text: "The tenant now pays for plumbing repairs, not the landlord.", topic_tags: ["repair", "plumbing"], speaker: "Mr. Sharma" },
        { text: "The landlord inspects the flat on Saturday 7 November at 11:00.", topic_tags: ["inspection"], speaker: "Mr. Sharma" },
      ],
      action_items: [
        { text: "Send Mr. Sharma the plumber's bill", owner: "Me", owner_confidence: "high", due_iso: null, due_phrase: null, due_confidence: "low", implicit: false },
        { text: "Be home for the inspection", owner: "Me", owner_confidence: "high", due_iso: "2026-11-07T11:00:00+05:30", due_phrase: "Saturday at eleven", due_confidence: "high", implicit: false },
        { text: "Get the new rent and repair terms in writing", owner: "Me", owner_confidence: "high", due_iso: null, due_phrase: null, due_confidence: "low", implicit: true },
      ],
    },
    conflicts: [
      { new_index: 0, old_contains: "₹18,000", kind: "contradicts", explanation: "Today rent goes to ₹20,000 from January, but on 12 Oct Mr. Sharma agreed rent stays at ₹18,000 until March 2027." },
      { new_index: 1, old_contains: "plumbing repair", kind: "contradicts", explanation: "Today you were told to pay the plumber yourself, but on 12 Oct the landlord agreed to pay for the kitchen plumbing repair." },
    ],
    plan: {
      drafts: [
        {
          ...blank, action_index: 2, executor: "email", why: "Verbal change to terms needs a paper trail",
          email: {
            to: ["[[TODO: Mr. Sharma's email]]"],
            subject: "Confirming our call today: rent and plumbing",
            body: "Dear Mr. Sharma,\n\nThank you for the call today. To make sure we're on the same page, here is what I understood:\n\n- Rent would increase to ₹20,000 per month from January 2027.\n- Plumbing repairs would now be paid by me.\n- You will inspect the flat on Saturday 7 November at 11:00.\n\nOn our call on 12 October we had agreed that rent stays at ₹18,000 until March 2027 and that you would cover the kitchen plumbing repair. Could you please confirm in writing which terms apply, with reference to our rental agreement?\n\nThank you,\n[[TODO: your name]]",
          },
        },
        {
          ...blank, action_index: 1, executor: "calendar", why: "Appointment at a fixed time",
          calendar: {
            title: "Flat inspection: Mr. Sharma",
            start_iso: "2026-11-07T11:00:00+05:30", end_iso: "2026-11-07T11:45:00+05:30", attendees: [],
            agenda: "- Show the kitchen plumbing repair\n- Hand over a copy of the plumber's bill\n- Ask for the new terms in writing",
          },
        },
        {
          ...blank, action_index: 0, executor: "email", why: "Bill must reach him before the inspection",
          email: {
            to: ["[[TODO: Mr. Sharma's email]]"],
            subject: "Plumber's bill for the kitchen repair",
            body: "Dear Mr. Sharma,\n\nPlease find attached the plumber's bill for the kitchen repair, for [[TODO: amount]].\n\nAs agreed on 12 October, I understood this repair would be covered by you. Happy to discuss on Saturday.\n\nRegards,\n[[TODO: your name]]",
          },
        },
        {
          ...blank, action_index: -1, executor: "task", why: "Check your rights before you agree",
          task: { title: "Check the rental agreement's rent-revision clause", description: "Before Saturday, look up how much notice the agreement requires for a rent increase and who is responsible for repairs.", owner: "Me", due_iso: "2026-11-06T20:00:00+05:30" },
        },
      ],
    },
  },
  {
    match: "Priya: Okay, let's get started. This is sprint 14 planning",
    clean: {
      clean_text: transcriptText(SPRINT_TRANSCRIPT)
        .replace("Thirty? Actually, no, let's keep it to twenty", "Let's keep it to twenty")
        .replace("on Monday at 11, um, actually make it 11:30", "on Monday at 11:30"),
      corrections: [
        { original: "Thirty? Actually, no, let's keep it to twenty", resolved: "twenty users", kind: "self_correction" },
        { original: "on Monday at 11, um, actually make it 11:30", resolved: "Monday at 11:30", kind: "self_correction" },
      ],
    },
    extract: {
      title: "Sprint 14 planning",
      meeting_type: "work",
      summary: "Dark-mode export is out of Sprint 14 and the onboarding redesign is in. The Acme beta starts Monday 9 November with 20 users.",
      key_points: [
        "Dark-mode export dropped from Sprint 14",
        "Sprint 14 commits to the onboarding redesign",
        "Acme beta: 20 users, starts Mon 9 Nov",
        "Kickoff call with Acme Mon 9 Nov at 11:30",
      ],
      attendees: [
        { name: "Priya", email: "priya@example.com" },
        { name: "Ravi", email: "ravi@example.com" },
        { name: "Meera", email: "meera@example.com" },
        { name: "Arjun", email: "arjun@example.com" },
      ],
      decisions: [
        { text: "Dark-mode export is dropped from Sprint 14.", topic_tags: ["dark-mode", "export", "sprint", "roadmap"], speaker: "Priya" },
        { text: "Sprint 14 commits to shipping the onboarding redesign.", topic_tags: ["onboarding", "sprint"], speaker: "Ravi" },
        { text: "The Acme beta starts Monday 9 November with 20 users.", topic_tags: ["beta", "acme"], speaker: "Priya" },
      ],
      action_items: [
        { text: "Email Acme to invite the 20 beta users", owner: "Meera", owner_confidence: "high", due_iso: "2026-10-31T18:00:00+05:30", due_phrase: "today", due_confidence: "high", implicit: false },
        { text: "Set up the beta feedback form", owner: "Arjun", owner_confidence: "high", due_iso: "2026-11-06T18:00:00+05:30", due_phrase: "by Friday", due_confidence: "high", implicit: false },
        { text: "Write the beta onboarding guide", owner: "Ravi", owner_confidence: "high", due_iso: "2026-11-04T18:00:00+05:30", due_phrase: "by Wednesday", due_confidence: "high", implicit: false },
        { text: "Book the Acme beta kickoff call", owner: "Priya", owner_confidence: "high", due_iso: "2026-11-09T11:30:00+05:30", due_phrase: "Monday at 11:30", due_confidence: "high", implicit: false },
        { text: "Tell the team that dark-mode export is out of this sprint", owner: null, owner_confidence: "low", due_iso: null, due_phrase: null, due_confidence: "low", implicit: false },
      ],
    },
    conflicts: [
      { new_index: 0, old_contains: "Dark-mode export is the top priority", kind: "contradicts", explanation: "Today dark-mode export was dropped from Sprint 14, but in the 21 Oct roadmap review it was named the top priority for Sprint 14, and support has been promising it to customers." },
    ],
    plan: {
      drafts: [
        {
          ...blank, action_index: 0, executor: "email", why: "Invitation to the client",
          email: {
            to: ["[[TODO: Acme contact email]]"],
            subject: "You're invited: FollowThru beta starts Monday 9 November",
            body: "Hi [[TODO: Acme contact name]],\n\nWe're excited to start the beta with your team on **Monday 9 November**. We've set aside 20 seats so we can support everyone properly.\n\nCould you send us the names and emails of the 20 people you'd like to include? We'll share an onboarding guide before Monday and run a short kickoff call at 11:30 that day.\n\nThanks,\nMeera",
          },
        },
        {
          ...blank, action_index: 1, executor: "doc", why: "Form questions drafted from the beta goals",
          doc: {
            title: "Beta feedback form: questions",
            markdown: "# Acme beta feedback form\n\n## About you\n- Role\n- How often do you run meetings? (daily / weekly / rarely)\n\n## Onboarding\n- How easy was it to get started? (1–5)\n- Where did you get stuck?\n\n## Follow-ups\n- Were the drafted follow-ups ready to send without edits? (always / mostly / rarely)\n- Which draft type saved you the most time?\n\n## Open\n- What would make you use this after every meeting?",
          },
        },
        {
          ...blank, action_index: 2, executor: "doc", why: "Guide drafted from today's decisions",
          doc: {
            title: "Beta onboarding guide (draft)",
            markdown: "# Welcome to the beta\n\n**Starts:** Monday 9 November · **Seats:** 20\n\n## Before the kickoff\n- [ ] Accept your invite email\n- [ ] Connect Zoom and Google Calendar\n\n## Your first meeting\n1. Run your usual Zoom meeting; the notetaker joins automatically\n2. After the call, review the drafted follow-ups\n3. Approve with one click, or say \"ship it\"\n\n## Getting help\n[[TODO: support channel]]",
          },
        },
        {
          ...blank, action_index: 3, executor: "calendar", why: "Kickoff at the corrected time",
          calendar: {
            title: "Acme beta kickoff",
            start_iso: "2026-11-09T11:30:00+05:30", end_iso: "2026-11-09T12:00:00+05:30",
            attendees: ["priya@example.com", "meera@example.com", "[[TODO: Acme contacts]]"],
            agenda: "1. Welcome and goals for the beta\n2. Walkthrough of the onboarding guide (Ravi)\n3. How to give feedback (Arjun's form)",
          },
        },
        {
          ...blank, action_index: 4, executor: "announce", why: "Support has been promising this feature",
          announce: { channel_hint: "Team channel (Slack)", text: "Heads-up 👋 **Dark-mode export is out of Sprint 14.** We're focusing on the onboarding redesign for the Acme beta (starts Mon 9 Nov). Support: please stop promising dark-mode export dates for now." },
        },
      ],
    },
  },
];

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function findFixture(raw: string): Fixture | null {
  const n = norm(raw);
  return FIXTURES.find((f) => n.startsWith(norm(f.match))) ?? null;
}
