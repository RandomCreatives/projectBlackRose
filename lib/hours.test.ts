/**
 * Plain-node assertions for the "open now" logic — the one place on this site
 * where a mistake means a guest drives across Addis to a closed door.
 * Run: npx tsx lib/hours.test.ts   (or `npm run test:hours`)
 */
import assert from "node:assert/strict";
import { venueStatus } from "./hours";

/** Addis is UTC+3, so 21:00 EAT = 18:00Z. */
const eat = (iso: string) => new Date(iso);

const cases: [string, string, boolean, string][] = [
  // label, instant (UTC), expected open, expected headline
  ["Thursday 9pm", "2026-10-29T18:00:00Z", true, "Open now"],
  ["Thursday 4:59pm", "2026-10-29T13:59:00Z", false, "Closed now"],
  ["Thursday 5:00pm", "2026-10-29T14:00:00Z", true, "Open now"],
  ["Friday 1:30am (Thu spill)", "2026-10-30T22:30:00Z", true, "Open now"], // Fri 01:30 EAT
  ["Saturday 2:30am (closed)", "2026-10-30T23:30:00Z", false, "Closed now"], // Sat 02:30 EAT
  ["Sunday 11pm", "2026-10-25T20:00:00Z", true, "Open now"],
  ["Monday 12:15am (Sun spill)", "2026-10-25T21:15:00Z", true, "Open now"], // Mon 00:15 EAT = Sunday's shift
  ["Monday 1am (Sun shut)", "2026-10-25T22:00:00Z", false, "Closed now"], // Sunday closes 12:30am
  ["Monday 1pm", "2026-10-26T10:00:00Z", false, "Closed now"],
  ["Tuesday 12:15am (Mon shift)", "2026-10-26T21:15:00Z", true, "Open now"],
  ["Tuesday 12:30am (shut)", "2026-10-26T21:30:00Z", false, "Closed now"], // exactly closing time = closed
];

let fails = 0;
for (const [label, iso, wantOpen, wantHeadline] of cases) {
  const s = venueStatus(eat(iso));
  const ok = s.open === wantOpen && s.headline === wantHeadline;
  if (!ok) {
    fails++;
    console.error(
      `FAIL ${label}: open=${s.open} headline=${s.headline} detail=${s.detail}`,
    );
  } else {
    console.log(
      `ok   ${label.padEnd(26)} ${s.headline.padEnd(10)} ${s.window} — ${s.detail}`,
    );
  }
}

// "closesSoon" only inside the last 90 minutes
const late = venueStatus(eat("2026-10-29T22:45:00Z")); // Fri 01:45 EAT
assert.equal(late.closesSoon, true, "1:45am should read as last orders");
const midday = venueStatus(eat("2026-10-29T17:00:00Z")); // Thu 20:00 EAT
assert.equal(midday.closesSoon, false, "8pm should not read as last orders");

console.log(fails === 0 ? "\nall hour cases pass" : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
