import type { Metadata } from "next";
import { headers } from "next/headers";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import "./site.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const title = "Clocked Return Lab | Return review with evidence";
const description = "Clocked Return Lab reads a customer return request, tests it against an example return window and safety rules, and recommends Approve, Human Review, or Decline with the exact words behind each result. No refund is issued.";

const siteBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
  : "https://clocked-return-lab.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteBase),
  title,
  description,
  applicationName: "Clocked Return Lab",
  keywords: ["customer returns", "return request review", "Clocked", "decision support", "human review"],
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    siteName: "Clocked Return Lab",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Force request-time rendering so Next.js can attach the CSP nonce to its
  // internal scripts. A statically cached shell would reuse the wrong nonce.
  await headers();
  return (
    <html lang="en" className={display.variable + " " + sans.variable}>
      <body>{children}</body>
    </html>
  );
}
