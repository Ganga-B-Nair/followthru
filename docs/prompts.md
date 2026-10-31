# Prompt Log: Built by Voice with Wispr Flow

Every prompt used to build this project is recorded here in order. Each entry shows its **source**:

- 🎙️ **Wispr Flow**: dictated by voice through Wispr Flow (raw dictation kept as-is, including fillers and self-corrections)
- 📋 **Pasted**: copied from an external source, such as the official hackathon brief
- ⌨️ **Typed**: typed by hand (should be rare)
- 🖱️ **UI choice**: a button or option picked in Claude Code (no dictation)

Screenshots of each Wispr Flow session go in [`screenshots/`](screenshots/) and are linked under the matching prompt.

| # | Phase | Source | Tool | Summary |
|---|---|---|---|---|
| 01 | Ideation | 🎙️ Wispr Flow + 📋 Pasted | Claude Code | Pick the strongest problem statement and set up docs |
| 02 | USP + specs | 🎙️ Wispr Flow | Claude Code | Find a USP beyond common integrations, then write the PRD and TRD |
| 03 | USP tweak | 🖱️ UI choice | Claude Code | Sharpen Execution Drafts into the "Walk-out Recap" hero moment |
| 04 | Build | 🎙️ Wispr Flow | Claude Code | Pitch the USP, extend to every meeting type, define app shape and auth, build the prototype |
| 05 | Live test | 🖱️ UI choice | Claude Code | Test with the real API key; blocked by zero credit balance; added readable API errors |
| 06 | LinkedIn | 🖱️ UI choice | Claude Code | Draft the 3-post LinkedIn series, demo video script, engagement checklist ([linkedin.md](linkedin.md)) |
| 07 | v2 build | 🎙️ Wispr Flow | Claude Code | Free AI, bigger desktop UI, Zoom companion, live notetaker, connections, roles and demo auth |
| 08 | Recording prep | 🖱️ UI choice | Claude Code | Record in demo mode: reset the demo workspace so the live Zoom meeting is ready |
| 09 | Polish + speed | 🎙️ Wispr Flow + palette image | Claude Code | Earthy palette and a less corporate font, test the free Gemini key, fix demo latency |
| 10 | Demo run-through | 🎙️ Wispr Flow | Claude Code | "Run the demo": full click-through on live Gemini; fixed a quota-fallback edge case; reset for recording |
| 11 | Git repo + next features | 🎙️ Wispr Flow | Claude Code | Commit everything in small, secret-free commits with no AI trailers; then live camera call, tabbed meeting page, and a chatbot |

---

## Prompt 01: Choose the project and set up the docs

- **Phase:** Ideation / project selection
- **Source:** 🎙️ Wispr Flow (instruction) + 📋 Pasted (5 problem statements from the hackathon brief)
- **Sent to:** Claude Code
- **Outcome:** Selected **#3 Meeting-to-Execution Agent**, see [project-selection.md](project-selection.md). Created this docs folder, [problem-statements.md](problem-statements.md), and the README.
- **Screenshot:** `screenshots/01-wispr-project-selection.png` *(add)*

### 📋 Pasted: problem statements

The five problem statements were pasted verbatim from the hackathon brief. They are recorded in [problem-statements.md](problem-statements.md).

### 🎙️ Wispr Flow: dictated instruction

