# TRD: FollowThru

Technical design for the [PRD](PRD.md), updated to match the build in [`web/`](../web).

---

## 1. What it is, in one paragraph

FollowThru is a **web app that works alongside Zoom; it is not a new meeting platform.** An AI notetaker joins your Zoom calls and takes notes. When the call ends, Zoom sends the transcript with speaker names, and FollowThru's agent turns it into decisions, owners, deadlines, conflict warnings and ready-to-send follow-ups. For anything Zoom doesn't capture (in-person meetings, phone calls, classes), you dictate a 30-second **Walk-out Recap** through **Wispr Flow**. The app is built with Next.js and SQLite, and the AI provider is configurable: Claude, Google Gemini's free tier, or any OpenAI-compatible endpoint. A demo mode works with no key at all.

## 1.1 How it fits with Zoom

```
Google Calendar ──(events with Zoom links)──► FollowThru knows which meetings to join
Zoom meeting ──► notetaker in the call ──► live transcript + live AI notes (/live/:id)
Zoom webhook: recording.transcript_completed ──► POST /api/zoom/webhook
      ├─ verify x-zm-signature (HMAC-SHA256, ZOOM_WEBHOOK_SECRET_TOKEN)
      ├─ download the WebVTT transcript (download_token) → "Speaker: text" lines
      └─ run the agent pipeline (source = "zoom") → notes, conflicts, drafts, approval queue
```

`endpoint.url_validation` is answered with Zoom's plainToken/encryptedToken handshake. `meeting.started` and `meeting.ended` update the meeting's live status. In the prototype, the **Sprint 14 planning** meeting replays a recorded transcript on the live screen, so the full flow can be recorded without a real Zoom account.

## 1.2 AI providers (free option)

| Provider | Configured by | Cost | Notes |
|---|---|---|---|
| **Google Gemini (default free option)** | `GEMINI_API_KEY` from aistudio.google.com | Free tier, no card needed | Uses Gemini's OpenAI-compatible endpoint, default model `gemini-3.5-flash` (`LLM_MODEL` overrides), falling back to `gemini-3.5-flash-lite` when busy |
| Any OpenAI-compatible model (Groq, OpenRouter…) | `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL` | Many have free tiers | The same code path as Gemini |
| Claude | `ANTHROPIC_API_KEY` | Paid | Structured outputs plus server-side refusal fallback |
| Demo | no key | Free | Hand-checked results for the demo meetings; rule-based for any other input |

For the OpenAI-compatible providers, every agent step uses JSON mode with the zod schema sent in the prompt. The response is validated with zod, and one automatic retry sends back any validation errors. The Ask agent uses standard function calling, with the same four memory tools as the Claude version.

**Latency.** Free Gemini spent most of its time reasoning: the Zoom pipeline first took 55 s. It now takes about 6–8 s, because of these changes:
- Clean-up and extraction run in parallel. Extraction reads the raw text and resolves self-corrections itself.
- Those two mechanical steps run with `reasoning_effort: "none"`; conflict judging and drafting use `"low"`.
- Conflict judging and drafting run in parallel.
- Every call has a 30 s timeout. A 404, 429, 5xx or timeout retries once on the lite model.
- If the free tier is still unavailable (for example, the per-minute quota is used up) and the input is one of the demo meetings, the pipeline discards the partial run and finishes with the hand-checked results, so a recording never breaks.

## 1.3 Authentication and roles

- **Demo sign-in.** `/login` lists four demo accounts: one team lead and three members. A sign-in sets an httpOnly cookie, and `middleware.ts` redirects to `/login` when there is no session. The Zoom webhook stays public, because Zoom has to be able to reach it.
- **Production path:** "Sign in with Zoom" (OAuth), with the same session and role model.
- **Roles.** A **team lead** sees everything and controls what members can see on **Team & roles**, either with toggles or by dictating through Wispr Flow (*"let members see all meeting notes but not each other's tasks"*). The agent turns that into proposed toggle changes and asks for confirmation first.
- **Member permissions**, enforced on the server in every API route:

