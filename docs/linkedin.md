# LinkedIn: 3-step series

> Draft. Earlier you said you'd explain the "3 steps" format later. If the hackathon defines the 3 posts differently, dictate the format and I'll rework these.
> Fill in every `[[…]]` before posting. Replace `#HACKATHON_TAG` with the official hashtag, and tag the organisers and **@Wispr Flow**.

**Plan:** Post 1 (the hook, today, early) → Post 2 (building by voice, mid-day) → Post 3 (the launch and demo, before 23:59).
**Engagement levers:** a one-line hook, short lines, a native video or image (no external link in the post body; put links in the first comment), and a question at the end that people can actually answer.

---

## Post 1: The problem (the hook)

**When:** now, before building is finished. **Visual:** a photo of a messy whiteboard or notebook, or a screenshot of a messy dictation.

```
Every meeting ends the same way.

"Great, so Priya sends the pricing, Ravi writes the plan, let's sync Thursday."

Then nothing happens.

The email doesn't get written. The invite doesn't get sent.
And three weeks later someone says "wait, didn't we decide the opposite?"

AI note-takers didn't fix this. They just made a longer to-do list.

Today I'm building something different for #HACKATHON_TAG:
an agent that doesn't make to-dos. It does them.

And I'm building it entirely by voice with @Wispr Flow.
No typing. Every prompt dictated.

Quick question: what's the one follow-up you ALWAYS forget after a meeting? 👇
```

---

## Post 2: Building by voice (the process)

**When:** mid-day. **Visual:** a 3-image carousel: (1) the Wispr Flow prompt log in `docs/prompts.md`, (2) the "what you said → what you meant" screen, (3) the agent timeline.

```
I haven't typed a single prompt today.

I'm building a full AI agent for #HACKATHON_TAG between exam prep sessions, by talking to it through @Wispr Flow.

Here's the twist: the product runs on voice too.

You walk out of a meeting, hold one key, and ramble for 30 seconds:

"umm so we're launching Friday, no wait, Thursday… Ravi will email Acme, actually no, Priya will…"

The agent has to figure out what you MEANT.
Friday → Thursday. Ravi → Priya. The coffee machine rant → ignored.

Then it shows you exactly what it changed (screenshot 2), so you can trust it.

Things I learned building by voice:
→ You explain intent better out loud than when you type
→ Rambling is fine, as long as the agent resolves self-corrections
→ My prompt log is now a diary of the build ([[N]] prompts, every one dictated)

Post 3 tonight: the demo.

Would you trust an agent to draft your follow-up emails? Yes / no / "only with approval"? 👇
```

---

## Post 3: The launch (the demo)

**When:** right after you submit. **Visual:** a 45–60 second screen recording, uploaded natively, with captions on. Hook in the first 3 seconds: the timer, then you speaking.

```
Talk for 30 seconds. The follow-ups are done.

Meet FollowThru, my #HACKATHON_TAG build, made 100% by voice with @Wispr Flow. 🎙️

Other meeting tools turn meetings into to-dos.
FollowThru turns them into done:

✉️ Writes the follow-up email (opens in Gmail, ready to send)
📅 Builds the calendar invite, with "next Tuesday at 3" resolved
📄 Drafts the plan doc in Notion
⚠️ Remembers every past decision and warns you:
   "Today you said launch Thursday, but on 23 Oct launch was blocked until QA sign-off"
✅ Nothing goes out until you approve it, and you can approve by voice too

And it isn't just for work.
A call with your landlord → a "confirming our conversation" email, so you have proof in writing.
A lecture → exam dates in your calendar and a study plan.
A doctor's visit → medicine reminders and a list of questions for next time.

Built with Claude (multi-step agent + memory), Next.js, and a lot of talking to my laptop.

🎥 Demo above · code and full prompt log in the first comment

What kind of meeting should it handle next? 👇

#AI #Agents #BuildInPublic #VoiceAI #HACKATHON_TAG
```

**First comment (post it yourself right away):**
```
GitHub: [[repo link]]
Every prompt I dictated while building: [[repo link]]/blob/main/docs/prompts.md
```

---

## Demo video script (about 2 minutes)

**Setup:** run `npm run demo` (production server, much faster than `npm run dev`). Browser full-screen at 1440×900 or larger, signed out, demo reset (Meetings → Reset demo). Use a screen recorder with system audio off and a voice-over on.

| Time | On screen | Voice-over |
|---|---|---|
| 0:00–0:08 | Login page | "Meetings end. Follow-ups don't happen. This is FollowThru, an AI notetaker for Zoom that doesn't make to-dos. It does them." |
| 0:08–0:15 | Click **Priya Nair · Team lead** → dashboard | "It works alongside Zoom. Here's my day: a call is live right now." |
| 0:15–0:40 | **Open live notes** → set 4× → transcript streams, AI notes appear | "The notetaker is in the call. Watch: decisions and action items are captured live, and when Meera corrects herself from thirty users to twenty, it keeps the final answer." |
| 0:40–0:50 | **End meeting** → agent timeline runs | "The meeting ends, and the agent goes to work." |
| 0:50–1:10 | Meeting page: AI notes → transcript diff → **conflict card** | "AI notes. A transcript showing exactly what it corrected. And this: it remembers that on 21 October we called dark-mode export our top priority, and flags today's decision as a contradiction." |
| 1:10–1:30 | Approval queue: email, docs, invite, announcement → approve by voice: *"ship everything except the announcement"* → Confirm → **Open in Gmail** | "Sixty-seven minutes of follow-up work, drafted. I approve it by voice, using Wispr Flow." |
| 1:30–1:40 | **Walk-out Recap** → 🏠 Landlord call sample → conflict: rent | "Not on Zoom? Talk for 30 seconds. It even catches my landlord changing the rent he promised." |
| 1:40–1:52 | **Team & roles** → dictate *"let members see all meeting notes but not each other's tasks"* → Confirm | "Team leads decide what members see, by voice." |
| 1:52–2:00 | **Connections** page | "Zoom, Calendar, Gmail, Notion, Slack. Built entirely by voice with Wispr Flow." |

**Tips:**
- Do one dry run first, then reset the demo before the real take.
- With the free `GEMINI_API_KEY`, the agent runs on real Gemini (about 7 s after **End meeting**). Results vary a little between takes. If the free quota runs out mid-take, the demo meetings fall back to the hand-checked results automatically.
- Space your takes a minute or two apart, because the free tier has a per-minute limit.

---

## Engagement checklist (counts for the bonus)

- [ ] Post at a time when your network is active, and reply to every comment in the first hour
- [ ] Tag @Wispr Flow and the organisers in every post; tag teammates or friends only if they're relevant
- [ ] Upload video natively and keep links in the first comment
- [ ] End each post with a question people can answer in a few words
- [ ] Re-share Post 1 from Post 3 ("Update: I built it")
- [ ] Screenshot the analytics for the submission, if the organisers ask for engagement proof