> These are the actual prompts for a hackathon that's happening. I have to submit it by around 11:59 today. I also have my exam going on, so I'll be mainly studying for that, just generating prompts and putting it in.
>
> I need to use Emergent as well, so I need a plan on how to incorporate Emergent as well as Wispr Flow. All my prompts are going to be through Wispr Flow, everything. I need you to prepare before I put it into my repo. I'll do a repo as well for the project. Before I put it into the repo, technically, I need to decide which project to do.
>
> These are all the problem statements I've put in:
>
> * Media content repurposing studio with brand memory
> * Adaptive exam prep tutor with a learner model
> * Meeting execution: meeting to execution agent
> * Personal finance coach with the living money model
> * Career pivot coach
>
> There are a lot of teams participating. I'll be a solo builder. What I need to do is build it by voice and also make it work with voice. Using Wispr Flow, I need to document the statements. I can build it in Lovable, code, reply, whatever.
>
> Carry out the emergent usage. I don't have to use emergent, so that's fine. I'll just build it on Claude Code itself. Make it work with voice. The main input to your product is natural speech captured through Wispr Flow, and real speech has filler words, digressions, and self-corrections. The agent has to turn it into clear, structured output.
>
> These are the actual instructions given to the hackathon. I need to submit this really quickly, and I'll also tell you how it is evaluated as well:
>
> * Wispr Flow usage: 20%
> * Prototype quality and UX: 20%
> * AI integration: 20%
> * Problem understanding: 15%
> * LinkedIn content and engagement: 15%
>
> I need a LinkedIn post in 3 steps. I'll tell you about that after this. Innovation and creativity: 10%, and I'll get bonus points for engagements on LinkedIn. Therefore, I need to do that side as well, but before that, let me just start by doing this.
>
> Your main instruction is: out of these 5 prompts that I've put in, it has information about what should actually be built. Go through them and figure out which one the least amount of people will build. That can be extended to something I've already worked with or something that's really good. The AI integration has a lot of marks, and so does the Wispr Flow usage.
>
> What I need you to do is:
>
> * Document every single prompt in a docs folder.
> * Inside that, do a prompts.md, a Markdown file that has all the prompts I put in.
> * In the prompt itself, I need it separated by Wispr Flow: this much, by this one, this much.
> * I'll attach screenshots to it, and/or that's all fine.
> * In my README as well, I need to mention that it's built using Wispr Flow.
>
> All of that has to be done. Pick one of these and tell me which could be my strongest project, and then I'll work on it, and then we'll create a PRD, TRD, and move on.
>
> This is what I want currently: all downloads to drive D. No downloads to any other drive. There's no space, so no downloads to anything else. Yes, give me this output right now.

---

## Prompt 02: Find a stronger USP, then write the PRD and TRD

- **Phase:** USP / product spec
- **Source:** 🎙️ Wispr Flow
- **Sent to:** Claude Code
- **Outcome:** Chose **Execution Drafts** as the USP: the agent does the follow-up work itself and does not just list it. It is backed by Speech-to-Intent, a conflict guard, voice approval, and the Open-Loop Brief. Wrote [PRD.md](PRD.md) and [TRD.md](TRD.md).
- **Screenshot:** `screenshots/02-wispr-usp-prd-trd.png` *(add)*

### 🎙️ Wispr Flow: dictated

> The meeting execution agent is my strongest, but I think a lot of people are going to pick that. Before that, I do think a lot of people are going to pick that because, obviously, this one is kind of common. Then again, I can do it in a solo day, but I need to make this look a bit more impressive.
>
> Go out of your way to figure out a few things that I can add, like meeting to execution, so a direct connection to Google Calendar and all of that. That is all very common, like a connection to Notion, a connection to Calendar, all of that should be there. Then again, that is kind of common.
>
> I need something that does more than that. I need something that turns it into actionable items or something of the sort that makes it quite different, because I need my USP. My USP has to be something stronger than all the other people's. The USP you have over here should be utility-based, to say the least. It has to be an agent, but it has to do it so seamlessly that you would not go back to not using the agent. It has to be something of that sort, if you know what I mean.
>
> Figure that out, then write the PRD and DRD.

> *Note: "DRD" in the dictation means the TRD (technical requirements document). It is kept as dictated to show the raw Wispr Flow output.*

---

## Prompt 03: Sharpen the USP

- **Phase:** USP refinement
- **Source:** 🖱️ UI choice. The user clicked "Tweak the USP first" and then picked an option. This step was not dictated.
- **Sent to:** Claude Code
- **Outcome:** Chose "Sharpen Execution Drafts" from four options (Sharpen Execution Drafts, Chaser agent, Decision ledger, "Could've been an email"). The USP is now framed as the **Walk-out Recap**: 30 seconds of voice on the way out, follow-ups done before you reach your desk. Updated the PRD (new section 3.0, F0, metrics, and demo) and the README.

---

## Prompt 04: Pitch the USP, cover every meeting type, and build it

- **Phase:** Build
- **Source:** 🎙️ Wispr Flow
- **Sent to:** Claude Code
- **Outcome:**
  - Added a 3-line pitch.
  - Extended the PRD to 9 meeting types (section 2.6) and defined the product shape (section 2.5).
  - Rewrote the TRD with the authentication and connections design.
  - Merged the selection reasoning and problem statements into the PRD appendices.
  - Built the full prototype in `web/`: agent pipeline, conflict guard, execution drafts, approval queue, voice approval and check-ins, digest, brief, reminders, and the Ask agent.
  - Checked that the production build passes and tested the flow in demo mode.