| Permission | Default for members | Effect when off |
|---|---|---|
| `view_all_meetings` | off | Members only see meetings they attended (decisions and approvals are filtered the same way) |
| `view_decisions` | on | Decision memory page hidden; API returns 403 |
| `view_conflicts` | off | Conflict cards are removed from responses |
| `view_team_tasks` | off | Members only see their own tasks |
| `approve_drafts` | on | Approval queue is read-only |
| `use_ask` | on | Ask AI is hidden; API returns 403 |
| `view_insights` | off | Team stats are hidden from the dashboard |
| `manage_integrations` | off | Members can't connect or disconnect tools |

## 1.4 Connections

The **Connections** page lists Zoom (the primary source), Google Calendar, Gmail, Notion, Slack, Jira and GitHub, plus Google Meet and Teams marked "coming soon". In the prototype, connecting runs a simulated OAuth consent screen and stores the connection. Gmail and Calendar actions still open real pre-filled pages. Notion and GitHub create real pages and issues when their tokens are set.

## 2. Authentication and connections

| Connection | How it connects | Auth | What FollowThru can see |
|---|---|---|---|
| Claude (Anthropic API) | Server-side SDK calls | `ANTHROPIC_API_KEY` in `.env.local`, never sent to the browser | Only the text you submit |
| Gmail | Opens `mail.google.com/mail/?view=cm&to=…&su=…&body=…` | **None.** It uses the Google session already signed in in your browser | Nothing. You press Send in Gmail yourself |
| Google Calendar | Opens `calendar.google.com/calendar/render?action=TEMPLATE…`, with an `.ics` download as a fallback | **None.** It uses your browser session | Nothing. You press Save in Calendar |
| Notion | `pages.create` under one page you share with the integration | Internal integration token + parent page ID | Only the one page you shared |
| GitHub Issues (optional) | `POST /repos/{owner}/{repo}/issues` | Fine-grained token with Issues: write on one repo | Only that repo's issues |
| Zoom | Webhook + transcript download (see section 1.1) | Zoom Marketplace app, `ZOOM_WEBHOOK_SECRET_TOKEN` | Meetings and transcripts of the connected account |
| App login | Demo accounts with an httpOnly session cookie (see section 1.3) | n/a | n/a |

**Why this design:** no OAuth means nothing to set up and no stored Google credentials, so it is the safest option and the fastest to demo. The confirmation step comes for free, because Gmail and Calendar still need your final click.

**Production path:** Google OAuth (`gmail.compose` and `calendar.events` scopes) for true one-tap sending, Notion public OAuth, NextAuth sign-in, and one Turso database per workspace.

## 3. Stack (as built)

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) + TypeScript + Tailwind 4 |
| LLM | `@anthropic-ai/sdk`. Model **`claude-opus-5-5`** (override with `FOLLOWTHRU_MODEL`). Effort is tuned per step: `low` for cleanup, voice commands and Ask, `medium` for extraction, the conflict judge and drafting |
| Output contracts | **Structured outputs** (`client.beta.messages.parse` + zod schemas, so every response is schema-validated). Opus 5.5 does not support forced tool choice, so the app does not use it |
| Safety net | Server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). If a classifier declines a request, it is re-run on Anthropic's recommended fallback model |
| Agent loop | The "Ask your meetings" agent is a manual tool-use loop with 4 strict tools over the memory database |
| DB | SQLite through `@libsql/client` (a local file; switch to Turso for a hosted deploy) |
| Integrations | Gmail and Calendar URLs, `.ics`, `@notionhq/client`, GitHub REST |
| Demo mode | With no API key, a rule-based stand-in runs, so the UI works offline. The header shows "Demo mode" |

## 4. The agent pipeline (`web/src/lib/pipeline.ts`)

