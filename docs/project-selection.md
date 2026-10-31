# Project Selection: Which Problem Statement to Build

**Decision: #3, Meeting-to-Execution Agent** (working name: **FollowThru**)

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
