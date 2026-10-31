import { all, nowIso, run } from "./db";

// Connection catalog. In this prototype "connect" runs a simulated OAuth consent and stores the
// connection; Gmail and Calendar still open real pre-filled pages, Notion/GitHub use real tokens.

export type IntegrationDef = {
  id: string; name: string; category: "Meetings" | "Calendar & email" | "Docs & tasks" | "Team chat";
  blurb: string; does: string[]; scopes: string[]; color: string; letter: string; primary?: boolean; soon?: boolean;
};

export const CATALOG: IntegrationDef[] = [
  {
    id: "zoom", name: "Zoom", category: "Meetings", color: "#2D8CFF", letter: "Z", primary: true,
    blurb: "AI notetaker joins your Zoom calls. Transcripts with speaker names flow in the moment a meeting ends.",
    does: ["Notetaker auto-joins meetings on your calendar", "Imports cloud-recording transcripts with speakers", "Starts follow-ups when the meeting ends"],
    scopes: ["meeting:read", "recording:read (transcripts)", "user:read"],
  },
  {
    id: "google_calendar", name: "Google Calendar", category: "Calendar & email", color: "#4285F4", letter: "C",
    blurb: "Sees upcoming meetings so the notetaker knows where to be, and books the follow-up meetings it drafts.",
    does: ["Finds Zoom links on your events", "Creates follow-up invites you approve", "Blocks time for deadlines"],
    scopes: ["calendar.events"],
  },
  {
    id: "gmail", name: "Gmail", category: "Calendar & email", color: "#EA4335", letter: "M",
    blurb: "Follow-up emails open as ready-to-send drafts in your own Gmail.",
    does: ["Opens drafted follow-ups in Gmail", "Sends weekly digests"], scopes: ["gmail.compose"],
  },
  {
    id: "notion", name: "Notion", category: "Docs & tasks", color: "#E6E6E6", letter: "N",
    blurb: "Plans, minutes and briefs become Notion pages; tasks land in your workspace.",
    does: ["Creates docs from meetings", "Writes tasks with owners and dates"], scopes: ["Insert content", "Read pages you share"],
  },
  {
    id: "slack", name: "Slack", category: "Team chat", color: "#4A154B", letter: "S",
    blurb: "Announcements go to the right channel; owners get a nudge before deadlines.",
    does: ["Posts approved announcements", "DMs reminders and digests"], scopes: ["chat:write", "channels:read"],
  },
  {
    id: "jira", name: "Jira", category: "Docs & tasks", color: "#2684FF", letter: "J",
    blurb: "Action items become Jira issues with owner, due date and meeting context.",
    does: ["Creates issues from action items", "Syncs status back"], scopes: ["write:jira-work", "read:jira-work"],
  },
  {
    id: "github", name: "GitHub", category: "Docs & tasks", color: "#8B949E", letter: "G",
    blurb: "Engineering tasks become GitHub issues.", does: ["Creates issues from action items"], scopes: ["issues:write"],
  },
  {
    id: "google_meet", name: "Google Meet", category: "Meetings", color: "#00897B", letter: "G", soon: true,
    blurb: "The same notetaker for Google Meet calls.", does: ["Coming soon"], scopes: [],
  },
  {
    id: "teams", name: "Microsoft Teams", category: "Meetings", color: "#6264A7", letter: "T", soon: true,
    blurb: "The same notetaker for Teams calls.", does: ["Coming soon"], scopes: [],
  },
];

export type IntegrationState = { id: string; status: "connected" | "disconnected"; account: string | null; connected_at: string | null; options_json: string | null };

export async function integrationStates(): Promise<Record<string, IntegrationState>> {
  const rows = await all<IntegrationState>("SELECT * FROM integrations");
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

export async function setIntegration(id: string, connected: boolean, account: string | null): Promise<void> {
  await run(
    `INSERT INTO integrations (id, status, account, connected_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status, account = excluded.account, connected_at = excluded.connected_at`,
    [id, connected ? "connected" : "disconnected", connected ? account : null, connected ? nowIso() : null],
  );
}
