const DEFAULT_SITE_URL = "https://www.blkrose.online";

/**
 * Resolve the canonical public origin safely across local dev, Vercel preview,
 * Vercel production (*.vercel.app), and custom domains.
 * Never throws even if an env var is empty or omits the https:// scheme.
 */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    DEFAULT_SITE_URL,
  ];

  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const parsed = new URL(withScheme);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      /* try next candidate */
    }
  }

  return DEFAULT_SITE_URL;
}
