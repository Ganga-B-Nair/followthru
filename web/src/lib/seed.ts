import { DEFAULT_MEMBER_PERMISSIONS, ensureUsers, saveMemberPermissions } from "@/lib/auth";
import { newId, one, run, upsertPerson } from "@/lib/db";
import { setIntegration } from "@/lib/integrations";


// Demo workspace: a product team on Zoom, plus a couple of personal meetings,
// so conflict detection shows up across work, home and study.
type Seed = {
  title: string; type: string; at: string; source: string; summary: string; minutes: number; keyPoints: string[];
  attendees: { name: string; email: string | null }[];
  decisions: { text: string; tags: string[]; speaker: string }[];
  actions: { text: string; owner: string; due: string; status: string }[];
  shipped?: { executor: string; title: string; minutes: number }[];
};

const HISTORY: Seed[] = [
  {
    title: "Roadmap review: Sprint 14 priorities", type: "work", at: "2026-10-21T16:00:00+05:30", source: "zoom", minutes: 34,
    summary: "The team ranked Sprint 14 work. Dark-mode export came out on top after repeated customer requests via support.",
    keyPoints: ["Dark-mode export ranked #1 for Sprint 14", "Support may tell customers it's coming", "Onboarding redesign pushed to Sprint 15"],
    attendees: [{ name: "Priya", email: "priya@example.com" }, { name: "Ravi", email: "ravi@example.com" }, { name: "Arjun", email: "arjun@example.com" }, { name: "Meera", email: "meera@example.com" }],
    decisions: [
      { text: "Dark-mode export is the top priority for Sprint 14.", tags: ["dark-mode", "export", "sprint", "roadmap"], speaker: "Priya" },
      { text: "The onboarding redesign moves to Sprint 15.", tags: ["onboarding", "sprint", "roadmap"], speaker: "Ravi" },
    ],
    actions: [
      { text: "Write the dark-mode export spec", owner: "Arjun", due: "2026-10-27T18:00:00+05:30", status: "done" },
      { text: "Share the Q4 roadmap with leadership", owner: "Priya", due: "2026-11-02T12:00:00+05:30", status: "open" },
    ],
    shipped: [{ executor: "doc", title: "Sprint 14 priorities", minutes: 25 }, { executor: "announce", title: "Sprint 14 plan posted", minutes: 5 }],
  },
  {
    title: "Product sync: v2 launch readiness", type: "work", at: "2026-10-23T10:30:00+05:30", source: "zoom", minutes: 41,
    summary: "The team reviewed v2 launch readiness. Launch waits on QA sign-off; Pro pricing is unchanged.",
    keyPoints: ["Launch blocked until QA signs off", "Pro stays at ₹999/month for launch", "Ravi shares the rollout checklist"],
    attendees: [{ name: "Priya", email: "priya@example.com" }, { name: "Ravi", email: "ravi@example.com" }, { name: "Meera", email: "meera@example.com" }],
    decisions: [
      { text: "The v2 launch is blocked until QA signs off on the full regression suite.", tags: ["launch", "qa", "release"], speaker: "Priya" },
      { text: "Pro plan pricing stays at ₹999 per month for the launch.", tags: ["pricing", "launch"], speaker: "Ravi" },
    ],
    actions: [
      { text: "Finish the regression suite and send QA sign-off", owner: "Meera", due: "2026-11-05T18:00:00+05:30", status: "open" },
      { text: "Share the rollout checklist with the team", owner: "Ravi", due: "2026-10-27T10:00:00+05:30", status: "done" },
      { text: "Update the pricing page copy", owner: "Arjun", due: "2026-10-30T18:00:00+05:30", status: "open" },
    ],
    shipped: [{ executor: "email", title: "Launch readiness recap", minutes: 8 }, { executor: "calendar", title: "QA review", minutes: 4 }, { executor: "task", title: "Regression suite", minutes: 3 }],
  },
  {
    title: "Call with landlord about rent and repairs", type: "vendor", at: "2026-10-12T19:00:00+05:30", source: "recap", minutes: 16,
    summary: "The landlord agreed to keep rent unchanged until March and to pay for the plumbing repair.",
    keyPoints: ["Rent stays ₹18,000 until March 2027", "Landlord pays for the kitchen plumbing"],
    attendees: [{ name: "Mr. Sharma", email: null }, { name: "Me", email: null }],
    decisions: [
      { text: "Rent stays at ₹18,000 per month until March 2027.", tags: ["rent", "lease"], speaker: "Mr. Sharma" },
      { text: "The landlord pays for the kitchen plumbing repair.", tags: ["repair", "plumbing"], speaker: "Mr. Sharma" },
    ],
    actions: [{ text: "Pay November rent", owner: "Me", due: "2026-11-05T10:00:00+05:30", status: "open" }],
  },
  {
    title: "Physics class: Electricity unit", type: "class", at: "2026-10-28T09:00:00+05:30", source: "recap", minutes: 12,
    summary: "The teacher set the Electricity unit test date and assigned chapter 12 problems.",
    keyPoints: ["Unit test on Fri 6 Nov", "Chapter 12 problems due Tue 3 Nov"],
    attendees: [{ name: "Me", email: null }, { name: "Mrs. Iyer", email: null }],
    decisions: [{ text: "The Electricity unit test is on Friday 6 November.", tags: ["exam", "physics", "test"], speaker: "Mrs. Iyer" }],
    actions: [{ text: "Solve all chapter 12 exercise problems", owner: "Me", due: "2026-11-03T20:00:00+05:30", status: "open" }],
  },
];

