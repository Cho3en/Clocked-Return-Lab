import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clocked Return Lab | Returns & Refund Autopilot",
  description: "Evidence-led returns triage using Clocked Protect, Extract, Decide and policy checks. Recommendations only; no real refunds issued.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
