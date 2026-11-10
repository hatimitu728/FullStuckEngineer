import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { finalize, badQuotes, locateQuote, insertBeforeSignOff } from "../server/postprocess.js";

const email = JSON.parse(readFileSync(new URL("../fixtures/emails/northbridge.json", import.meta.url)));
const sample = JSON.parse(readFileSync(new URL("../fixtures/sample-northbridge.json", import.meta.url)));
const NOW = new Date("2026-11-10T00:30:00+09:00");

test("every sample quote is an exact copy of the Northbridge email", () => {
  assert.deepEqual(badQuotes(email.text, sample), []);
});

test("locateQuote tolerates curly quotes and whitespace only", () => {
  const t = "He said “hello”  to   me.";
  assert.ok(locateQuote(t, 'said "hello" to me'));
  assert.equal(locateQuote(t, "said hi to me"), null);
});

test("finalize: CORE facts for Northbridge", () => {
  const a = finalize(sample, email, { now: NOW });
  const types = a.risks.map((r) => r.type);
  assert.equal(types.filter((t) => t === "wrong_weekday").length, 2);
  assert.ok(types.includes("deadline_after_event"));
  assert.ok(a.risks.every((r) => r.certainty === "checked_in_code"));
  // Risk beats come right after the ask beat.
  const kinds = a.spokenBeats.map((b) => b.kind);
  assert.deepEqual(kinds, ["need_reply", "what", "ask", "risk", "risk", "risk", "condition", "draft"]);
  assert.match(a.spokenBeats[3].text, /Wednesday, 12 November 2026.*Thursday/);
  assert.deepEqual(a.spokenBeats.map((b) => b.id), ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
  // Easy Read keeps the NOT and gets a code warning card after "when".
  const cardKinds = a.easyRead.map((c) => c.kind);
  assert.deepEqual(cardKinds, ["what", "ask", "when", "risk", "risk", "skip", "next"]);
  assert.ok(a.easyRead.some((c) => /NOT need your residence card/.test(c.body)));
  // Original asWritten untouched.
  assert.equal(a.dates[0].asWritten, "Wednesday, 12 November 2026, at 16:00 JST");
  assert.equal(a.dates[0].weekdayReal, "Thursday");
  // Every reference points at real evidence.
  const ids = new Set(a.evidence.map((e) => e.id));
  for (const x of [...a.asks, ...a.risks, ...a.spokenBeats, ...a.easyRead]) for (const id of x.evidenceIds) assert.ok(ids.has(id), id);
});

test("finalize drops invented quotes and dangling refs, and says so", () => {
  const bad = structuredClone(sample);
  bad.evidence.push({ id: "E9", quote: "You must bring your passport." });
  bad.asks[0].evidenceIds.push("E9");
  const a = finalize(bad, email, { now: NOW });
  assert.ok(!a.evidence.some((e) => e.id === "E9"));
  assert.ok(!a.asks[0].evidenceIds.includes("E9"));
  assert.equal(a.meta.quality.droppedEvidence.length, 1);
});

test("finalize ignores Gemini's own weekday claims", () => {
  const g = structuredClone(sample);
  g.risks = [{ id: "R1", type: "wrong_weekday", originalSays: "x", checkFound: "12 November is a Monday", nextStep: "", evidenceIds: [] }];
  g.spokenBeats.splice(3, 0, { id: "SX", kind: "risk", text: "12 November is a Monday.", evidenceIds: [] });
  const a = finalize(g, email, { now: NOW });
  assert.ok(!JSON.stringify(a.risks).includes("Monday"));
  assert.ok(!a.spokenBeats.some((b) => /Monday/.test(b.text)));
});

test("draft guard: a draft that confirms the wrong weekday gets the date question added", () => {
  const g = structuredClone(sample);
  g.draftReply = "Dear Aiko Sato,\n\nI am happy to confirm the interview on Wednesday, 12 November 2026.\n\nWarm regards,\nTinish";
  const a = finalize(g, email, { now: NOW });
  assert.match(a.draftReply, /12 November 2026 is a Thursday/);
  assert.match(a.draftReply, /13 November 2026 is a Friday/);
  assert.match(a.draftReply, /confirm which day you mean\?\n\nWarm regards/);
  assert.ok(a.meta.quality.notes.some((n) => /added a question/.test(n)));
});

test("draft guard leaves a good draft alone; duplicate quotes merge; draft beat never says send", () => {
  const g = structuredClone(sample);
  g.evidence.push({ id: "E6", quote: g.evidence[0].quote });
  g.asks[0].evidenceIds = ["E6"];
  g.spokenBeats[4].text = "A draft reply is ready for you to review and send.";
  const a = finalize(g, email, { now: NOW });
  assert.equal(a.evidence.length, 5);
  assert.deepEqual(a.asks[0].evidenceIds, ["E1"]);
  assert.ok(!/review and send/.test(a.spokenBeats.at(-1).text));
  assert.match(a.spokenBeats.at(-1).text, /not sent/);
  // sample draft only mentions Thursday (12 Nov) – Friday (13 Nov) note is added, Thursday one is not duplicated
  assert.equal((a.draftReply.match(/is a Thursday/g) || []).length, 1);
});

test("insertBeforeSignOff: one-line drafts, multi-line drafts, Japanese, and no sign-off", () => {
  const B = "QUESTION?";
  assert.equal(insertBeforeSignOff("Dear Aiko, Thank you for the invitation. Best regards, Tinish", B),
    "Dear Aiko, Thank you for the invitation.\n\nQUESTION?\n\nBest regards, Tinish");
  assert.equal(insertBeforeSignOff("Dear Aiko,\n\nThank you for the invitation.\n\nWarm regards,\nTinish", B),
    "Dear Aiko,\n\nThank you for the invitation.\n\nQUESTION?\n\nWarm regards,\nTinish");
  assert.equal(insertBeforeSignOff("山田様\nご案内ありがとうございます。\nよろしくお願いいたします。\nティニッシュ", B),
    "山田様\nご案内ありがとうございます。\n\nQUESTION?\n\nよろしくお願いいたします。\nティニッシュ");
  assert.equal(insertBeforeSignOff("Hi Kenji, sure.", B), "Hi Kenji, sure.\n\nQUESTION?");
});

test("no-reply email: the draft beat says no reply is needed", () => {
  const g = structuredClone(sample);
  g.needsReply = { value: false, why: "", evidenceIds: [] };
  const a = finalize(g, email, { now: NOW });
  assert.match(a.spokenBeats.at(-1).text, /No reply is needed/);
});

test("draft guard does not duplicate a question Gemini already asked", () => {
  const g = structuredClone(sample);
  g.draftReply = "Dear Aiko,\n\nCould you please clarify which day you mean for Wednesday, 12 November 2026 and Thursday, 13 November 2026?\n\nBest regards,\nTinish";
  const a = finalize(g, email, { now: NOW });
  assert.equal(a.draftReply, g.draftReply);
  assert.ok(!a.meta.quality.notes.some((n) => /added a question/.test(n)));
});
