# PRD: FollowThru

**Tagline:** *Talk for 30 seconds on your way out. By the time you're at your desk, the follow-ups are done.*
**One-liner:** *Other tools turn meetings into to-dos. FollowThru turns them into done.*
**Owner:** Solo builder · **Deadline:** 2026-10-31, 23:59 · **Problem statement:** #3 Meeting-to-Execution Agent

---

## 1. The problem

Decisions made in meetings get lost. Today's tools stop at the summary:

- Meeting summarizers such as Otter, Fireflies, and Zoom AI produce a recap that nobody reads again.
- Task integrations push "Send pricing deck to Acme" into Notion or Jira. It is still a to-do, and **a human still has to do it**.
- No tool remembers that last Tuesday's meeting decided the *opposite* of today's.

The gap is not capturing the work; it is **finishing** it. Follow-up work is mostly repetitive: emails, calendar invites, one-pagers, and status pings. That is exactly the work an agent can do.

## 2. The competition and the bar

Most teams on this problem statement will build: transcript → summary → action items → push to Notion, Calendar, or Jira. **That is table stakes.** FollowThru includes it but does not compete on it.

## 2.4 v2 product shape: an AI notetaker that works alongside Zoom

FollowThru is **not a new meeting platform**. Teams keep meeting on Zoom. FollowThru's notetaker joins the call, takes AI notes live, and when the call ends it *does* the follow-ups:

1. **Before:** Google Calendar sync shows the upcoming Zoom meetings, with a notetaker on/off toggle for each one.
2. **During:** a live screen shows the transcript with speaker names, and decisions, action items and resolved self-corrections appear as they're said.
3. **After:** the Zoom transcript arrives by webhook, and the agent writes AI notes, flags conflicts with past decisions, and drafts emails, invites, docs and tasks for approval.
4. **Off Zoom:** in-person meetings, calls and classes are covered by the 30-second **Walk-out Recap**, dictated through Wispr Flow.

**Roles.** A **team lead** sees everything and decides what **team members** can see: all meeting notes or only their own, decisions, conflict warnings, teammates' tasks, insights, approving follow-ups, managing connections. The lead can toggle these, or dictate the change through Wispr Flow and confirm it.

**Connections:** Zoom (primary), Google Calendar, Gmail, Notion, Slack, Jira and GitHub, with Google Meet and Teams next.

## 2.5 What FollowThru is (product shape)

- **A web app that works on phone and laptop.** It runs in any browser, and on a phone you can add it to the home screen. There is nothing to install except Wispr Flow, which you already use.
- **Voice comes from Wispr Flow, not from the app.** Wispr Flow types your speech into whatever text box has focus, on desktop or through its phone keyboard. FollowThru gives you a big text box and does the thinking.
- **The connections borrow your existing sign-ins.** Gmail and Google Calendar open as pre-filled pages in the browser where you are already signed in, so the app never sees your Google password or token. Notion uses one integration token you paste in once. Claude API calls run on the server, so your key never reaches the browser.
- **Hackathon build:** single user, no login, data stored in a local SQLite file. **Production path:** Google sign-in (OAuth) for one-click sending, Notion OAuth, and one workspace per team.

## 2.6 Built for every kind of meeting, not just work

A "meeting" is any conversation where something was decided and someone owes something. FollowThru **detects the meeting type** and changes which follow-ups it drafts and the tone it uses:

| Meeting type | What it hears | What it drafts |
|---|---|---|
| 💼 Work / team sync | Decisions, owners, deadlines | Emails, invites, Notion docs, tasks, team announcement |
| 🤝 Client / sales call | Promises made to the client | A follow-up email that recaps what was agreed (a written record), a proposal doc outline, the next-call invite |
| 🎓 Class / lecture / study group | Assignments, exam dates, "read chapter 4" | Calendar deadlines, a study-plan doc, an email to the professor, tasks split between group members |
| 🩺 Doctor / clinic visit | Medicines, tests, the next appointment | Medicine reminders, a test-booking task, a questions list for next time. **It only records what was said and never gives medical advice.** |
| 🏠 Family / household / flatmates | Chores, money splits, trip plans | Tasks for each person, a "who pays what" note, a trip calendar |
| 🏘️ Society / club / RWA / committee | Resolutions and votes | Official minutes, a notice to members, tasks for each owner |
| 👩‍🏫 Parent–teacher meeting | Teacher feedback and agreed steps | A follow-up email to the teacher, a home practice plan, a check-in reminder |
| 🧑‍💼 Interview (either side) | What was discussed, next steps | A thank-you email, a reminder to follow up if there's no reply, notes |
| 🔧 Landlord / contractor / vendor | Repairs, prices, dates agreed verbally | **A "confirming our conversation" email**, so there is proof in writing, plus calendar slots |