- **Screenshot:** `screenshots/04-wispr-build.png` *(add)*

### 🎙️ Wispr Flow: dictated

> We start building. Pitch this to me: pitch what the USP is to me in under three lines. What is it that makes this agent so different?
>
> Also make sure that there is proper AI integration. All the metrics I told you, make sure that it follows all of them. I will go in for like 10 minutes and then only come back after 4 hours. I'll approve everything else on the way, but mainly I'll only be back after.
>
> No downloads to any other drive. Remember that. Document everything. What is it that makes this so good, and how can this be applied to not just work meetings? Consider this for every single kind of meeting. Tweak it in that manner.
>
> What exactly is this? Is this an app, or what is it, and how does it connect to everything? How is the authentication? All of this, all of these things I said after, just figure that out. I don't need these many docs. The D drive only: .empty. I don't know what it does, just explain to me that in one line. Other than that, every single prompt has to be in Wispr Flow. You got that, right?
>
> Memory is there, trdprd, all good. Edit the trdprd as required. Just pitch it to me in three lines, and then we'll figure out where to go from there.

---

## Prompt 05: Test with the real API key

- **Phase:** Live test
- **Source:** 🖱️ UI choice: the user clicked "Key added, test it". This turn was not dictated.
- **Sent to:** Claude Code
- **Outcome:** The key authenticated, but every Claude call returned "credit balance is too low", so the live test is blocked until credits are added. Added readable error messages to every AI route, made empty settings values fall back to the defaults, and wrote an end-to-end test script that runs the four sample recaps.

---

## Prompt 07: Free AI, a better UI, Zoom, roles and connections

- **Phase:** v2 build
- **Source:** 🎙️ Wispr Flow
- **Sent to:** Claude Code
- **Outcome:**
  - **Free AI:** added Google Gemini's free tier (and any OpenAI-compatible provider) alongside Claude, plus a demo mode with hand-checked results.
  - **Redesign:** a dark, wide desktop app with a sidebar.
  - **Zoom:** the product is now an AI notetaker that works alongside Zoom, with a signature-verified webhook, transcript import with speaker names, and a live notes screen.
  - **New pages:** Connections (simulated OAuth consent) and Team & roles (permission matrix and dictated permission changes).
  - **Sign-in:** demo sign-in for team lead and team member accounts, with permissions enforced on the server.
  - **Dashboard:** a role-aware dashboard.
- **Screenshot:** `screenshots/07-wispr-v2.png` *(add)*

### 🎙️ Wispr Flow: dictated

> This is done. The LinkedIn post is done, but there is a small issue:
> - I don't have an Anthropic or OpenAI key. I need a free version. I don't have money to add it, and I don't plan to add it using money, so I just need the other one.
> - Right now, the formatting is really bad. On the UX side, everything needs to be bigger. It needs to fit a desktop page properly. Look into that and fit it properly.
> - I need to add quite a few more features. Where is the connection to connect to a calendar, connect to this one? Add the user roles, add demo authentication, and add all those pages as well. Let one be a team leader and let one be a team member. I need to be able to dictate what the team leader can see and what the team member can see. All of that.
> - Where is this implemented technically? Is this a new meeting platform in itself? I don't want it to be a new meeting platform. To be honest, I just need it to work alongside Zoom or something. Alongside Zoom would be best, so let's do it alongside Zoom for now. You connect this to Zoom, and after that, there are proper ones.
> - I need to have the AI note-taking thing generally and then have all this. The thing about this is that even if I cannot put out something proper like this one, I just need to show a prototype. It's just a video link that I'm sending. I don't have to have a pricing plan and all of that. Using the video link, it has to look really, really good. They're just going to view a video, so it has to look excellent. This app has to be the future kind of manner.
> - An API call has to be there, obviously. All of the backend has to be there, but it need not be extensive. It can be populated by demo data.

---

## Prompt 09: Earthy redesign, the Gemini key, and speed

- **Phase:** UI polish / live AI / performance
- **Source:** 🎙️ Wispr Flow (dictation) + a colour-palette image (`#DAD7CD #A3B18A #588157 #3A5A40 #344E41`)
- **Sent to:** Claude Code
- **Outcome:**
  - **Theme:** a new earthy forest theme built from the palette. Headings are in Fraunces, a soft serif, and body text in DM Sans; Geist is gone.
  - **Gemini:** the key works, but `gemini-2.5-flash` is retired for new keys. The default is now `gemini-3.5-flash`, with `gemini-3.5-flash-lite` as a fallback.
  - **Pipeline speed:** the Zoom pipeline on real AI went from 55 s to about 7 s. Steps run in parallel and reasoning is turned down.
  - **Fallback:** a demo meeting falls back to the curated results if the free quota runs out.
  - **Demo mode and replay:** demo mode is faster, and the live replay now defaults to 4×, with 8× available.
  - **Recording server:** added `npm run demo`, a production server whose pages load in about 30 ms.
