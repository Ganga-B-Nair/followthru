# Hackathon Problem Statements

All five problem statements from the hackathon brief, recorded verbatim (pasted from the official brief, not dictated).

---

## 1. Media Content Repurposing Studio with Brand Memory

Teams must build:

- long video or podcast ingestion;
- clip selection with reasons given for each choice;
- captions and copy tailored to each platform;
- a brand-voice memory that learns from the creator's edits;
- a content calendar;
- a performance feedback loop that changes future suggestions based on what actually performed.

---

## 2. Adaptive Exam Prep Tutor with a Learner Model

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

## 3. Meeting Execution: Meeting-to-Execution Agent  ✅ SELECTED

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

## 4. Personal Finance Coach with a Living Money Model

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

## 5. Career Pivot Coach

Teams must build:

- resume and target-role intake;
- a skill-gap map built from real job descriptions;
- a week-by-week learning plan;
- portfolio project suggestions matched to the gaps;
- mock interviews scored against a rubric;
- progress tracking that adjusts the plan;
- an application tracker that learns which kinds of roles get responses.

---

## Cross-cutting voice requirement

The main input to the product is natural speech captured through **Wispr Flow**. Real speech has filler words, digressions, and self-corrections. The agent has to turn it into clear, structured output.

## Evaluation rubric

| Criterion | Weight |
|---|---|
| Wispr Flow usage | 20% |
| Prototype quality and UX | 20% |
| AI integration | 20% |
| Problem understanding | 15% |
| LinkedIn content and engagement | 15% |
| Innovation and creativity | 10% |
| Bonus | LinkedIn engagement |