```
Wispr Flow dictation ──► POST /api/meetings  (server-sent events stream progress to the UI)
  1. Speech-to-Intent   clean_speech  → clean text + [original → resolved, kind] list   (effort low)
  2. Extract            meeting type, title, summary, attendees, decisions(+topic tags),
                        action items (owner + confidence, ISO deadline + confidence, implicit flag)
  3. Recall             topic-tag + keyword overlap against active past decisions (top 15)
  4. Conflict judge  ┐  contradicts / refines + one-sentence explanation      (run in parallel)
  5. Plan + draft    ┘  per action: email | calendar | doc | announce | task, full draft,
                        plus up to 2 unassigned-but-obvious follow-ups
  → Approval queue (nothing ships until approved) → executors
```

Prompts live in `web/src/lib/prompts.ts`. Schemas live in `web/src/lib/schemas.ts`; every field is required, and "absent" is represented as `null`, so the schemas stay strict.

**Meeting types** (detected automatically): `work`, `client`, `class`, `doctor`, `household`, `committee`, `parent_teacher`, `interview`, `vendor`, `other`. The drafting prompt adapts to each type. For example, a vendor or landlord meeting produces a "confirming our conversation" email, and a doctor visit records only what the doctor said, with no medical advice.

**Guardrails in prompts:** never invent facts, so a missing value becomes a `[[TODO: …]]` placeholder that the UI highlights. Low-confidence owners and dates are shown with ❓.

## 5. Voice beyond the recap

| Feature | Route | Flow |
|---|---|---|
| Voice approval | `POST /api/voice-command` | Dictated command + queue → `{ops, confirm_text}` → user confirms → apply and ship |
| Voice check-in | `POST /api/checkins` | Dictated status update + the person's open items → updates + read-back → confirm → apply |
| Ask your meetings | `POST /api/ask` | Tool-use agent: `search_decisions`, `list_action_items`, `list_meetings`, `get_conflicts` |

## 6. Data model

`meetings`, `people`, `decisions` (status `active`, `superseded` or `flagged`), `conflicts` (kind + resolution), `action_items` (status `open`, `done` or `blocked`), `drafts` (status `pending`, `approved`, `rejected` or `executed`, with `minutes_saved`), and `checkins`. See `web/src/lib/db.ts`.

## 7. API routes

| Route | Purpose |
|---|---|
| `POST /api/meetings`, `GET /api/meetings` | Run the pipeline (server-sent events) / list meetings |
| `GET`/`DELETE /api/meetings/:id` | Full meeting bundle / delete with everything extracted from it |
| `PATCH /api/drafts/:id`, `POST /api/drafts/execute`, `GET /api/drafts/:id/ics` | Edit or approve a draft / ship approved drafts / download a calendar file |
| `POST /api/conflicts/:id` | Resolve a conflict as `supersede`, `keep_both`, or `flag` |
| `POST /api/voice-command`, `POST /api/checkins`, `POST /api/ask` | Voice control and memory agent |
| `GET /api/digest?person=`, `GET /api/brief?meetingId=`, `GET /api/reminders?now=` | Weekly digest, Open-Loop Brief, reminders (`now` can be overridden for demos) |
| `GET /api/decisions`, `GET /api/people`, `PATCH /api/actions/:id` | Memory views |
| `POST /api/seed` | Load the demo history (work, landlord, and class meetings) |

## 7.1 New in v2 (Zoom, roles, free AI)

| Route | Purpose |
|---|---|
| `GET/POST/DELETE /api/auth` | Current session / demo sign-in / sign-out |
| `GET/PUT /api/permissions`, `POST /api/permissions/voice` | Permission matrix and roles (lead only) / dictated permission change, which needs confirmation |
| `GET /api/integrations`, `POST /api/integrations/:id` | Connection catalog and state / connect or disconnect |
| `POST /api/zoom/webhook` | Zoom events (signature-verified) |
| `GET /api/zoom/meetings`, `GET/PATCH /api/zoom/meetings/:id`, `POST /api/zoom/meetings/:id/process` | Zoom calendar / transcript, notetaker on or off / run the agent when the meeting ends |
| `GET /api/dashboard` | Role-aware home: live meeting, stats, approvals, tasks, decisions |

