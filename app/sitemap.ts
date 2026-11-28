import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const SITE = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/menu`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/week`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/gallery`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/visit`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
  ];
}
