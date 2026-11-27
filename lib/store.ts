import "server-only";
import { randomBytes } from "node:crypto";
import { insert, remove, rpc, select, storageMode, update } from "./supabase";
import {
  localDeleteReservation,
  localListReservations,
  localPurgeOldReservations,
  localSaveReservation,
  localUpdateReservation,
} from "./local-store";

export type ReservationStatus =
  | "requested"
  | "confirmed"
  | "seated"
  | "no_show"
  | "cancelled";

export type ReservationInput = {
  name: string;
  phone: string;
  guests: string;
  night: string;
  time: string;
  notes: string;
};

export type Reservation = ReservationInput & {
  reference: string;
  created_at: string;
  source: string;
  status: ReservationStatus;
  handled_by?: string | null;
  handled_at: string | null;
};

export type ReservationRecord = ReservationInput & {
  reference: string;
  created_at: string;
  source: "web";
  status: "requested";
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — readable down a phone line
export function reference() {
  const bytes = randomBytes(5);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `BR-${out}`;
}

export const backend = storageMode === "supabase" ? "supabase" : "file";

/**
 * Persist a reservation request.
 * - Supabase when SUPABASE_URL + a service/secret key are configured.
 * - Otherwise the local JSON store in `.data/reservations.json` in dev so the
 *   whole site + admin panel can be exercised locally without a database.
 */
export async function saveReservation(
  input: ReservationInput,
): Promise<ReservationRecord> {
  const record: ReservationRecord = {
    ...input,
    reference: reference(),
    created_at: new Date().toISOString(),
    source: "web",
    status: "requested",
  };

  if (storageMode === "supabase") {
    await insert("reservations", record);
    return record;
  }

  if (storageMode === "none") {
    // Fail loudly rather than silently dropping a guest's table request.
    throw new Error(
      "No reservation backend configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  await localSaveReservation({ ...record, handled_at: null });
  return record;
}

export async function listReservations(limit = 300): Promise<Reservation[]> {
  if (storageMode === "supabase") {
    return select<Reservation>("reservations", {
      select: "*",
      order: "created_at.desc",
      limit: String(limit),
    });
  }
  if (storageMode === "local") {
    return localListReservations(limit);
  }
  return [];
}

export async function updateReservationStatus(
  ref: string,
  status: ReservationStatus,
): Promise<void> {
  const handled_at = new Date().toISOString();
  if (storageMode === "supabase") {
    await update(
      "reservations",
      { reference: `eq.${ref}` },
      { status, handled_at },
    );
    return;
  }
  if (storageMode === "local") {
    await localUpdateReservation(ref, { status, handled_at });
    return;
  }
  throw new Error("No reservation backend configured");
}

export async function updateReservationNotes(
  ref: string,
  notes: string,
): Promise<void> {
  if (storageMode === "supabase") {
    await update("reservations", { reference: `eq.${ref}` }, { notes });
    return;
  }
  if (storageMode === "local") {
    await localUpdateReservation(ref, { notes });
    return;
  }
  throw new Error("No reservation backend configured");
}

export async function deleteReservationRecord(ref: string): Promise<void> {
  if (storageMode === "supabase") {
    await remove("reservations", { reference: `eq.${ref}` });
    return;
  }
  if (storageMode === "local") {
    await localDeleteReservation(ref);
    return;
  }
  throw new Error("No reservation backend configured");
}

export async function purgeOldReservations(keepDays = 45): Promise<number> {
  if (storageMode === "supabase") {
    return rpc<number>("purge_old_reservations", { keep_days: keepDays });
  }
  if (storageMode === "local") {
    return localPurgeOldReservations(keepDays);
  }
  throw new Error("No reservation backend configured");
}
