import { NextResponse } from "next/server";
import {
  requestOrigin,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = NextResponse.redirect(
    new URL("/admin/login", requestOrigin(req)),
    303,
  );
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(req),
    maxAge: 0,
  });
  return res;
}

export async function GET(req: Request) {
  return POST(req);
}
