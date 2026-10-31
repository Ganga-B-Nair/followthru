import { cookies } from "next/headers";
import { all, one, run, type UserRow } from "./db";

// Demo authentication: pick an account on /login, identity is a cookie.
// Production would swap this for Zoom or Google sign-in (OAuth) without touching the role checks.

export const SESSION_COOKIE = "ft_user";

export const DEMO_USERS: UserRow[] = [
  { id: "u-priya", name: "Priya Nair", email: "priya@example.com", role: "lead", title: "Product Lead", person: "Priya", color: "#a3b18a" },
  { id: "u-meera", name: "Meera Rao", email: "meera@example.com", role: "member", title: "QA Engineer", person: "Meera", color: "#7fa7a0" },
  { id: "u-ravi", name: "Ravi Kumar", email: "ravi@example.com", role: "member", title: "Engineer", person: "Ravi", color: "#d9b36c" },
  { id: "u-arjun", name: "Arjun Mehta", email: "arjun@example.com", role: "member", title: "Designer", person: "Arjun", color: "#c98a6b" },
];

export const PERMISSIONS = [
  { key: "view_all_meetings", label: "See every meeting's notes", hint: "Off: members only see meetings they attended" },
  { key: "view_decisions", label: "See the decision memory", hint: "The timeline of every decision and what replaced it" },
  { key: "view_conflicts", label: "See conflict warnings", hint: "When a new decision contradicts an earlier one" },
  { key: "view_team_tasks", label: "See teammates' tasks", hint: "Off: members only see their own action items" },
  { key: "approve_drafts", label: "Approve and ship follow-ups", hint: "Send drafted emails, invites and docs" },
  { key: "use_ask", label: "Ask the memory agent", hint: "Question every past meeting" },
  { key: "view_insights", label: "See team insights", hint: "Time saved, follow-through rate, open loops" },
  { key: "manage_integrations", label: "Manage connections", hint: "Connect or disconnect Zoom, Calendar, Notion…" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
export type PermissionMap = Record<Permission, boolean>;

export const DEFAULT_MEMBER_PERMISSIONS: PermissionMap = {
  view_all_meetings: false,
  view_decisions: true,
  view_conflicts: false,
  view_team_tasks: false,
  approve_drafts: true,
  use_ask: true,
  view_insights: false,
  manage_integrations: false,
};

const ALL_ON = Object.fromEntries(PERMISSIONS.map((p) => [p.key, true])) as PermissionMap;

export async function memberPermissions(): Promise<PermissionMap> {
  const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = 'member_permissions'");
  return { ...DEFAULT_MEMBER_PERMISSIONS, ...(row ? JSON.parse(row.value) : {}) };
}

export async function saveMemberPermissions(p: Partial<PermissionMap>): Promise<PermissionMap> {
  const next = { ...(await memberPermissions()), ...p };
  await run("INSERT INTO settings (key, value) VALUES ('member_permissions', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [JSON.stringify(next)]);
  return next;
}

export async function ensureUsers(): Promise<void> {
  for (const u of DEMO_USERS) {
    await run(
      "INSERT INTO users (id, name, email, role, title, person, color) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET color = excluded.color",
      [u.id, u.name, u.email, u.role, u.title, u.person, u.color],
    );
  }
}

export type Session = { user: UserRow; perms: PermissionMap };

export async function session(): Promise<Session | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  await ensureUsers();
  const user = await one<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  if (!user) return null;
  return { user, perms: user.role === "lead" ? ALL_ON : await memberPermissions() };
}

export const listUsers = () => all<UserRow>("SELECT * FROM users ORDER BY CASE role WHEN 'lead' THEN 0 ELSE 1 END, name");

/** Guard for API routes: returns the session, or a 401/403 response to send back. */
export async function requirePermission(perm?: Permission): Promise<Session | Response> {
  const s = await session();
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  if (perm && !s.perms[perm]) return Response.json({ error: "Your team lead hasn't given members access to this." }, { status: 403 });
  return s;
}

/**
 * Only the owner of an action item can check it off, lead included. Walk-out Recaps record the
 * speaker's own items as "Me"; in this workspace recaps are recorded by the team lead.
 */
export function ownsItem(s: Session, owner: string | null): boolean {
  const o = (owner ?? "").trim().toLowerCase();
  return o === s.user.person.toLowerCase() || o === s.user.name.toLowerCase() || (o === "me" && s.user.role === "lead");
}

/** Members without view_all_meetings only see meetings they were part of. */
export function canSeeMeeting(s: Session, attendeesJson: string | null): boolean {
  if (s.perms.view_all_meetings) return true;
  const names: { name: string }[] = JSON.parse(attendeesJson || "[]");
  return names.some((a) => a.name.toLowerCase() === s.user.person.toLowerCase());
}
