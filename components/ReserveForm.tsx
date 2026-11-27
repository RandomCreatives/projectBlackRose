"use client";
import { useEffect, useRef, useState } from "react";
import { venue, guestOptions, nightOptions, timeOptions } from "@/content/site";

type State = "idle" | "sending" | "sent" | "error";

export default function ReserveForm() {
  const [state, setState] = useState<State>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [reference, setReference] = useState<string | null>(null);
  const [name, setName] = useState("");
  const sentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.querySelectorAll<HTMLSelectElement>(".field select").forEach((s) => {
      const mark = () => s.classList.add("filled");
      mark();
      s.addEventListener("change", mark);
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      guests: String(data.get("guests") ?? ""),
      night: String(data.get("night") ?? ""),
      time: String(data.get("time") ?? ""),
      notes: String(data.get("notes") ?? "").trim(),
      consent: data.get("consent") === "on",
      website: String(data.get("website") ?? ""), // honeypot
    };

    const local: string[] = [];
    if (payload.name.length < 2) local.push("Please tell us the name for the table.");
    if (!/^[+()\d\s-]{7,}$/.test(payload.phone)) local.push("A phone number we can call back on.");
    if (!payload.consent) local.push("Please tick the box so we may call you back.");
    if (local.length) {
      setErrors(local);
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { reference?: string; errors?: string[] };
      if (!res.ok) {
        setErrors(body.errors ?? ["Something went wrong on our side. Call us and we will sort it."]);
        setState("error");
        return;
      }
      setReference(body.reference ?? null);
      setName(payload.name);
      setState("sent");
      form.reset();
      requestAnimationFrame(() => {
        sentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch {
      setErrors(["We could not reach the server. Call or email us and we will hold the table."]);
      setState("error");
    }
  }

  return (
    <form id="form" onSubmit={onSubmit} noValidate>
      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="field">
        <input id="name" name="name" type="text" placeholder=" " autoComplete="name" required maxLength={80} />
        <label htmlFor="name">Name</label>
      </div>

      <div className="field">
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder=" "
          autoComplete="tel"
          inputMode="tel"
          required
          maxLength={32}
        />
        <label htmlFor="phone">Phone</label>
      </div>

      <div className="row2">
        <div className="field">
          <select id="guests" name="guests" defaultValue={guestOptions[1]}>
            {guestOptions.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <label htmlFor="guests">Guests</label>
        </div>
        <div className="field">
          <select id="night" name="night" defaultValue={nightOptions[0].label}>
            {nightOptions.map((n) => (
              <option key={n.value}>{n.label}</option>
            ))}
          </select>
          <label htmlFor="night">Night</label>
        </div>
      </div>

      <div className="field">
        <select id="time" name="time" defaultValue={timeOptions[1]}>
          {timeOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label htmlFor="time">Time</label>
      </div>

      <div className="field">
        <input id="notes" name="notes" type="text" placeholder=" " maxLength={200} />
        <label htmlFor="notes">Anything we should know (birthday, allergies, quiet corner)</label>
      </div>

      {/* honeypot — bots fill it, people never see it */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="consent" htmlFor="consent">
        <input id="consent" name="consent" type="checkbox" required />
        <span>
          We may call you back on this number to confirm the table. Nothing else, no list, and it is deleted 30 days
          after the night.
        </span>
      </label>

      <button className="btn solid" type="submit" id="submit" style={{ width: "100%" }} disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Request the table"} <span className="arw">→</span>
      </button>

      <div className="fine">
        Or call{" "}
        <a href={`tel:${venue.phones[0].tel}`}>{venue.phones[0].label}</a> · or write to{" "}
        <a href={`mailto:${venue.email}`}>{venue.email}</a>
      </div>

      <div className={`sent${state === "sent" ? " on" : ""}`} ref={sentRef} role="status" aria-live="polite">
        <span className="tick" aria-hidden="true">
          ✓
        </span>
        <span>
          <b>{name ? `${name}’s table` : "Your table"} is requested.</b>
          {reference ? <span className="sub">Reference {reference} — the host will confirm by phone shortly.</span> : null}
        </span>
      </div>
    </form>
  );
}
