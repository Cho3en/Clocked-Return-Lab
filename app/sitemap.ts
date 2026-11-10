import type { MetadataRoute } from "next";

const siteBase = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
  : "https://clocked-return-lab.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteBase + "/", changeFrequency: "monthly", priority: 1 },
    { url: siteBase + "/tour", changeFrequency: "monthly", priority: 0.8 },
  ];
}
