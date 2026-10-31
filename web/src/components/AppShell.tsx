"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Avatar, SessionProvider, useSession } from "./SessionProvider";

type NavItem = { href: string; label: string; icon: string; perm?: string; leadOnly?: boolean };

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: "home" },
      { href: "/meetings", label: "Meetings", icon: "video" },
      { href: "/recap", label: "Walk-out Recap", icon: "mic" },
    ],
  },
  {
    group: "Memory",
    items: [
      { href: "/decisions", label: "Decisions", icon: "diamond", perm: "view_decisions" },
      { href: "/people", label: "Tasks", icon: "check" },
      { href: "/ask", label: "Ask AI", icon: "sparkle", perm: "use_ask" },
    ],
  },
  {
    group: "Admin",
    items: [
      { href: "/connections", label: "Connections", icon: "plug" },
      { href: "/team", label: "Team & roles", icon: "shield", leadOnly: true },
    ],
  },
];

type Reminder = { id: string; text: string; owner: string | null; overdue: boolean; hours: number; meeting: string };

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, perms, ai } = useSession();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bell, setBell] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/reminders").then((r) => r.json()).then((d) => setReminders(d.reminders ?? [])).catch(() => {});
  }, [path, user]);

  if (path.startsWith("/login")) return <>{children}</>;

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  const allowed = (i: NavItem) => (i.leadOnly ? user?.role === "lead" : !i.perm || perms[i.perm]);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[272px] flex-col border-r border-line bg-bg-2/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3 px-6 pb-6 pt-7">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg font-bold text-accent-ink shadow-lg shadow-accent/30">↗</span>
          <div>
            <div className="text-[19px] font-semibold tracking-tight">FollowThru</div>
            <div className="text-xs text-muted">Meetings → done</div>
          </div>
        </Link>
        <nav className="scroll-thin flex-1 space-y-6 overflow-y-auto px-4">
          {NAV.map((g) => {
            const items = g.items.filter(allowed);
            if (!items.length) return null;
            return (
              <div key={g.group}>
                <div className="label mb-2 px-3">{g.group}</div>
                <div className="space-y-1">
                  {items.map((i) => {
                    const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
                    return (
                      <Link key={i.href} href={i.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15.5px] transition ${active ? "bg-accent-soft text-ink shadow-[inset_2px_0_0_var(--accent)]" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                        <Icon name={i.icon} className={active ? "text-accent" : ""} />
                        {i.label === "Tasks" && !perms.view_team_tasks ? "My tasks" : i.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="m-4 rounded-2xl border border-line bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${ai?.provider === "demo" ? "bg-warn" : "bg-good"}`} />
            {ai?.provider === "anthropic" ? `Claude · ${ai.model}` : ai?.provider === "openai" ? `AI · ${ai.model}` : "Demo AI (no key)"}
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <Avatar user={user} size={38} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.name}</div>
                <div className="truncate text-xs text-muted">{user.role === "lead" ? "Team lead" : "Team member"} · {user.title}</div>
              </div>
              <button onClick={signOut} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink" title="Switch account">
                <Icon name="logout" size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="ml-[272px] flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-line bg-bg/70 px-10 py-3.5 backdrop-blur-xl">
          {user && (
            <span className={`chip ${user.role === "lead" ? "!border-accent/40 !text-accent" : "!border-good/40 !text-good"}`}>
              <Icon name={user.role === "lead" ? "shield" : "check"} size={14} /> {user.role === "lead" ? "Team lead view" : "Team member view"}
            </span>
          )}
          <div className="relative">
            <button className="btn btn-sm !px-3" onClick={() => setBell(!bell)} aria-label="Reminders">
              <Icon name="bell" size={18} />
              {reminders.length > 0 && <span className="rounded-full bg-bad px-1.5 text-xs font-bold text-white">{reminders.length}</span>}
            </button>
            {bell && (
              <div className="card absolute right-0 mt-2 w-96 p-4">
                <div className="mb-2 font-semibold">Due in the next 48 hours</div>
                {reminders.length === 0 && <div className="text-sm text-muted">Nothing due. Nice.</div>}
                {reminders.map((r) => (
                  <div key={r.id} className="border-t border-line py-2.5 text-sm first:border-0">
                    <div>{r.text}</div>
                    <div className={`text-xs ${r.overdue ? "text-bad" : "text-muted"}`}>
                      {r.owner ?? "Unassigned"} · {r.overdue ? `overdue by ${-r.hours}h` : `due in ${r.hours}h`} · {r.meeting}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-10 pb-28 pt-8">{children}</main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
