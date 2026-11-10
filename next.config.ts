import type { NextConfig } from "next";

// Nonce-backed CSP requires per-request dynamic rendering: do not enable
// cacheComponents/PPR for this small, sensitive advisory application.
const nextConfig: NextConfig = {
  async redirects() {
    // Short, memorable entry points for judges and demo links.
    return [
      { source: "/tour", destination: "/#judge-tour", permanent: false },
      { source: "/demo", destination: "/#judge-tour", permanent: false },
      { source: "/lab", destination: "/#case-workspace", permanent: false },
      { source: "/console", destination: "/#case-workspace", permanent: false },
    ];
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      ],
    }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};
export default nextConfig;