**Memory and conflict checks work for every type.** Examples: "The landlord said ₹2,000 on 12 Oct and now says ₹3,500." "The doctor changed the dose since last visit, so confirm you're using the new one."

## 3. The USP: the Walk-out Recap, powered by Execution Drafts

### 3.0 The hero moment
The meeting ends. On your way out you press the Wispr Flow hotkey and ramble for 30 seconds, with fillers, tangents, and "no wait, Thursday" corrections. **Before you reach your desk, FollowThru has written every follow-up email, invite, doc, and task, checked them against everything your team decided before, and lined them up for one approval.** You say "ship it," and the follow-through is done.

Why this beats competitors:
- **No meeting bot or recording is needed.** It works for in-person meetings, hallway chats, and calls on any platform. If you can talk, it works.
- **Thirty seconds of voice replaces about 30 minutes of follow-up work.** That is the utility metric.
- **Voice is the whole interface:** input (the recap), control (voice approval), and updates (voice check-ins).

### 3.1 Execution Drafts: "It doesn't make to-dos. It does them."
For every action item, the agent decides **whether it can do the work itself**. If it can, it produces a **ready-to-ship draft**:

| Action item heard in the meeting | What FollowThru prepares |
|---|---|
| "Priya will email Acme the revised pricing" | A complete email draft to Acme, in Priya's voice, with the decided numbers. One click opens it in Gmail. |
| "Let's sync with design next Thursday" | A calendar invite with the right attendees, the time resolved from "next Thursday," and an agenda built from open items. One click adds it to Google Calendar. |
| "Ravi to write up the rollout plan" | A first-draft rollout doc built from the decisions in this meeting and past ones. One click creates a Notion page. |
| "We should tell the team the launch moved" | A Slack or team announcement draft. |
| "Someone look into competitor X" | A short research brief and a task with an owner. |
| Anything it can't draft | A well-formed task with owner, deadline, and context. One click sends it to Notion or GitHub Issues. |

**The meeting ends, and roughly 70% of the follow-up work is already drafted and waiting for one-tap approval.** That is the "you would never go back" moment.

### 3.2 The closed loop: four things nobody else does together

1. **🎙️ Speech-to-Intent with a visible correction diff (the Wispr Flow showcase).** Raw dictation such as *"umm so we're shipping Friday, no wait, Thursday, and uh Ravi, actually Priya, owns it"* is shown next to the resolved intent ("Ship Thursday · Owner: Priya"). Discarded self-corrections are ~~struck through~~. Judges *see* the agent handle messy speech.
2. **🧠 Decision memory and conflict guard.** Every decision is stored with its topic, source meeting, and speaker. When a new decision contradicts an old one, FollowThru raises a **Conflict card**: *"Today: launch Thursday. 24 Oct (Product sync): launch blocked until QA sign-off, which is still open."* The user chooses Supersede, Keep both, or Flag for discussion.
3. **✅ Approval Queue (the mandated confirmation step).** Nothing leaves the app without approval. You can approve with a click or **by voice**: dictate *"ship all of them except the email to Acme, change the date to Friday"* through Wispr Flow, and the agent applies the edits and executes.
4. **🔁 Open-Loop Brief.** Before the next meeting with the same people, FollowThru generates the agenda: overdue items, unresolved conflicts, and decisions awaiting confirmation. The next meeting starts where the last one stopped. This loop is the reason a user would never go back.

Supporting features: deadline reminders, a weekly digest per person, and **voice check-ins**, where an owner dictates *"done with the deck, blocked on legal for the contract"* and the agent updates both items.

## 4. Users

