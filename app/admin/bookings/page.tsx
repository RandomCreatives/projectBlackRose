import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { select, supabaseConfigured } from "@/lib/supabase";
import { setReservationStatus, deleteReservation, purgeOld } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings", robots: { index: false, follow: false } };

type Reservation = {
  reference: string;
  created_at: string;
  name: string;
  phone: string;
  guests: string;
  night: string;
  time: string;
  notes: string;
  status: string;
  handled_at: string | null;
};

const FILTERS = [
  { key: "open", label: "Needs an answer", match: (r: Reservation) => r.status === "requested" },
  { key: "confirmed", label: "Confirmed", match: (r: Reservation) => r.status === "confirmed" },
  { key: "seated", label: "Seated", match: (r: Reservation) => r.status === "seated" },
  { key: "closed", label: "Cancelled / no-show", match: (r: Reservation) => ["cancelled", "no_show"].includes(r.status) },
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
  if (supabaseConfigured) {
    try {
      rows = await select<Reservation>("reservations", {
        select: "*",
        order: "created_at.desc",
        limit: "300",
      });
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
          <button className="admin-btn sm" type="submit" title="Deletes bookings older than 45 days">
            Purge old
          </button>
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
        <div className="admin-card">
          <p className="admin-error">Could not reach the database: {failure}</p>
        </div>
      ) : null}

      <div className="admin-filters">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/admin/bookings?f=${x.key}`} aria-current={x.key === active.key ? "page" : undefined}>
            {x.label}
          </Link>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        {shown.length === 0 ? (
          <p className="admin-empty">
            {active.key === "open" ? (
              <>
                Every request has been answered.
                {rows.length > 0 ? (
                  <>
                    {" "}
                    <Link href="/admin/bookings?f=all">See all {rows.length} ↗</Link>
                  </>
                ) : null}
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
                  <button className="admin-btn sm danger" type="submit" style={{ width: "100%" }}>
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
