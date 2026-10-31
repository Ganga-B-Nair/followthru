import { NextResponse, type NextRequest } from "next/server";

// Demo auth gate: every page needs a signed-in demo user. Zoom's webhook and the video intro/outro stay public.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = pathname.startsWith("/login") || pathname.startsWith("/intro") || pathname.startsWith("/outro") || pathname.startsWith("/api/auth") || pathname.startsWith("/api/zoom/webhook");
  if (open || req.cookies.get("ft_user")) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/|favicon.ico).*)"] };
