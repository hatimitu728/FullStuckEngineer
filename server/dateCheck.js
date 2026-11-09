// Date check in code. Gemini never decides what weekday a date really is.
// Code reads the date as written, computes the real weekday in Japan time
// (JST = UTC+9), and reports mismatches. Code never edits the original text.

export const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAYS_JA = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const JA_DAY_CHARS = ["日", "月", "火", "水", "木", "金", "土"];

const MONTHS = ["january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december"];
const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

function monthIndex(name) {
  const n = name.toLowerCase().slice(0, 3);
  return MONTHS.findIndex((m) => m.startsWith(n));
}

const pad = (n) => String(n).padStart(2, "0");

/** Real weekday in Japan time (JST = UTC+9). Code, not AI. */
export function realWeekday(isoDate) {
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return null;
  const jst = new Date(t + 9 * 3600 * 1000);
  return DAYS_EN[jst.getUTCDay()];
}

/** Weekday written in the text, normalised to English ("Wednesday"), or null. */
export function weekdayInText(text) {
  if (!text) return null;
  const en = text.match(/\b(sun|mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?)(?:day)?\b/i);
  if (en) {
    const k = en[1].toLowerCase().slice(0, 3);
    const i = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(k);
    if (i >= 0) return DAYS_EN[i];
  }
  const ja = text.match(/[（(]\s*([日月火水木金土])\s*(?:曜日?)?\s*[）)]|([日月火水木金土])曜日?/);
  if (ja) {
    const c = ja[1] || ja[2];
    return DAYS_EN[JA_DAY_CHARS.indexOf(c)];
  }
  return null;
}

/**
 * Parse the calendar date (and time if present) out of the text as written.
 * Returns {y, m, d, hh, mi, hasTime} with m 1-12, or null if no date found.
 */
