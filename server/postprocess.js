// After Gemini: check quotes are exact copies, keep evidence IDs consistent,
// verify dates in code, and build the date warnings (beats + cards) from code.
import { checkDates, DAYS_EN, DAYS_JA } from "./dateCheck.js";

/** Normalise text for exact-copy checks: unify quotes, dashes and whitespace only. */
export function normalize(s) {
  return String(s || "")
    .normalize("NFKC")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Find [start, end] of a quote inside the original email (whitespace/quote-style tolerant). */
export function locateQuote(emailText, quote) {
  const exact = emailText.indexOf(quote);
  if (exact >= 0) return [exact, exact + quote.length];
  const q = normalize(quote);
  if (!q) return null;
  const pattern = q.split(" ").map((w) => escapeRe(w)
    .replace(/'/g, "['‘’]")
    .replace(/"/g, "[\"“”]")
    .replace(/-/g, "[-–—]")).join("\\s+");
  const m = new RegExp(pattern).exec(emailText.normalize("NFKC"));
  return m ? [m.index, m.index + m[0].length] : null;
}

/** Quotes that are NOT exact copies of the email. */
export function badQuotes(emailText, analysis) {
  const bad = [];
  for (const e of analysis.evidence || []) {
    if (!e.quote || !locateQuote(emailText, e.quote)) bad.push(e.id);
  }
  return bad;
}

/** Put a block just before the sign-off ("Best regards", "よろしくお願いいたします"…), never above the greeting. */
export function insertBeforeSignOff(text, block) {
  const re = /(^|\n|[.!?。]\s*)((?:best|kind|warm|warmest)\s+regards|regards,|sincerely|best wishes|many thanks|yours (?:sincerely|truly)|thanks,|よろしくお願い(?:いた)?します|敬具)/gi;
  let m, last = null;
  while ((m = re.exec(text))) last = m;
  if (!last) return `${text.replace(/\s*$/, "")}\n\n${block}`;
  const idx = last.index + last[1].length;
  return `${text.slice(0, idx).replace(/\s*$/, "")}\n\n${block}\n\n${text.slice(idx).trimStart()}`;
}

const RISK_DATE_WORDS = /weekday|date|deadline|曜日|日付|期限/i;

function spokenRisk(r, datesById, lang) {
  const d = datesById[r.dateIds?.[0]];
  if (r.type === "wrong_weekday") {
    if (lang === "ja") return `注意。メールには「${r.originalSays}」と書かれています。確認したところ、この日は${DAYS_JA[DAYS_EN.indexOf(d?.weekdayReal)] || d?.weekdayReal}です。`;
    return `Warning. The email says ${r.originalSays}. Our check found that this date is a ${d?.weekdayReal}.`;
  }
  if (r.type === "deadline_after_event") {
    const ev = datesById[r.dateIds?.[1]];
    if (lang === "ja") return `注意。返信の期限が、${ev?.label || "予定"}の後になっています。`;
    return `Warning. Their reply deadline is after the ${(ev?.label || "event").toLowerCase()}.`;
  }
  if (r.type === "deadline_passed") {
    if (lang === "ja") return `注意。期限「${r.originalSays}」はすでに過ぎています。`;
    return `Warning. The deadline, ${r.originalSays}, has already passed.`;
  }
  return lang === "ja" ? `注意。${r.checkFound}` : `Warning. ${r.checkFound}`;
}

/**
 * Turn Gemini's raw JSON into the final shared analysis object.
 * @param raw   parsed Gemini JSON
 * @param email {id, text, subject, from, lang}
 * @param opts  {lang, now, model}
 */
export function finalize(raw, email, { lang = "en", now = new Date(), model = "" } = {}) {
  const a = structuredClone(raw);
  const quality = { droppedEvidence: [], droppedRefs: 0, notes: [] };

  // 1. Evidence: keep only exact copies, renumber nothing (IDs are the contract).
  const evidence = [];
  const seen = new Set();
  const alias = {}; // duplicate quote id -> first id with the same quote
  const byQuote = {};
  for (const e of a.evidence || []) {
    if (!e?.id || seen.has(e.id)) continue;
    const nq = normalize(e.quote);
    if (byQuote[nq]) { alias[e.id] = byQuote[nq]; continue; }
    byQuote[nq] = e.id;
    const loc = locateQuote(email.text, e.quote || "");
    if (!loc) { quality.droppedEvidence.push({ id: e.id, quote: e.quote }); continue; }
    seen.add(e.id);
    evidence.push({ id: e.id, quote: e.quote, offset: loc });
  }
  a.evidence = evidence;
  const ok = new Set(evidence.map((e) => e.id));
  const clean = (ids) => {
    const out = (ids || []).map((x) => alias[x] || x).filter((x) => ok.has(x));
    quality.droppedRefs += (ids || []).length - out.length;
    return [...new Set(out)];
  };

  a.needsReply = a.needsReply || { value: false, why: "", evidenceIds: [] };
  a.needsReply.evidenceIds = clean(a.needsReply.evidenceIds);
  a.asks = (a.asks || []).map((x, i) => ({ ...x, id: x.id || `A${i + 1}`, evidenceIds: clean(x.evidenceIds) }));
  a.junk = (a.junk || []).map((x) => ({ ...x, evidenceIds: clean(x.evidenceIds) }));
  a.notStated = a.notStated || [];

  // 2. Dates: verified in code. Gemini's weekdayReal is never trusted.
  a.dates = (a.dates || []).map((d, i) => ({ ...d, id: d.id || `D${i + 1}`, evidenceIds: clean(d.evidenceIds) }));
  for (const d of a.dates) {
    if (d.asWritten && !normalize(email.text).includes(normalize(d.asWritten))) {
      d.asWrittenFound = false;
      quality.notes.push(`Date "${d.asWritten}" is not an exact copy from the email.`);
    } else {
      d.asWrittenFound = true;
    }
  }
  const codeRisks = checkDates(a.dates, { lang, now });
  const datesById = Object.fromEntries(a.dates.map((d) => [d.id, d]));

  // 3. Risks: all date risks come from code. Other risks from Gemini are kept, marked as such.
  const geminiRisks = (a.risks || [])
    .filter((r) => !RISK_DATE_WORDS.test(r.type || ""))
    .map((r) => ({ ...r, certainty: "from_email", evidenceIds: clean(r.evidenceIds) }));
  a.risks = [...codeRisks, ...geminiRisks].map((r, i) => ({ ...r, id: `R${i + 1}` }));

  // 3b. Draft guard: when a weekday is wrong, the draft must ask which day they mean (code adds it if missing).
  a.draftReply = String(a.draftReply || "");
  const wrong = codeRisks.filter((r) => r.type === "wrong_weekday");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const asksQuestion = /[?？]|でしょうか|ください/.test(a.draftReply);
  const mentions = (d) => {
    if (!d?.isoDate) return false;
    const [, m, day] = d.isoDate.slice(0, 10).split("-").map(Number);
    return a.draftReply.includes(`${day} ${MONTHS[m - 1]}`) || a.draftReply.includes(`${MONTHS[m - 1]} ${day}`) || a.draftReply.includes(`${m}月${day}日`);
  };
  // Already handled when the draft names the real weekday, or asks a question about that date.
  const missing = wrong.filter((r) => {
    const d = datesById[r.dateIds[0]];
    return !(a.draftReply.includes(d?.weekdayReal || "@@") || (asksQuestion && mentions(d)));
  });
  if (missing.length) {
    const ask = lang === "ja"
      ? missing.map((r) => `メールには「${r.originalSays}」とありますが、${r.checkFound}`).join("\n") + "\nどちらの日のことか、ご確認いただけますでしょうか。"
      : missing.map((r) => `The email says "${r.originalSays}", but ${r.checkFound.replace(/\.$/, "")}.`).join("\n") + "\nCould you please confirm which day you mean?";
    a.draftReply = insertBeforeSignOff(a.draftReply, ask);
    quality.notes.push("Jeri added a question about the date to the draft, because the weekday does not match.");
  }

  // 4. Spoken beats: Gemini's beats + code-made date warnings after the ask beats.
  const draftBeat = a.needsReply?.value === false
    ? (lang === "ja" ? "返信は不要です。返信したい場合は、短い下書きがあります。まだ送信していません。" : "No reply is needed. If you want to reply anyway, a short draft is ready. It is not sent.")
    : (lang === "ja" ? "返信の下書きがあります。まだ送信していません。確認してください。" : "Here is a draft reply. It is not sent. Please check it.");
  const beats = (a.spokenBeats || []).filter((b) => b.kind !== "risk" && b.text)
    .map((b) => (b.kind === "draft" ? { ...b, text: draftBeat } : b));
  const riskBeats = codeRisks.map((r) => ({
    kind: "risk",
    text: spokenRisk(r, datesById, lang),
    evidenceIds: r.evidenceIds,
    source: "code",
  }));
  let insertAt = beats.map((b) => b.kind).lastIndexOf("ask");
  if (insertAt < 0) insertAt = beats.map((b) => b.kind).lastIndexOf("what");
  beats.splice(insertAt + 1, 0, ...riskBeats);
  if (!beats.some((b) => b.kind === "draft") && a.draftReply) {
    beats.push({ kind: "draft", text: draftBeat, evidenceIds: [] });
  }
  a.spokenBeats = beats.map((b, i) => ({ ...b, id: `S${i + 1}`, evidenceIds: clean(b.evidenceIds) }));

  // 5. Easy Read cards: one code-made date warning card after "when".
  const cards = (a.easyRead || []).filter((c) => c.title || c.body);
  if (codeRisks.length) {
    const body = codeRisks.map((r) => {
      if (r.type === "wrong_weekday") return lang === "ja"
        ? `メールには「${r.originalSays}」とあります。${r.checkFound}`
        : `The email says "${r.originalSays}". ${r.checkFound}`;
      return r.checkFound;
    }).join("\n");
    const card = {
      kind: "risk",
      title: lang === "ja" ? "日付に注意（コードで確認）" : "Date warning (checked in code)",
      body: body + "\n" + (lang === "ja" ? "Jeriはどの日が正しいか推測しません。" : "Jeri does NOT guess which day is right."),
      evidenceIds: [...new Set(codeRisks.flatMap((r) => r.evidenceIds))],
      source: "code",
    };
    let at = cards.map((c) => c.kind).lastIndexOf("when");
    if (at < 0) at = cards.map((c) => c.kind).lastIndexOf("ask");
    cards.splice(at + 1, 0, card);
  }
  if (a.junk.length && !cards.some((c) => c.kind === "skip")) {
    const nextAt = cards.findIndex((c) => c.kind === "next");
    const skip = {
      kind: "skip",
      title: lang === "ja" ? "読み飛ばしてよいもの" : "You can skip",
      body: a.junk.map((j) => `${j.text}: ${j.why}`).join("\n"),
      evidenceIds: [...new Set(a.junk.flatMap((j) => j.evidenceIds))],
      source: "code",
    };
    if (nextAt < 0) cards.push(skip); else cards.splice(nextAt, 0, skip);
  }
  a.easyRead = cards.map((c, i) => ({ ...c, id: `C${i + 1}`, evidenceIds: clean(c.evidenceIds) }));

  if (quality.droppedEvidence.length) {
    quality.notes.push(`${quality.droppedEvidence.length} quote(s) were not exact copies of the email and were removed.`);
  }

  return {
    emailId: email.id,
    lang,
    ...a,
    meta: {
      source: "gemini",
      model,
      analysedAt: now.toISOString(),
      quality,
    },
  };
}
