import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY, title TEXT, meeting_type TEXT, held_at TEXT,
  raw_text TEXT, clean_text TEXT, corrections_json TEXT, attendees_json TEXT,
  summary TEXT, minutes_saved INTEGER DEFAULT 0, created_at TEXT,
  key_points_json TEXT, source TEXT DEFAULT 'recap'
);
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY, name TEXT UNIQUE COLLATE NOCASE, email TEXT
);
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY, meeting_id TEXT, text TEXT, topic_tags_json TEXT,
  speaker TEXT, status TEXT DEFAULT 'active', superseded_by TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS conflicts (
  id TEXT PRIMARY KEY, new_decision_id TEXT, old_decision_id TEXT, kind TEXT,
  explanation TEXT, resolution TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY, meeting_id TEXT, text TEXT, owner TEXT, owner_confidence TEXT,
  due_at TEXT, due_phrase TEXT, due_confidence TEXT, implicit INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', blocked_reason TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY, meeting_id TEXT, action_item_id TEXT, executor TEXT,
  why TEXT, payload_json TEXT, status TEXT DEFAULT 'pending', external_url TEXT,
  minutes_saved INTEGER DEFAULT 0, executed_at TEXT
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, title TEXT, person TEXT, color TEXT
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY, status TEXT DEFAULT 'disconnected', account TEXT, connected_at TEXT, options_json TEXT
);
CREATE TABLE IF NOT EXISTS zoom_meetings (
  id TEXT PRIMARY KEY, topic TEXT, start_at TEXT, duration INTEGER, host TEXT, participants_json TEXT,
  status TEXT DEFAULT 'scheduled', notetaker INTEGER DEFAULT 1, meeting_id TEXT, transcript_key TEXT
);
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY, person TEXT, raw_text TEXT, applied_ops_json TEXT, created_at TEXT
);
`;

let client: Client | null = null;
let ready: Promise<void> | null = null;

function getClient(): Client {
  if (!client) {
    // Vercel's file system is read-only except /tmp, so the demo database lives there when deployed.
    const url = process.env.DATABASE_URL || (process.env.VERCEL ? "file:/tmp/followthru.db" : "file:data/followthru.db");
    if (url.startsWith("file:")) {
      fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });
    }
    client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return client;
}

export async function db(): Promise<Client> {
  const c = getClient();
  if (!ready) ready = c.executeMultiple(SCHEMA).then(() => migrate(c));
  await ready;
  return c;
}

// Columns added after the first release; ignore "duplicate column" on databases that have them.
async function migrate(c: Client) {
  for (const sql of [
    "ALTER TABLE meetings ADD COLUMN key_points_json TEXT",
    "ALTER TABLE meetings ADD COLUMN source TEXT DEFAULT 'recap'",
  ]) {
    try { await c.execute(sql); } catch {}
  }
}

export async function all<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return r.rows.map((row) => ({ ...row }) as T);
}

export async function one<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T | null> {
  return (await all<T>(sql, args))[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []): Promise<void> {
  const c = await db();
  await c.execute({ sql, args });
}

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

export type MeetingRow = {
  id: string; title: string; meeting_type: string; held_at: string; raw_text: string;
  clean_text: string; corrections_json: string; attendees_json: string; summary: string;
  minutes_saved: number; created_at: string; key_points_json: string | null; source: string | null;
};
export type DecisionRow = {
  id: string; meeting_id: string; text: string; topic_tags_json: string; speaker: string | null;
  status: string; superseded_by: string | null; created_at: string;
};
export type ConflictRow = {
  id: string; new_decision_id: string; old_decision_id: string; kind: string;
  explanation: string; resolution: string | null; created_at: string;
};
export type ActionRow = {
  id: string; meeting_id: string; text: string; owner: string | null; owner_confidence: string;
  due_at: string | null; due_phrase: string | null; due_confidence: string; implicit: number;
  status: string; blocked_reason: string | null; created_at: string;
};
export type DraftRow = {
  id: string; meeting_id: string; action_item_id: string | null; executor: string; why: string;
  payload_json: string; status: string; external_url: string | null; minutes_saved: number;
  executed_at: string | null;
};
export type PersonRow = { id: string; name: string; email: string | null };

export async function upsertPerson(name: string, email?: string | null): Promise<void> {
  const clean = name.trim();
  if (!clean) return;
  const existing = await one<PersonRow>("SELECT * FROM people WHERE name = ?", [clean]);
  if (!existing) {
    await run("INSERT INTO people (id, name, email) VALUES (?, ?, ?)", [newId(), clean, email ?? null]);
  } else if (email && !existing.email) {
    await run("UPDATE people SET email = ? WHERE id = ?", [email, existing.id]);
  }
}

export type UserRow = { id: string; name: string; email: string; role: "lead" | "member"; title: string; person: string; color: string };
export type ZoomRow = {
  id: string; topic: string; start_at: string; duration: number; host: string; participants_json: string;
  status: "scheduled" | "live" | "ended" | "processed"; notetaker: number; meeting_id: string | null; transcript_key: string | null;
};
