# FollowThru: the AI notetaker for Zoom that does the follow-ups

> 🎙️ **Built entirely by voice with [Wispr Flow](https://wisprflow.ai), and it runs on voice.**
> Every prompt used to build this project was dictated through Wispr Flow into Claude Code. The full, unedited prompt log is in [`docs/prompts.md`](docs/prompts.md).

**Other tools turn meetings into to-dos. FollowThru turns them into done.** FollowThru works alongside Zoom. Its AI notetaker joins your call and takes notes live. When the call ends, the follow-up emails, calendar invites, docs and tasks are already drafted, checked against everything your team decided before, and waiting for one approval. For meetings Zoom never sees (in person, a phone call, a lecture, a doctor's visit), hold your Wispr Flow key and talk for 30 seconds.

## Why it's different

| Most meeting tools | FollowThru |
|---|---|
| Summarize, then list action items | **Do the action items:** full email drafts, calendar invites with times worked out, first-draft docs |
| Only see what happened on the call | **Zoom notetaker, plus a 30-second voice recap** for everything off Zoom |
| Forget last week | **Decision memory and a conflict guard:** "today dark-mode export was dropped, but on 21 Oct it was the top priority" |
| Everyone sees everything | **Roles:** team leads decide what members can see, and can set it by voice |
| Built for work meetings only | **Any meeting:** work, client, class, doctor, family, society, parent–teacher, interview, landlord or vendor |
| Clean input only | **Messy speech in.** Self-corrections are resolved, and the speech diff shows exactly what changed |

## Features

- 📹 **Zoom notetaker:** live transcript with speaker names, plus AI notes (decisions, action items, resolved self-corrections) appearing as they're said
- 🔗 **Connections:** Zoom webhook (signature-verified, transcript import), Google Calendar, Gmail, Notion, Slack, Jira, GitHub
- 🛡️ **Team lead and member roles:** a permission matrix enforced on the server. Dictate *"let members see all meeting notes but not each other's tasks"*, then confirm
- 🎙️ **Walk-out Recap:** a 30-second timer, built for Wispr Flow
- 🧹 **Speech-to-Intent diff:** shows *what was said → what was meant*
- 🧠 **Extraction:** AI notes, decisions, owners, deadlines (relative dates resolved), soft commitments; low-confidence items flagged ❓
- ⚠️ **Conflict guard:** catches decisions that contradict earlier meetings
- ✉️📅📄 **Execution Drafts:** email (opens in Gmail), calendar invite (opens in Google Calendar or downloads an `.ics` file), doc (Notion), announcement, task
- ✅ **Approval queue:** nothing ships unapproved. Approve by voice too
- 🔁 **Open-Loop Brief**, 🔔 **reminders**, 📬 **weekly digest**, 🗣️ **voice check-ins**, 🔎 **Ask your meetings** (a tool-using memory agent)

## How Wispr Flow is used

1. **To build it:** every development prompt was dictated with Wispr Flow (see [`docs/prompts.md`](docs/prompts.md), with screenshots in `docs/screenshots/`).
2. **To use it:** Wispr Flow is the main way to talk to FollowThru. You use it for Walk-out Recaps, approval commands ("ship everything except the announcement"), permission changes, check-ins and questions. The agent is designed for real speech, with its fillers and self-corrections.

## AI integration

A multi-step agent with schema-validated outputs at every step:
speech-to-intent → extraction and AI notes → memory recall → conflict judge ∥ execution drafting → voice commands → a tool-using memory agent.
It runs on **Google Gemini's free tier**, any OpenAI-compatible model, or Claude. With no key, a demo mode uses hand-checked results. See [docs/TRD.md](docs/TRD.md).

## Run it

```bash
cd web
copy .env.example .env.local   # optional: add a free GEMINI_API_KEY (aistudio.google.com)
npm install
npm run dev                    # http://localhost:3000
npm run demo                   # production build: much faster, use this when recording
```

1. Sign in as **Priya Nair (Team lead)**.
2. On the dashboard, click **Open live notes** on the Sprint 14 Zoom call. The meeting plays out, ends, and the follow-ups are drafted.
3. Try **Walk-out Recap → 💼 Product sync** (it contradicts an earlier meeting on purpose).
4. Open **Team & roles** and dictate a permission change, then sign in as **Meera (member)** to see the difference.

To start fresh, use **Meetings → Reset demo** (team lead only).

## Docs

- [PRD](docs/PRD.md): problem, USP, Zoom companion shape, roles, every meeting type, demo script, and the problem statements in the appendix
- [TRD](docs/TRD.md): architecture, Zoom integration, AI providers, authentication and roles, API
- [Prompt log (Wispr Flow)](docs/prompts.md)
- [LinkedIn series and demo video script](docs/linkedin.md)

## Tooling

Wispr Flow (voice), Claude Code (AI coding agent), Gemini, OpenAI-compatible models or Claude (agent), Next.js, SQLite, Zoom webhooks, Notion API, GitHub API.