- **Primary:** a team lead, founder, or PM who runs 5 to 15 meetings a week and owns the follow-through.
- **Secondary:** attendees who receive their digest, drafts, and reminders.
- **Demo persona:** a startup PM who runs a product sync, records a 30-second Walk-out Recap through Wispr Flow while leaving the room, and finds every follow-up drafted before reaching their desk.

## 5. User stories

| # | As a... | I want to... | So that... |
|---|---|---|---|
| U1 | Lead | dictate a messy recap or paste a transcript | I don't have to write clean notes |
| U2 | Lead | see what the agent understood, including corrections it resolved | I trust the output |
| U3 | Lead | get decisions, actions, owners, and deadlines extracted | nothing is lost |
| U4 | Lead | be warned when a decision contradicts a past one | we don't silently reverse ourselves |
| U5 | Lead | get ready-to-send drafts for follow-ups | the work is done, not just listed |
| U6 | Lead | approve, edit, or reject everything before it is posted, including by voice | nothing embarrassing goes out |
| U7 | Lead | push tasks to Notion or GitHub and events to Google Calendar | it fits my existing tools |
| U8 | Attendee | get reminders before deadlines and a weekly digest | I know what I owe |
| U9 | Attendee | give a status update by voice | updating is effortless |
| U10 | Lead | get an Open-Loop Brief before the next meeting | meetings build on each other |

## 6. Functional requirements

### P0: must ship for the demo
- **F0 Walk-out Recap mode:** a full-screen capture view with a 30-second timer, a "🎙️ Hold your Wispr Flow key and talk" prompt, and auto-submit after a pause. A "time saved" counter appears on the results.
- **F1 Ingest:** a text area built for Wispr Flow dictation, plus paste of `Speaker: text` transcripts and `.txt`/`.vtt` upload. Meeting title, date, and attendees are optional; the agent infers them when missing.
- **F2 Speech-to-Intent:** cleans fillers, resolves self-corrections, and strips digressions. Shows a side-by-side view of raw speech and resolved intent, with the discarded phrases struck through.
- **F3 Extraction:** decisions, action items, owners, and deadlines. Relative dates such as "next Thursday" resolve to real dates. Speaker attribution comes with a confidence level. Implicit commitments ("I'll look into it") are captured too.
- **F4 Decision memory:** stores every decision, and adds a searchable Decisions page with a timeline.
- **F5 Conflict detection:** compares new decisions with stored ones and shows Conflict cards with Supersede, Keep both, and Flag options.
- **F6 Execution Drafts:** for each action, chooses an executor (email, calendar, doc, announcement, or task) and generates the draft.
- **F7 Approval Queue:** approve, edit, or reject each item, in bulk or by voice command.
- **F8 Execute:**
  - **Gmail:** opens a pre-filled compose link (no OAuth).
  - **Google Calendar:** opens a pre-filled event link, with an `.ics` download as a fallback (no OAuth).
  - **Notion:** creates a page or task through the Notion API with an internal integration token.
  - **Copy to clipboard** for any draft.

### P1: ship if time allows
- **F9 Reminders:** a list of items due within 24 or 48 hours, plus a "Simulate time" control for the demo.
- **F10 Weekly digest per person:** one page per person, with an email draft.
- **F11 Open-Loop Brief:** generated per recurring meeting or attendee group.
- **F12 Voice check-in:** a dictated status update changes item states.
- **F13 GitHub Issues** as a second tracker.

### P2: stretch
- Learn each owner's writing voice from edits they make to drafts.
- A Slack webhook for posting announcements.
- Full Google OAuth for direct event creation.

## 7. Guardrails
- **Nothing is sent, posted, or created without explicit approval** (F7).
- Low-confidence owners or dates are shown as "❓ Needs confirmation" and never guessed silently.
- Drafts quote only facts stated in meetings and never invent numbers or commitments.
- The user can delete any stored meeting or decision.

## 8. Success metrics

| Metric | Target for the demo |
|---|---|
| Action items that get an executable draft | ≥ 60% |
| Self-corrections resolved correctly (demo scripts) | 100% |
| Seeded conflicts detected | 100% |
| Time from end of dictation to ready queue | < 20 s |
| Recap length needed for a full follow-up set | ≤ 30 s of speech |
| Follow-up time saved, shown in the UI ("~25 min saved") | Estimated per draft type |
| Clicks to approve and execute everything | ≤ 3 |

