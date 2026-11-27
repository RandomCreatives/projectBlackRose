"use client";
import { useState } from "react";

export default function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // A full navigation, not router.replace: the session cookie is set by this very
        // response, and a client-side transition can beat the browser to it.
        window.location.assign(next.startsWith("/admin") ? next : "/admin/bookings");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "That password does not match. Try again.");
    } catch {
      setError("Could not reach the server. Check the connection and try again.");
    }
    setPending(false);
  }

  return (
    <form action="/api/admin/login" method="post" onSubmit={onSubmit} className="admin-form">
      <input type="hidden" name="next" value={next} />
      <label className="admin-field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={error ? "login-error" : undefined}
        />
      </label>
      {error ? (
        <p className="admin-error" id="login-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="admin-btn solid" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
