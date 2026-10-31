import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const body = DM_Sans({ variable: "--ff-body", subsets: ["latin"] });
const display = Fraunces({ variable: "--ff-display", subsets: ["latin"], axes: ["SOFT", "WONK", "opsz"] });
const code = JetBrains_Mono({ variable: "--ff-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FollowThru",
  description: "The AI notetaker for Zoom that doesn't make to-dos. It does them.",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#121a15" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} ${code.variable} antialiased min-h-screen`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