## 9. Demo script (2 minutes)
1. **Seed:** an earlier meeting from 23 Oct already in memory ("Launch blocked until QA sign-off").
2. **The Walk-out Recap:** start a 30-second on-screen timer and dictate live through Wispr Flow a messy recap that includes self-corrections and a launch-date decision.
3. **Speech-to-Intent view:** the corrections are struck through and the intent is clean.
4. **Conflict card appears:** "This contradicts the 23 Oct decision." Choose Flag.
5. **Approval Queue:** an email draft, a calendar invite, a Notion rollout doc, and a task.
6. **Approve by voice:** *"ship everything, but move the sync to Friday."*
7. Gmail compose opens, the event lands in Google Calendar, and the Notion page appears.
8. **Open-Loop Brief** for next week's meeting.

## 10. Out of scope
Live meeting bots that join Zoom or Meet, audio file transcription (Wispr Flow is the speech layer), multi-tenant authentication, and mobile apps.

## 11. Mapping to the judging rubric

| Criterion | How FollowThru scores |
|---|---|
| Wispr Flow usage, 20% | Built 100% by voice (prompt log). Wispr Flow dictation is the main product input. Voice approval and voice check-ins. A visible correction diff. |
| Prototype and UX, 20% | A single flow from dictation to queue to done. Approval in 3 clicks or 1 sentence. |
| AI integration, 20% | A multi-step agent: clean → extract → recall → judge conflicts → plan executors → draft → apply voice edits. |
| Problem understanding, 15% | Targets the real failure, which is follow-through rather than capture. Includes cross-meeting memory as the brief requires. |
| Innovation, 10% | Execution Drafts and the Open-Loop Brief, where competitors stop at to-dos. |
| LinkedIn, 15% + bonus | "I built an agent that does my meeting homework, entirely by voice." |

---

## Appendix A: Why this problem statement


Context: solo builder, one-day deadline (submission ~11:59 PM), exams running in parallel, every build prompt dictated through Wispr Flow.

## Scoring

Scores out of 5. "Crowding" means how many teams are likely to build it; a higher score means fewer teams.

| # | Problem | Crowding | Voice fit | AI depth | Solo feasibility (1 day) | Demo wow | Total |
|---|---|---|---|---|---|---|---|
| 1 | Media repurposing studio | 4 | 2 | 4 | 1 | 5 | 16 |
| 2 | Adaptive exam tutor | 1 | 3 | 4 | 3 | 3 | 14 |
| 3 | **Meeting-to-execution agent** | **3** | **5** | **5** | **4** | **4** | **21** |
| 4 | Personal finance coach | 1 | 3 | 3 | 3 | 3 | 13 |
| 5 | Career pivot coach | 1 | 3 | 3 | 4 | 3 | 14 |

## Why the others lose

- **Finance coach, career coach, exam tutor:** these are the default student-hackathon topics, so expect most teams to pick them. The exam tutor is the most crowded, because "Class 10 physics" is a familiar syllabus to nearly every Indian student. Standing out from many similar demos is hard.
- **Media repurposing:** few teams will pick it, but long video ingestion, clipping, and rendering, plus a performance loop that needs real platform metrics, is too much for one person during an exam week. Its voice fit is also weak, because the input is a video file, not your speech.

## Why the meeting agent wins

