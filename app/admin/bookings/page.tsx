import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listReservations, type Reservation } from "@/lib/store";
import { storageMode } from "@/lib/supabase";
import {
  setReservationStatus,
  setReservationNotes,
  deleteReservation,
  purgeOld,
} from "../actions";
import ConfirmButton from "../ConfirmButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings", robots: { index: false, follow: false } };

const FILTERS = [
  { key: "open", label: "Needs an answer", match: (r: Reservation) => r.status === "requested" },
  { key: "confirmed", label: "Confirmed", match: (r: Reservation) => r.status === "confirmed" },
  { key: "seated", label: "Seated", match: (r: Reservation) => r.status === "seated" },
  {
    key: "closed",
    label: "Cancelled / no-show",
    match: (r: Reservation) => ["cancelled", "no_show"].includes(r.status),
  },
  { key: "all", label: "Everything", match: () => true },
];

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  seated: "Seated",
  no_show: "No-show",
  cancelled: "Cancelled",
};

function when(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Addis_Ababa",
  }).format(new Date(iso));
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  await requireSession();
  const { f } = await searchParams;
  const active = FILTERS.find((x) => x.key === f) ?? FILTERS[0];

  let rows: Reservation[] = [];
  let failure: string | null = null;
  if (storageMode !== "none") {
    try {
      rows = await listReservations(300);
    } catch (err) {
      failure = err instanceof Error ? err.message : "Could not read the bookings.";
    }
  }

  const counts = {
    open: rows.filter((r) => r.status === "requested").length,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    seated: rows.filter((r) => r.status === "seated").length,
  };
  const shown = rows.filter(active.match);

  return (
    <div className="admin-wrap">
      <div className="admin-row">
        <div>
          <h1>Bookings</h1>
          <p className="admin-muted">
            Table requests from the site, newest first. Change a status as the night goes on — the guest is
            called back by phone, so the number is always one tap away.
          </p>
        </div>
        <form action={purgeOld}>
          <ConfirmButton
            className="admin-btn sm"
            title="Deletes bookings older than 45 days"
            message="Delete all bookings older than 45 days?"
          >
            Purge old
          </ConfirmButton>
        </form>
      </div>

      <div className="admin-stat">
        <div>
          <b>{counts.open}</b> waiting
        </div>
        <div>
          <b>{counts.confirmed}</b> confirmed
        </div>
        <div>
          <b>{counts.seated}</b> seated
        </div>
        <div>
          <b>{rows.length}</b> in the last 300
        </div>
      </div>

      {failure ? (
        <div className="admin-card" style={{ marginBottom: 18 }}>
          <p className="admin-error">Could not reach the store: {failure}</p>
        </div>
      ) : null}

      <div className="admin-filters">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/admin/bookings?f=${x.key}`}
            aria-current={x.key === active.key ? "page" : undefined}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        {shown.length === 0 ? (
          <p className="admin-empty">
            {active.key === "open" ? (
              <>
                {rows.length > 0 ? (
                  <>
                    Every request has been answered.{" "}
                    <Link href="/admin/bookings?f=all">See all {rows.length} ↗</Link>
                  </>
                ) : (
                  <>
                    No table requests yet. Submit one on the{" "}
                    <Link href="/#visit" target="_blank" rel="noopener">
                      public reservation form ↗
                    </Link>{" "}
                    and it will appear here.
                  </>
                )}
              </>
            ) : (
              "Nothing in this view."
            )}
          </p>
        ) : (
          shown.map((r) => (
            <div className="booking" key={r.reference}>
              <div>
                <div className="ref">{r.reference}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`chip ${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                </div>
              </div>

              <div>
                <p className="who">{r.name}</p>
                <p className="when">
                  {r.night} · {r.time} · {r.guests}
                </p>
                <p className="contact">
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>{r.phone}</a>
                  <span style={{ color: "var(--a-mute)" }}> · asked {when(r.created_at)}</span>
                </p>
                {r.notes ? <p className="notes">“{r.notes}”</p> : null}
                <details className="editor" style={{ marginTop: 8 }}>
                  <summary>{r.notes ? "Edit note" : "Add note"}</summary>
                  <form action={setReservationNotes} className="admin-form" style={{ marginTop: 8 }}>
                    <input type="hidden" name="reference" value={r.reference} />
                    <label className="admin-field">
                      <span>Notes</span>
                      <textarea name="notes" defaultValue={r.notes} maxLength={400} placeholder="Table preference, callback note..." />
                    </label>
                    <button className="admin-btn sm solid" type="submit" style={{ justifySelf: "start" }}>
                      Save note
                    </button>
                  </form>
                </details>
              </div>

              <div className="controls">
                <form action={setReservationStatus}>
                  <input type="hidden" name="reference" value={r.reference} />
                  <select name="status" defaultValue={r.status} aria-label={`Status for ${r.name}`}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <button className="admin-btn sm" type="submit" style={{ width: "100%", marginTop: 6 }}>
                    Save status
                  </button>
                </form>
                <form action={deleteReservation}>
                  <input type="hidden" name="reference" value={r.reference} />
                  <ConfirmButton
                    className="admin-btn sm danger"
                    style={{ width: "100%" }}
                    message={`Delete booking ${r.reference} for ${r.name}?`}
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