- **Screenshot:** `screenshots/09-wispr-earthy-speed.png` *(add)*

### 🎙️ Wispr Flow: dictated

> There are quite a few changes, to be frank. The main changes within the UI: I will upload a UI palette, so use that and use a better font. Don't use this font. It feels too corporate. I want my UI to look really good as well, and I'm going with an earthy tone for the UI.
>
> I've added the free Gemini API key as well, so look at that and then run it again. If there's any issue, let me know.
>
> I did check out the demo. It's really, really slow. The full-screen one is 1440 pixels. The outlay is fine now, but the whole thing is really, really slow. I need the demo to be a bit faster, so look at the latency. Look into that as well.
>
> If there's anything more, I'll let you know.

---

## Prompt 11: Commit to Git, then three demo features

- **Phase:** Repository / next features
- **Source:** 🎙️ Wispr Flow
- **Sent to:** Claude Code
- **Outcome:**
  - **Git:** created one root repository and pushed 26 small commits to [GitHub](https://github.com/Ganga-B-Nair/followthru).
    - Env files, the local database and local tool settings are git-ignored.
    - Every commit and the full history were scanned for keys.
    - No AI attribution trailers were added.
  - **Live call:** a lobby, then a speaker view with your real camera and microphone. Your speech is transcribed in the browser and turned into AI notes live. Placeholder participants light up and speak. When the call ends, the agent runs on what was actually said.
  - **Meeting page:** a vertical step rail (AI notes, transcript, conflict guard, approve & ship, next meeting) with counts, so approvals are one click away.
  - **FollowThru Copilot:** a chat agent with 11 tools that rewrites drafts, moves invites, approves, ships, closes tasks and resolves conflicts, and shows each step it took.

### 🎙️ Wispr Flow: dictated

> whatever has been done so far, I want to commit it to a Git repo so I can give that Git repo as an extra. Whatever has been done so far is what will be properly there. I want that to be there, that much to be properly there.
> - Make sure you don't upload any API key or any secrets to the Git repo.
> - Make sure the Gitignore works and the .env local stays local.
> - Recheck that multiple times while you upload it.
> - I don't want all the files to commit at once. Each commit should only have a few files, so the review process becomes really easy.
> - Don't attach any "Made with Claude" or any of that. Don't attach any trailers of that sort.
>
> I will send you the Git repo link. Look into that and then tell me what you want to do next.
>
> I think this is good, but to make the actual things stand out a bit better, I have a few ideas. After you comment this much, the next task is doing these things:
> 1. For the meeting screen, instead of just a plain screen, open the camera at that point. I'll sit here and say something, and then have the AI take note of that as well, like show a live transcript of that. It should actually work: the actual call should go on over there. My screen, my camera can actually work, but the rest of it, the rest of the screens, would just keep a few placeholders and then light up one of the placeholders as if the other person is saying something. It's like a proper actual demo.
> 2. The automation is good, but the queue is so far away, and there is so much crowding. On the page after the meeting, the approval is only at the end. Either segment that differently, like have two more things before that as vertical tabs or something, because it gets really, really boring. I don't know why. It just looks a bit normal, boring.
> 3. I want the demo to be really, really good. AI integration: okay, there is AI, but maybe let's add a chatbot to this. Define a new purpose for a new chatbot addition to this, so that for the AI integration, I'll get full marks. Add a chatbot so that I can show its functionality as well. I don't need a demo script right now for the demo video. Again, I'll record the demo video after all these changes have been made, and I need to finish by 9, so I need these changes done really quickly.

---

<!-- TEMPLATE for the next prompt: copy this block, increment the number, add a row to the table above.

## Prompt NN: <short title>

- **Phase:** <PRD / TRD / build / UI / test / LinkedIn>
- **Source:** 🎙️ Wispr Flow
- **Sent to:** Claude Code
- **Outcome:** <what it produced>
- **Screenshot:** `screenshots/NN-<slug>.png`

### 🎙️ Wispr Flow: dictated

> <raw dictation>

-->