const PEOPLE = [
  { name: "Priya", email: "priya@example.com" }, { name: "Meera", email: "meera@example.com" },
  { name: "Ravi", email: "ravi@example.com" }, { name: "Arjun", email: "arjun@example.com" },
];

const today = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const ZOOM = [
  { id: "z-sprint14", topic: "Sprint 14 planning", start: () => new Date(Date.now() - 2 * 60e3).toISOString(), duration: 30, status: "live", key: "sprint14", people: ["Priya Nair", "Ravi Kumar", "Meera Rao", "Arjun Mehta"] },
  { id: "z-design", topic: "Design sync: onboarding", start: () => "2026-11-03T15:00:00+05:30", duration: 45, status: "scheduled", key: null, people: ["Priya Nair", "Meera Rao", "Arjun Mehta"] },
  { id: "z-weekly", topic: "Weekly product sync", start: () => "2026-11-06T10:30:00+05:30", duration: 30, status: "scheduled", key: null, people: ["Priya Nair", "Ravi Kumar", "Meera Rao", "Arjun Mehta"] },
  { id: "z-acme", topic: "Acme beta kickoff", start: () => "2026-11-09T11:30:00+05:30", duration: 30, status: "scheduled", key: null, people: ["Priya Nair", "Meera Rao", "Acme team"] },
  { id: "z-standup", topic: "Daily standup", start: () => today(9, 30), duration: 15, status: "processed", key: null, people: ["Priya Nair", "Ravi Kumar", "Meera Rao", "Arjun Mehta"] },
];

/** Load the demo workspace; with reset, wipe everything first. */
export async function seedDemo(reset = false): Promise<{ ok: true; meetings: number; zoom: number }> {
  if (reset) {
    for (const t of ["conflicts", "drafts", "action_items", "decisions", "meetings", "people", "checkins", "zoom_meetings", "integrations", "settings"]) await run(`DELETE FROM ${t}`);
  }
  await ensureUsers();
  await run("UPDATE users SET role = CASE id WHEN 'u-priya' THEN 'lead' ELSE 'member' END");
  await saveMemberPermissions(DEFAULT_MEMBER_PERMISSIONS);
  for (const p of PEOPLE) await upsertPerson(p.name, p.email);
  await setIntegration("zoom", true, "priya@example.com");
  await setIntegration("google_calendar", true, "priya@example.com");
  await setIntegration("gmail", true, "priya@example.com");

  for (const m of HISTORY) {
    const id = newId();
    await run(
      `INSERT INTO meetings (id, title, meeting_type, held_at, raw_text, clean_text, corrections_json, attendees_json, summary, key_points_json, source, minutes_saved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?)`,
      [id, m.title, m.type, m.at, m.summary, m.summary, JSON.stringify(m.attendees), m.summary, JSON.stringify(m.keyPoints), m.source, m.minutes, m.at],
    );
    for (const a of m.attendees) await upsertPerson(a.name, a.email);
    for (const d of m.decisions) {
      await run("INSERT INTO decisions (id, meeting_id, text, topic_tags_json, speaker, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [newId(), id, d.text, JSON.stringify(d.tags), d.speaker, m.at]);
    }
    for (const a of m.actions) {
      await run(
        `INSERT INTO action_items (id, meeting_id, text, owner, owner_confidence, due_at, due_confidence, status, created_at)
         VALUES (?, ?, ?, ?, 'high', ?, 'high', ?, ?)`,
        [newId(), id, a.text, a.owner, a.due, a.status, m.at],
      );
    }
    for (const d of m.shipped ?? []) {
      await run("INSERT INTO drafts (id, meeting_id, executor, why, payload_json, status, minutes_saved, executed_at) VALUES (?, ?, ?, '', ?, 'executed', ?, ?)",
        [newId(), id, d.executor, JSON.stringify({ email: null, calendar: null, doc: { title: d.title, markdown: "" }, announce: null, task: null }), d.minutes, m.at]);
    }
  }

  for (const z of ZOOM) {
    await run(
      "INSERT INTO zoom_meetings (id, topic, start_at, duration, host, participants_json, status, notetaker, transcript_key) VALUES (?, ?, ?, ?, 'priya@example.com', ?, ?, 1, ?)",
      [z.id, z.topic, z.start(), z.duration, JSON.stringify(z.people), z.status, z.key],
    );
  }
  return { ok: true, meetings: HISTORY.length, zoom: ZOOM.length };
}

let checked: Promise<void> | null = null;
/**
 * Fill an empty database with the demo workspace, once per server instance. On serverless hosts each
 * instance starts with its own empty database, so every instance needs this on first use.
 */
export function seedIfEmpty(): Promise<void> {
  checked ??= one<{ n: number }>("SELECT COUNT(*) AS n FROM zoom_meetings").then(async (z) => {
    if (!z?.n) await seedDemo();
  }).catch((err) => {
    checked = null; // try again on the next request
    throw err;
  });
  return checked;
}