## 7.2 New in v3 (live call, Closer)

| Route | Purpose |
|---|---|
| `POST /api/live/note` | One utterance from the live call in, one note out (`decision` / `action` / `correction` / `none`). Uses the no-reasoning fast path, so a note takes about 2–4 s |
| `POST /api/zoom/meetings/:id/process` with `{lines}` | Runs the agent on what was actually said in the call. If the free AI quota runs out, it falls back to the meeting's Zoom transcript |
| `POST /api/closer` | Closer chat (formerly Copilot). The read tools are the 4 memory tools plus `list_drafts` and `get_draft`. The write tools are `edit_draft`, `set_draft_status`, `ship_approved`, `update_action_item` and `resolve_conflict`, and they are only offered when the user has `approve_drafts`, except `update_action_item`, which everyone has for their own items |

**Live call (`/live/:id`):**
- **Media:** camera and microphone come from `getUserMedia`, with mute and video toggles.
- **The meeting:** the Zoom transcript drives the other participants, who can be voiced with `speechSynthesis`.
- **Your lines** are scripted for the demo. A voice meter on the microphone (Web Audio RMS against an adaptive noise floor) types your line out word by word while you talk. A pause commits it, and Space commits it straight away.
- **Live AI notes:** each committed line still goes to the live-note AI.
- **No microphone:** your lines play automatically.

**Ownership:** action items can only be updated by their owner, the lead included. `ownsItem()` is checked in `/api/actions/:id`, `/api/checkins` and Closer's `update_action_item`; "Me" items from Walk-out Recaps belong to the lead who recorded them.

## 8. Screens

- **Login:** demo accounts (team lead and members).
- **Dashboard:** live Zoom call card, team stats (lead only), approvals waiting, upcoming Zoom meetings with a notetaker toggle, your tasks, latest decisions.
- **Live notes (`/live/:id`):** participant tiles with the active speaker highlighted, a live transcript, and AI notes (decisions, action items, resolved self-corrections) appearing as they're said. When the meeting ends, the agent timeline runs and the app opens the meeting.
- **Connections:** Zoom hero card with the webhook URL and the integration grid with an OAuth consent screen.
- **Team & roles:** permission matrix, dictated permission changes, role assignment.

- **Recap (`/`):** a 30-second Walk-out Recap button, a box that waits for Wispr Flow dictation, and four messy sample dictations. A live agent timeline shows progress.
- **Meeting (`/meetings/:id`):** a minutes-saved counter, the speech-to-intent diff, conflict cards, decisions, a who-owes-what list, the approval queue with editable drafts, voice approval, a ship bar, and the Open-Loop Brief.
- **Decisions:** a timeline with superseded and flagged status and the conflicts attached to each decision.
- **People:** items per person, a voice check-in, and a weekly digest with an email link.
- **Ask:** questions to the memory agent, with the agent's tool calls shown.

## 9. Run it

```bash
cd D:\followthru\web
copy .env.example .env.local      # optional: GEMINI_API_KEY (free); without it, demo mode
npm install                       # .npmrc keeps the npm cache on D:
npm run dev                       # http://localhost:3000, then sign in as Priya (team lead)
npm run demo                      # production build and server: pages load in ~30 ms instead of compiling on first visit
```

## 10. Known limits

- Demo sign-in only. Zoom and Google OAuth are the production path, and connecting in the prototype is simulated.
- The live notetaker screen replays a recorded transcript. A real deployment receives transcripts through the Zoom webhook after each call.
- Reminders show in the app (bell icon) rather than as push notifications. A cron job and email digest are the next step.
- Gmail and Calendar need your final click by design. Fully automatic sending needs Google OAuth (production path).
- Speaker attribution in a single-voice recap depends on the speaker naming people ("Priya will…"). Pasted `Name: text` transcripts keep their labels.
