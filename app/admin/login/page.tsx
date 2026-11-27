import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next, e } = await searchParams;
  return (
    <div className="admin-login">
      <div className="admin-card">
        <p className="admin-eyebrow">Black Rose</p>
        <h1>Sign in</h1>
        <p className="admin-muted">
          For the two people who run the room. Bookings and the menu are behind this door.
        </p>
        <LoginForm next={next ?? "/admin/bookings"} initialError={e ?? null} />
      </div>
    </div>
  );
}