export function parseWritten(text, fallbackYear) {
  if (!text) return null;
  let y, m, d;
  let r;
  if ((r = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/))) {
    [y, m, d] = [+r[1], +r[2], +r[3]];
  } else if ((r = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/))) {
    [y, m, d] = [fallbackYear, +r[1], +r[2]];
  } else if ((r = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    [y, m, d] = [+r[1], +r[2], +r[3]];
  } else if ((r = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}\\b\\.?,?(?:\\s+(\\d{4}))?`, "i")))) {
    [y, m, d] = [r[3] ? +r[3] : fallbackYear, monthIndex(r[2]) + 1, +r[1]];
  } else if ((r = text.match(new RegExp(`\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b,?(?:\\s+(\\d{4}))?`, "i")))) {
    [y, m, d] = [r[3] ? +r[3] : fallbackYear, monthIndex(r[1]) + 1, +r[2]];
  } else {
    return null;
  }
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Reject impossible dates such as 31 November.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCMonth() !== m - 1) return null;

  let hh = 0, mi = 0, hasTime = false;
  let t;
  if ((t = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?/i))) {
    hh = +t[1]; mi = +t[2]; hasTime = true;
    if (t[3]) { const pm = t[3].toLowerCase() === "pm"; if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0; }
  } else if ((t = text.match(/(午後)?\s*(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分|半)?/))) {
    hh = +t[2] + (t[1] && +t[2] < 12 ? 12 : 0); mi = t[3] ? +t[3] : /半/.test(t[0]) ? 30 : 0; hasTime = true;
  } else if ((t = text.match(/\b(\d{1,2})\s*(am|pm)\b/i))) {
    hh = +t[1]; hasTime = true;
    const pm = t[2].toLowerCase() === "pm"; if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0;
  }
  if (hh > 23 || mi > 59) { hh = 0; mi = 0; hasTime = false; }
  return { y, m, d, hh, mi, hasTime };
}

export function toJstIso({ y, m, d, hh, mi }) {
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mi)}:00+09:00`;
}

function fmtDate(iso, lang) {
  const t = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate();
  if (lang === "ja") return `${y}年${m}月${d}日`;
  return `${d} ${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
}

function jaDay(en) { return DAYS_JA[DAYS_EN.indexOf(en)] || en; }

/**
 * Verify every date in code and return the date risks.
 * - Fills weekdayReal / verifiedBy on each date (overwrites anything Gemini put there).
 * - Re-derives isoDate from the text as written when it can be parsed.
 * - Never edits asWritten.
 * @param {Array} dates analysis.dates (mutated in place)
 * @param {object} opts {lang: "en"|"ja", now: Date}
 */
export function checkDates(dates, { lang = "en", now = new Date() } = {}) {
  const risks = [];
  const nowYear = new Date(now.getTime() + 9 * 3600 * 1000).getUTCFullYear();
  for (const d of dates || []) {
    const fallbackYear = Number(String(d.isoDate || "").slice(0, 4)) || nowYear;
    const parsed = parseWritten(d.asWritten, fallbackYear);
    if (parsed) {
      // Keep Gemini's time only when the written text has no time of its own.
      if (!parsed.hasTime && d.isoDate && !Number.isNaN(new Date(d.isoDate).getTime())) {
        const g = new Date(new Date(d.isoDate).getTime() + 9 * 3600 * 1000);
        parsed.hh = g.getUTCHours(); parsed.mi = g.getUTCMinutes();
      }
      d.isoDate = toJstIso(parsed);
      d.hasTime = parsed.hasTime;
      d.parsedBy = "code";
    } else {
      d.parsedBy = "gemini";
      d.hasTime = Boolean(d.hasTime);
    }
    const written = weekdayInText(d.asWritten);
    d.weekdayWritten = written; // code reads the weekday from the original text
    d.weekdayReal = d.isoDate ? realWeekday(d.isoDate) : null;
    d.verifiedBy = "code";
    if (d.weekdayWritten && d.weekdayReal && d.weekdayWritten !== d.weekdayReal) {
      const dateText = fmtDate(d.isoDate, lang);
      risks.push({
        type: "wrong_weekday",
        originalSays: d.asWritten,
        checkFound: lang === "ja"
          ? `${dateText}は${jaDay(d.weekdayReal)}です。`
          : `${dateText} is a ${d.weekdayReal}.`,
        meaning: lang === "ja"
          ? "どちらの日のことか分かりません。Jeriは推測しません。"
          : "We do not know which day they mean. Jeri does NOT guess.",
        certainty: "checked_in_code",
        nextStep: lang === "ja"
          ? "どちらの日のことか、相手に確認しましょう。"
          : "Ask which day they mean. Do not guess.",
        evidenceIds: [...(d.evidenceIds || [])],
        dateIds: [d.id],
      });
    }
  }

  // Deadline after the event it is about.
  const valid = (x) => x.isoDate && !Number.isNaN(new Date(x.isoDate).getTime());
  let events = (dates || []).filter((x) => x.kind === "event" && valid(x));
  let deadlines = (dates || []).filter((x) => x.kind === "deadline" && valid(x));
  if (!events.length && !deadlines.length) {
    // Fallback from the team plan: D1 = event, D2 = confirm-by.
    const ev = (dates || []).find((x) => x.id === "D1");
    const by = (dates || []).find((x) => x.id === "D2");
    if (ev && by && valid(ev) && valid(by)) { events = [ev]; deadlines = [by]; }
  }
  const endOfDay = (x) => {
    if (x.hasTime) return new Date(x.isoDate).getTime();
    return new Date(x.isoDate.slice(0, 10) + "T23:59:00+09:00").getTime();
  };
  for (const by of deadlines) {
    for (const ev of events) {
      if (endOfDay(by) > new Date(ev.isoDate).getTime()) {
        risks.push({
          type: "deadline_after_event",
          originalSays: lang === "ja"
            ? `期限：${by.asWritten} ／ ${ev.label}：${ev.asWritten}`
            : `Deadline: ${by.asWritten} · ${ev.label}: ${ev.asWritten}`,
          checkFound: lang === "ja"
            ? `返信の期限（${by.label}）が${ev.label}より後になっています。`
            : `The ${by.label.toLowerCase()} deadline is after the ${ev.label.toLowerCase()}.`,
          meaning: lang === "ja"
            ? "期限ぎりぎりに返信すると、間に合わない可能性があります。"
            : "If you wait until the deadline, the event will already be over.",
          certainty: "checked_in_code",
          nextStep: lang === "ja"
            ? `${ev.label}より前に返信しましょう。`
            : `Reply before the ${ev.label.toLowerCase()}.`,
          evidenceIds: [...new Set([...(by.evidenceIds || []), ...(ev.evidenceIds || [])])],
          dateIds: [by.id, ev.id],
        });
      }
    }
  }

  // Deadline already passed.
  for (const by of deadlines) {
    if (endOfDay(by) < now.getTime()) {
      risks.push({
        type: "deadline_passed",
        originalSays: by.asWritten,
        checkFound: lang === "ja" ? "この期限はすでに過ぎています。" : "This deadline has already passed.",
        meaning: lang === "ja" ? "期限後でも対応できるか、確認が必要です。" : "You may need to ask if it is still possible.",
        certainty: "checked_in_code",
        nextStep: lang === "ja" ? "相手に状況を確認しましょう。" : "Ask them if you can still reply.",
        evidenceIds: [...(by.evidenceIds || [])],
        dateIds: [by.id],
      });
    }
  }
  return risks;
}
