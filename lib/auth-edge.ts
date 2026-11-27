/**
 * Edge-safe half of the admin session: cookie name and a shape check.
 * The cryptographic verification (HMAC) lives in lib/auth.ts and runs on Node,
 * inside the admin layout and every admin server action.
 */
export const SESSION_COOKIE = "br_admin";

export function looksLikeToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const exp = Number(parts[0]);
  return Number.isFinite(exp) && exp > Date.now();
}
