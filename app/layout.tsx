import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clocked Return Lab | Customer Return Review",
  description: "Review customer return requests with evidence from the original message. Built with Clocked Protect, Guard, Extract and Decide. No refunds are issued.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Force request-time rendering so Next.js can attach the CSP nonce to its
  // internal scripts. A statically cached shell would reuse the wrong nonce.
  await headers();
  return <html lang="en"><body>{children}</body></html>;
}
