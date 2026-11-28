import Link from "next/link";
import { isSignedIn } from "@/lib/auth";
import { storageMode } from "@/lib/supabase";
import AdminTabs from "./AdminTabs";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isSignedIn();

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-wrap">
          <Link href="/admin/bookings" className="admin-brand">
            <span aria-hidden="true">✦</span> Black Rose <em>Admin</em>
          </Link>

          {signedIn ? <AdminTabs /> : null}

          <div className="admin-actions">
            <Link href="/" className="admin-link">
              View site →
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

      {storageMode === "local" ? (
        <div className="admin-banner local">
          <b>Local mode.</b> Saving bookings and menu edits to <code>.data/</code> on disk until Supabase is
          connected.
        </div>
      ) : storageMode === "none" ? (
        <div className="admin-banner">
          <b>Database not connected.</b> Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in the environment. Until then nothing here can save.
        </div>
      ) : null}

      <main className="admin-main">{children}</main>
    </div>
  );
}
