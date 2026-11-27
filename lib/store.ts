import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { insert, supabaseConfigured } from "./supabase";

export type ReservationInput = {
  name: string;
  phone: string;
  guests: string;
  night: string;
  time: string;
  notes: string;
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

export const backend = supabaseConfigured ? "supabase" : "file";

/**
 * Persist a reservation request.
 * - Supabase when SUPABASE_URL + a service/secret key are configured.
 * - Otherwise a local JSONL file, so the form is exercisable in dev without a database.
 *   The file backend is deliberately dev-only: Vercel's filesystem is read-only at runtime.
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

  if (backend === "supabase") {
    await insert("reservations", record);
    return record;
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_FILE_STORE !== "1"
  ) {
    // Fail loudly rather than silently dropping a guest's table request.
    throw new Error(
      "No reservation backend configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  const dir = path.join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  await appendFile(
    path.join(dir, "reservations.jsonl"),
    `${JSON.stringify(record)}\n`,
    "utf8",
  );
  return record;
}
