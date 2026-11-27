import { NextResponse } from "next/server";
import { saveReservation } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  phone?: string;
  guests?: string;
  night?: string;
  time?: string;
  notes?: string;
  consent?: boolean;
  website?: string; // honeypot
};

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[<>]/g, "").trim().slice(0, max) : "";

/** Best-effort per-IP throttle. Serverless instances are not shared, so this is a speed bump, not a wall. */
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const now = Date.now();
  const windowMs = 10 * 60_000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 6;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ errors: ["Malformed request."] }, { status: 400 });
  }

  // silently accept honeypot hits so bots do not learn
  if (body.website) return NextResponse.json({ ok: true, reference: "BR-00000" });

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 32);
  const notes = clean(body.notes, 200);
  const guests = clean(body.guests, 40);
  const night = clean(body.night, 40);
  const time = clean(body.time, 40);

  const errors: string[] = [];
  if (name.length < 2) errors.push("Please tell us the name for the table.");
  if (!/^[+()\d\s-]{7,}$/.test(phone)) errors.push("A phone number we can call back on.");
  if (!body.consent) errors.push("Please tick the box so we may call you back.");
  if (errors.length) return NextResponse.json({ errors }, { status: 422 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (throttled(ip)) {
    return NextResponse.json(
      { errors: ["That is a lot of requests from one place. Call us instead and we will sort it out."] },
      { status: 429 },
    );
  }

  try {
    const record = await saveReservation({ name, phone, guests, night, time, notes });
    console.log(
      JSON.stringify({ at: "reservation.requested", reference: record.reference, guests, night, time }),
    );
    return NextResponse.json({ ok: true, reference: record.reference }, { status: 201 });
  } catch (err) {
    console.error("reservation.failed", err);
    return NextResponse.json(
      {
        errors: [
          "We could not save the request. Please call +251 11 663 9884 and we will hold the table.",
        ],
      },
      { status: 500 },
    );
  }
}
