import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ minHeight: "70vh", display: "grid", alignContent: "center", padding: "120px 0" }}>
      <p className="eyebrow">404</p>
      <h2>
        That door does not <em>open</em>.
      </h2>
      <p>The room is still two floors above Djibouti Street.</p>
      <div style={{ marginTop: 18 }}>
        <Link className="btn solid" href="/">
          Back to the lounge
        </Link>
      </div>
    </main>
  );
}
