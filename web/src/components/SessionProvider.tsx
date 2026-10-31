"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type User = { id: string; name: string; email: string; role: "lead" | "member"; title: string; person: string; color: string };
export type Perms = Record<string, boolean>;
type Ctx = { user: User | null; perms: Perms; ai: { provider: string; model: string } | null; loading: boolean; refresh: () => void };

const SessionCtx = createContext<Ctx>({ user: null, perms: {}, ai: null, loading: true, refresh: () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<Ctx, "refresh">>({ user: null, perms: {}, ai: null, loading: true });
  const refresh = useCallback(() => {
    fetch("/api/auth").then((r) => r.json()).then((d) => setState({ user: d.user, perms: d.perms ?? {}, ai: d.ai, loading: false })).catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <SessionCtx.Provider value={{ ...state, refresh }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);

export function Avatar({ user, size = 36 }: { user: Pick<User, "name" | "color">; size?: number }) {
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${user.color}, ${user.color}99)` }}>
      {initials}
    </span>
  );
}