1. **The best match for the Wispr Flow requirement (20%).** The brief says real speech has filler words, digressions, and self-corrections. Meeting talk is exactly that kind of speech. Phrases like *"let's ship Friday, no wait, Thursday"* and *"Ravi will take it, actually Priya"* are self-corrections the agent must resolve into the final decision. The input format and the judging criterion are the same thing.
2. **Real AI depth (20%).** The brief itself names cross-meeting memory and conflict detection as the hard part. That means LLM extraction, semantic retrieval over past decisions, and LLM-judged contradiction detection. This is a real agent pipeline, not a single summarization prompt.
3. **Fewer competitors who do it well.** Many teams will build "an AI meeting summarizer." Few will build memory, conflicts, a tracker integration, and a confirmation step. The brief tells judges to look for those, so they become our differentiators.
4. **Feasible solo.** Everything is text in, structured JSON out, and a small database. No video processing and no bank PDFs. The tracker integration can be GitHub Issues or Trello (both have simple REST APIs).
5. **Voice in both directions.** You dictate meeting notes or a recap through Wispr Flow, and you also *talk to* the system: "what did we decide about pricing?" or "yes, post those three tasks" (a voice-driven confirmation step).
6. **A good LinkedIn story.** "I built a meeting agent entirely by voice, and it runs on voice" is a hook built for engagement.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Speaker attribution from single-speaker dictation | Support both pasted multi-speaker transcripts (`Name: text`) and dictated recaps where the LLM infers who said or owns what. Show attribution confidence. |
| Tracker integration auth eats time | Use one integration (GitHub Issues with a personal token, or Trello), and keep a local tracker as a fallback. |
| Reminders and digests need schedulers | Run them on a simple in-app scheduler or a "simulate time" button for the demo. |
| Time | Ship in this order: extraction → memory and conflicts → confirm and post → digest and reminders. |

## Appendix B: All five problem statements (verbatim)


---

### 1. Media Content Repurposing Studio with Brand Memory

Teams must build:

- long video or podcast ingestion;
- clip selection with reasons given for each choice;
- captions and copy tailored to each platform;
- a brand-voice memory that learns from the creator's edits;
- a content calendar;
- a performance feedback loop that changes future suggestions based on what actually performed.

---

### 2. Adaptive Exam Prep Tutor with a Learner Model

Generic AI tutors answer questions but don't track what a student actually understands.

Teams must build:

- a diagnostic test;
- a concept graph for one syllabus, such as Class 10 physics;
- a learner model that updates mastery for each concept after every answer;
- question generation targeted at weak concepts, with difficulty calibration;
- misconception detection from the reasoning in wrong answers, not just from the wrong final answer;
- spaced-repetition scheduling;
- a teacher dashboard showing class-wide gaps.

---

### 3. Meeting Execution: Meeting-to-Execution Agent  ✅ SELECTED

Decisions made in meetings get lost.

Teams must build:

- transcript ingestion with speaker attribution;
- extraction of decisions, action items, owners, and deadlines;
- detection of conflicts with earlier decisions stored in memory;
- creation of tasks in a tracker through an integration;
- reminders before deadlines;
- a weekly digest per person;
- a confirmation step before anything gets posted.

The cross-meeting memory and the conflict detection are what make this a real system rather than a transcript summarizer.

---

### 4. Personal Finance Coach with a Living Money Model

Most budgeting apps categorize transactions and stop there. They don't understand a person's goals or adapt as life changes.

Teams must build:

- ingestion of bank statements in messy formats (PDF, CSV, and transaction SMS), with automatic categorization;
- a correction loop where the user fixes a category and the system learns the rule for future transactions;
- detection of recurring payments and subscriptions, with alerts when one changes or goes unused;
- a persistent financial profile covering income, fixed costs, emergency fund, and goals with target dates;
- a goal planner with what-if simulation, such as "what if I cut dining out by 30%" or "what if my rent goes up";
- nudges when spending drifts off plan;
- a monthly review report;
- clear guardrails, so the coach educates and models scenarios but doesn't recommend specific securities.

---

### 5. Career Pivot Coach

Teams must build:

- resume and target-role intake;
- a skill-gap map built from real job descriptions;
- a week-by-week learning plan;
- portfolio project suggestions matched to the gaps;
- mock interviews scored against a rubric;
- progress tracking that adjusts the plan;
- an application tracker that learns which kinds of roles get responses.

---

### Cross-cutting voice requirement

The main input to the product is natural speech captured through **Wispr Flow**. Real speech has filler words, digressions, and self-corrections. The agent has to turn it into clear, structured output.

### Evaluation rubric

| Criterion | Weight |
|---|---|
| Wispr Flow usage | 20% |
| Prototype quality and UX | 20% |
| AI integration | 20% |
| Problem understanding | 15% |
| LinkedIn content and engagement | 15% |
| Innovation and creativity | 10% |
| Bonus | LinkedIn engagement |
