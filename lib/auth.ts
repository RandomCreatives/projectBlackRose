import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Admin session.
 *
 * Deliberately dependency-free: a signed cookie, an HMAC over the expiry, compared in
 * constant time. One shared password for the two people who run the room — it is a
 * bookings sheet, not a bank. If the owners later want named accounts, swap this for
 * Supabase Auth without touching the rest of the panel.
 */

const COOKIE = "br_admin";
const MAX_AGE_S = 60 * 60 * 12; // a shift, not a season

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET is missing or too short (min 16 chars)",
    );
  }
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueToken(): string {
  const exp = Date.now() + MAX_AGE_S * 1000;
  const nonce = randomBytes(6).toString("base64url");
  const payload = `${exp}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  const expected = sign(`${exp}.${nonce}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD is not set");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  // compare fixed-length digests so the comparison time does not leak the length
  const da = createHmac("sha256", "cmp").update(a).digest();
  const db = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(da, db) && a.length === b.length;
}

export async function setSession() {
  const jar = await cookies();
  jar.set(COOKIE, issueToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;

/** Page-level guard: send anyone without a valid session to the sign-in page. */
export async function requireSession() {
  const { redirect } = await import("next/navigation");
  if (!(await isSignedIn())) redirect("/admin/login");
}
