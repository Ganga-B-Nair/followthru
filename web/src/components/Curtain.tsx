"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";

// A stage curtain that lives in the root shell, so it stays on screen while the page underneath changes.
// Pages drive it with curtain("closed", label) and curtain("open").

type State = "open" | "closed";
type Detail = { state: State; label?: string; sub?: string };
const EVENT = "followthru:curtain";
const MOVE_MS = 1300;

export function curtain(state: State, label?: string, sub?: string): Promise<void> {
  window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { state, label, sub } }));
  return new Promise((r) => setTimeout(r, MOVE_MS + 100));
}

const half = "absolute inset-y-0 w-1/2 transition-transform ease-[cubic-bezier(0.77,0,0.18,1)]";
// Velvet pleats in the palette's forest greens.
const fabric = {
  backgroundColor: "#2b4236",
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0) 26px, rgba(163,177,138,0.10) 44px, rgba(0,0,0,0) 62px, rgba(0,0,0,0.28) 88px), linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0) 30%, rgba(0,0,0,0.35))",
};

export default function Curtain() {
  const [d, setD] = useState<Detail>({ state: "open" });

  useEffect(() => {
    const on = (e: Event) => setD((e as CustomEvent<Detail>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  const closed = d.state === "closed";
  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden ${closed ? "" : "pointer-events-none"}`} aria-hidden={!closed}>
      <div className={`${half} left-0 shadow-[30px_0_60px_rgba(0,0,0,0.6)]`} style={{ ...fabric, transitionDuration: `${MOVE_MS}ms`, transform: closed ? "translateX(0)" : "translateX(-101%)" }} />
      <div className={`${half} right-0 shadow-[-30px_0_60px_rgba(0,0,0,0.6)]`} style={{ ...fabric, transitionDuration: `${MOVE_MS}ms`, transform: closed ? "translateX(0)" : "translateX(101%)" }} />
      <div className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${closed && d.label ? "opacity-100 delay-700" : "opacity-0"}`}>
        <div className="text-center">
          <div className="mx-auto mb-5 w-fit"><Logo size={72} /></div>
          <div className="font-display text-[56px] font-semibold tracking-tight text-[#f1efe7]">{d.label}</div>
          {d.sub && <div className="mt-2 text-xl text-[#a3b18a]">{d.sub}</div>}
        </div>
      </div>
    </div>
  );
}
