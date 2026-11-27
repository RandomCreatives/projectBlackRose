import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, looksLikeToken } from "@/lib/auth-edge";

/**
 * Cheap gate only: keeps unauthenticated traffic away from the admin routes and the DB.
 * The real check (HMAC verification) happens in the admin layout and in every admin
 * server action, so a forged cookie still gets nowhere.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  if (looksLikeToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
