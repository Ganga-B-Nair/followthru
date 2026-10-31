"use client";

import { useEffect, useState } from "react";
import { curtain } from "@/components/Curtain";
import Logo from "@/components/Logo";

// The closing of the demo video: why FollowThru matters, a conclusion, and the final curtain.

const POINTS = [
  { icon: "⚡", title: "It does the work, not the notes", body: "Emails, invites, docs and announcements are drafted before the call is over. About an hour of follow-up per meeting, ready in seconds." },
  { icon: "🧠", title: "It remembers what you decided", body: "The conflict guard catches today’s decision contradicting last week’s, before it costs you a launch, a client or your rent." },
  { icon: "🎙️", title: "It understands how people really talk", body: "Fillers, tangents, “Friday, no wait, Thursday”: resolved to what you meant. Built for Wispr Flow." },
  { icon: "✅", title: "Nothing ships without you", body: "Approve with a click, by voice, or just tell Closer. You stay in control of every word that leaves." },
  { icon: "📹", title: "It works where you already meet", body: "Alongside Zoom, and for every kind of meeting: client calls, classes, doctor visits, even your landlord." },
  { icon: "🛡️", title: "It respects your team", body: "Leads decide what members see. Everyone closes only their own loops." },
];
const STEP_MS = 1500;

export default function Outro() {
  const [shown, setShown] = useState(0);
  const [finale, setFinale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 1200));
      for (let i = 1; i <= POINTS.length && !cancelled; i++) {
        setShown(i);
        await new Promise((r) => setTimeout(r, STEP_MS));
      }
      if (cancelled) return;
      setFinale(true);
      await new Promise((r) => setTimeout(r, 7000));
      if (!cancelled) await curtain("closed", "FollowThru", "Talk. Walk out. It’s done.  ·  Built entirely by voice with Wispr Flow");
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg px-12 py-9">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-accent-2/25 blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-52 -left-20 h-[520px] w-[520px] rounded-full bg-accent/10 blur-[140px]" />

      <div className="relative mx-auto max-w-[1240px]">
        <div className="intro-line flex items-center gap-4">
          <Logo size={48} />
          <div>
            <div className="label">Why it matters</div>
            <h1 className="text-[44px] font-semibold leading-tight tracking-tight">Meetings don’t fail in the room. <span className="gradient-text">They fail after it.</span></h1>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {POINTS.map((p, i) => (
            <div key={p.title} className={`card p-6 transition-all duration-700 ${i < shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-2xl">{p.icon}</div>
              <div className="font-display text-[22px] font-semibold leading-snug">{p.title}</div>
              <p className="mt-2 text-[16px] leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>

        <div className={`mt-9 text-center transition-all duration-1000 ${finale ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
          <div className="font-display text-[34px] text-muted">Other tools turn meetings into to-dos.</div>
          <div className="gradient-text font-display text-[64px] font-semibold leading-tight tracking-tight">FollowThru turns them into done.</div>
        </div>
      </div>
    </div>
  );
}
