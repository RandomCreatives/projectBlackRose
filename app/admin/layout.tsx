import Link from "next/link";
import { isSignedIn } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const TABS = [
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/menu", label: "Menu" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isSignedIn();

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-wrap">
          <Link href="/admin/bookings" className="admin-brand">
            <span aria-hidden="true">✦</span> Black Rose <em>Admin</em>
          </Link>

          {signedIn ? (
            <nav className="admin-tabs" aria-label="Admin sections">
              {TABS.map((t) => (
                <Link key={t.href} href={t.href}>
                  {t.label}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className="admin-actions">
            <Link href="/" className="admin-link" target="_blank" rel="noopener">
              View site ↗
            </Link>
            {signedIn ? (
              <form action="/api/admin/logout" method="post">
                <button className="admin-btn ghost" type="submit">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      {!supabaseConfigured ? (
        <div className="admin-banner">
          <b>Database not connected.</b> Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment. Until then nothing here can save.
        </div>
      ) : null}

      <main className="admin-main">{children}</main>
    </div>
  );
}
