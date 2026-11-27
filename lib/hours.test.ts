/**
 * Plain-node assertions: the badge must never read "Closed", while the hours
 * published to Google stay the real nightly ones (doors at 5pm, every day).
 * Run: npx tsx lib/hours.test.ts   (or `npm run test:hours`)
 */
import assert from "node:assert/strict";
import { hours, openingHoursSpec } from "../content/site";
import { venueStatus, weekRows } from "./hours";

/** Addis is UTC+3, so 21:00 EAT = 18:00Z. */
const eat = (iso: string) => new Date(iso);

/** Daytime, doors, late night, past midnight — every one must still read open. */
const instants = [
  ["Thursday 4:59pm", "2026-10-29T13:59:00Z"],
  ["Thursday 5:00pm", "2026-10-29T14:00:00Z"],
  ["Thursday 9pm", "2026-10-29T18:00:00Z"],
  ["Friday 1:30am", "2026-10-30T22:30:00Z"],
  ["Friday midday", "2026-10-30T09:00:00Z"],
  ["Saturday 2:30am", "2026-10-30T23:30:00Z"],
  ["Sunday 11pm", "2026-10-25T20:00:00Z"],
  ["Monday 12:15am", "2026-10-25T21:15:00Z"],
  ["Monday 1pm", "2026-10-26T10:00:00Z"],
  ["Tuesday 12:30am", "2026-10-26T21:30:00Z"],
  ["Wednesday noon", "2026-10-28T09:00:00Z"],
];

let fails = 0;
for (const [label, iso] of instants) {
  const s = venueStatus(eat(iso));
  const ok = s.open && s.headline === "Open" && s.closesAt === null && !s.closesSoon;
  if (!ok) {
    fails++;
    console.error(`FAIL ${label}: open=${s.open} headline=${s.headline} detail=${s.detail}`);
  } else {
    console.log(`ok   ${label.padEnd(26)} ${s.headline.padEnd(8)} ${s.detail}`);
  }
}

assert.equal(hours.length, 7, "seven published days");
assert.ok(hours.every((r) => r.open === 17 * 60), "doors at 5pm, every day");

// schema.org openingHoursSpecification stays in sync with `hours`
assert.equal(openingHoursSpec.length, 7);
const byDay = Object.fromEntries(
  openingHoursSpec.map((o) => [o.dayOfWeek.split("/").pop()!, o]),
);
assert.equal(byDay.Sunday.opens, "17:00");
assert.equal(byDay.Sunday.closes, "00:30");
assert.equal(byDay.Monday.closes, "00:30");
assert.equal(byDay.Tuesday.closes, "02:00");
assert.equal(byDay.Saturday.closes, "02:00");

// weekRows groups Sun-Mon and Tue-Sat with day-of-week numbers
const rows = weekRows();
assert.equal(rows.length, 2);
assert.deepEqual(rows[0].dows, [0, 1]);
assert.deepEqual(rows[1].dows, [2, 3, 4, 5, 6]);

console.log(fails === 0 ? "\nall hour cases pass" : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
