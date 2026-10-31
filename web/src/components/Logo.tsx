"use client";

import { useEffect, useState } from "react";

/** The FollowThru mark: web/public/logo.png when present, otherwise the built-in glyph. */
export default function Logo({ size = 40 }: { size?: number }) {
  const [hasPng, setHasPng] = useState(false);

  // Probe the file after mount; a server-rendered <img> can fail before React attaches onError.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasPng(true);
    img.src = "/logo.png";
  }, []);

  if (hasPng) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logo.png" alt="FollowThru" width={size} height={size} className="shrink-0 rounded-xl object-contain" />;
  }
  return (
    <span style={{ width: size, height: size, fontSize: size * 0.45 }}
      className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 font-bold text-accent-ink shadow-lg shadow-accent/30">↗</span>
  );
}
