import { test } from "node:test";
import assert from "node:assert/strict";
import { realWeekday, weekdayInText, parseWritten, checkDates } from "../server/dateCheck.js";

const NOW = new Date("2026-11-10T00:30:00+09:00");

test("realWeekday uses Japan time", () => {
  assert.equal(realWeekday("2026-11-12T16:00:00+09:00"), "Thursday");
  assert.equal(realWeekday("2026-11-13T17:00:00+09:00"), "Friday");
  // 00:30 JST on 13 Nov is still 12 Nov in UTC; JST must win.
  assert.equal(realWeekday("2026-11-13T00:30:00+09:00"), "Friday");
});

test("weekdayInText reads English and Japanese", () => {
  assert.equal(weekdayInText("Wednesday, 12 November 2026, at 16:00 JST"), "Wednesday");
  assert.equal(weekdayInText("Thu 13 Nov"), "Thursday");
  assert.equal(weekdayInText("2026年11月18日（火）14時"), "Tuesday");
  assert.equal(weekdayInText("11月16日 月曜日"), "Monday");
  assert.equal(weekdayInText("12 November 2026"), null);
  assert.equal(weekdayInText("2026年11月18日"), null);
});

test("parseWritten handles common formats", () => {
  assert.deepEqual(parseWritten("Wednesday, 12 November 2026, at 16:00 JST", 2026), { y: 2026, m: 11, d: 12, hh: 16, mi: 0, hasTime: true });
  assert.deepEqual(parseWritten("November 13, 2026 5pm", 2026), { y: 2026, m: 11, d: 13, hh: 17, mi: 0, hasTime: true });
  assert.deepEqual(parseWritten("2026年11月18日（火）14時から", 2026), { y: 2026, m: 11, d: 18, hh: 14, mi: 0, hasTime: true });
  assert.deepEqual(parseWritten("Friday, 20 November", 2026), { y: 2026, m: 11, d: 20, hh: 0, mi: 0, hasTime: false });
  assert.equal(parseWritten("31 November 2026", 2026), null);
  assert.equal(parseWritten("next week", 2026), null);
});

test("Northbridge: 2 wrong weekdays + 1 late deadline, original text untouched", () => {
  const dates = [
    { id: "D1", label: "Interview", kind: "event", asWritten: "Wednesday, 12 November 2026, at 16:00 JST", isoDate: "2026-11-12T16:00:00+09:00", evidenceIds: ["E2"] },
    { id: "D2", label: "Confirm by", kind: "deadline", asWritten: "Thursday, 13 November 2026, 17:00 JST", isoDate: "2026-11-13T17:00:00+09:00", evidenceIds: ["E1"] },
  ];
  const before = dates.map((d) => d.asWritten);
  const risks = checkDates(dates, { now: NOW });
  assert.deepEqual(dates.map((d) => d.asWritten), before);
  assert.equal(dates[0].weekdayReal, "Thursday");
  assert.equal(dates[1].weekdayReal, "Friday");
  assert.ok(dates.every((d) => d.verifiedBy === "code"));
  const types = risks.map((r) => r.type).sort();
  assert.deepEqual(types, ["deadline_after_event", "wrong_weekday", "wrong_weekday"]);
  assert.match(risks[0].checkFound, /12 November 2026 is a Thursday/);
  assert.deepEqual(risks.find((r) => r.type === "deadline_after_event").evidenceIds.sort(), ["E1", "E2"]);
});

test("code overrides a wrong ISO date and wrong weekdayReal from Gemini", () => {
  const dates = [{ id: "D1", label: "Interview", kind: "event", asWritten: "Wednesday, 12 November 2026, at 16:00 JST", isoDate: "2026-11-11T16:00:00+09:00", weekdayReal: "Wednesday", evidenceIds: [] }];
  const risks = checkDates(dates, { now: NOW });
  assert.equal(dates[0].isoDate, "2026-11-12T16:00:00+09:00");
  assert.equal(dates[0].weekdayReal, "Thursday");
  assert.equal(risks.length, 1);
});

test("Gemini cannot fake a weekday: weekdayWritten comes from the text", () => {
  const dates = [{ id: "D1", label: "Shift", kind: "event", asWritten: "12 November 2026", isoDate: "2026-11-12T00:00:00+09:00", weekdayWritten: "Monday" }];
  assert.equal(checkDates(dates, { now: NOW }).length, 0);
  assert.equal(dates[0].weekdayWritten, null);
});

test("Japanese email: wrong weekday reported in Japanese", () => {
  const dates = [
    { id: "D1", label: "説明会", kind: "event", asWritten: "2026年11月18日（火）14時", isoDate: "2026-11-18T14:00:00+09:00" },
    { id: "D2", label: "参加可否の返信", kind: "deadline", asWritten: "2026年11月16日（月）17時まで", isoDate: "2026-11-16T17:00:00+09:00" },
  ];
  const risks = checkDates(dates, { lang: "ja", now: NOW });
  assert.equal(risks.length, 1);
  assert.equal(risks[0].type, "wrong_weekday");
  assert.match(risks[0].checkFound, /水曜日/);
});

test("correct dates produce no risks; date-only deadline counts to end of day", () => {
  const dates = [
    { id: "D1", label: "Event", kind: "event", asWritten: "Friday, 20 November 2026 at 10:00", isoDate: "" },
    { id: "D2", label: "Reply", kind: "deadline", asWritten: "Friday, 20 November 2026", isoDate: "" },
  ];
  const risks = checkDates(dates, { now: NOW });
  assert.deepEqual(risks.map((r) => r.type), ["deadline_after_event"]);
});

test("deadline already passed", () => {
  const dates = [{ id: "D1", label: "Reply", kind: "deadline", asWritten: "Monday, 2 November 2026", isoDate: "" }];
  assert.deepEqual(checkDates(dates, { now: NOW }).map((r) => r.type), ["deadline_passed"]);
});
