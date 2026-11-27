import { NextResponse } from "next/server";
import {
  checkPassword,
  issueToken,
  requestOrigin,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AGE_S = 60 * 60 * 12;

/** A blunt speed bump on password guessing: 8 tries per IP per quarter hour. */
const attempts = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
  list.push(now);
  attempts.set(ip, list);
  if (attempts.size > 2000) attempts.clear();
  return list.length > 8;
}

/**
 * Two ways in, so the panel still works if JavaScript does not:
 *  - the form posts url-encoded and we redirect (no-JS / pre-hydration path)
 *  - the enhanced form posts JSON and we answer JSON
 * Either way the password never appears in a URL.
 */
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  const isForm =
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data");
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const origin = requestOrigin(req);

  const fail = (status: number, message: string, next: string) =>
    isForm
      ? NextResponse.redirect(
          new URL(
            `/admin/login?e=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`,
            origin,
          ),
          303,
        )
      : NextResponse.json({ error: message }, { status });

  let password = "";
  let next = "/admin/bookings";
  try {
    if (isForm) {
      const fd = await req.formData();
      password = String(fd.get("password") ?? "");
      const n = String(fd.get("next") ?? "");
      if (n.startsWith("/admin")) next = n;
    } else {
      const body = (await req.json()) as { password?: string };
      password = String(body.password ?? "");
    }
  } catch {
    return fail(400, "Malformed request.", next);
  }

  if (tooMany(ip))
    return fail(429, "Too many attempts. Wait a quarter of an hour.", next);

  let ok = false;
  try {
    ok = checkPassword(password);
  } catch {
    return fail(
      500,
      "ADMIN_PASSWORD is not configured on this deployment.",
      next,
    );
  }
  if (!ok) return fail(401, "That password does not match. Try again.", next);

  let token: string;
  try {
    token = issueToken();
  } catch {
    return fail(
      500,
      "ADMIN_SESSION_SECRET is missing or too short (min 16 chars).",
      next,
    );
  }

  const res = isForm
    ? NextResponse.redirect(new URL(next, origin), 303)
    : NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    ...sessionCookieOptions(req),
    maxAge: MAX_AGE_S,
  });
  return res;
}
