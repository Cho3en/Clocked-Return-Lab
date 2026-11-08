import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clocked Return Lab | Returns & Refund Autopilot",
  description: "Evidence-led advisory refund triage using Clocked Protect, Guard, Extract, Decide and policy checks. No refunds executed.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Force request-time rendering so Next.js can attach the CSP nonce to its
  // internal scripts. A statically cached shell would reuse the wrong nonce.
  await headers();
  return <html lang="en"><body>{children}</body></html>;
}
