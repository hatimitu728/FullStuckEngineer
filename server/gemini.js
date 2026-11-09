import { readFileSync } from "node:fs";
import { responseSchema } from "./schema.js";
import { badQuotes } from "./postprocess.js";

const PROMPT = readFileSync(new URL("./prompt.md", import.meta.url), "utf8");
const API = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];

export class GeminiError extends Error {
  constructor(message, { status = 502, detail } = {}) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function todayJst(now) {
  const t = new Date(now.getTime() + 9 * 3600 * 1000);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${t.toISOString().slice(0, 10)} (${days[t.getUTCDay()]})`;
}

export function buildPrompt(email, { lang, readerName = "Tinish", now = new Date() }) {
  const vars = {
    reader_language: lang === "ja" ? "Japanese" : "English",
    email_language: email.lang === "ja" ? "Japanese" : email.lang === "en" ? "English" : "the same language as the email",
    reader_name: readerName,
    today: todayJst(now),
    subject: email.subject || "",
    from: email.from || "",
    email_text: email.text,
  };
  return PROMPT.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

async function callModel(model, contents, { signal }) {
  const key = process.env.GEMINI_API_KEY || "proxy-injected";
  const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
      },
    }),
    signal,
  });
  const body = await res.text();
  if (!res.ok) {
    let msg = body;
    try { const j = JSON.parse(body); msg = (Array.isArray(j) ? j[0] : j)?.error?.message || body; } catch {}
    throw new GeminiError(`Gemini ${model} returned ${res.status}: ${msg.slice(0, 300)}`, { status: res.status === 404 ? 404 : 502 });
  }
  const json = JSON.parse(body);
  const cand = json.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new GeminiError(`Gemini returned no content (finishReason: ${cand?.finishReason || json.promptFeedback?.blockReason || "unknown"})`);
  return text;
}

function parseJson(text) {
  try {
    const j = JSON.parse(text);
    if (!j || typeof j !== "object" || !Array.isArray(j.evidence) || !Array.isArray(j.spokenBeats)) return null;
    return j;
  } catch { return null; }
}

let workingModel = null;

/**
 * Ask Gemini once. Retry once on a bad answer (not JSON, or quotes that are not exact copies).
 * Returns { raw, model, attempts }.
 */
export async function analyzeWithGemini(email, opts = {}) {
  const models = workingModel ? [workingModel]
    : process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  const prompt = buildPrompt(email, opts);
  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  const signal = AbortSignal.timeout(90_000);

  let lastErr;
  for (const model of [...new Set(models)]) {
    try {
      let text = await callModel(model, contents, { signal });
      workingModel = model;
      let raw = parseJson(text);
      let attempts = 1;
      const bad = raw ? badQuotes(email.text, raw) : null;
      if (!raw || bad.length) {
        attempts = 2;
        const fix = !raw
          ? "Your answer was not valid JSON in the required shape. Answer again with ONLY the JSON."
          : `These evidence quotes are not exact copies of the email: ${bad.join(", ")}. Copy each quote character-for-character from the email and answer again with ONLY the JSON.`;
        const retry = [...contents, { role: "model", parts: [{ text }] }, { role: "user", parts: [{ text: fix }] }];
        text = await callModel(model, retry, { signal });
        const second = parseJson(text);
        if (second) raw = second;
        if (!raw) throw new GeminiError("Gemini did not return valid JSON after one retry.");
      }
      return { raw, model, attempts };
    } catch (err) {
      lastErr = err;
      if (err.status !== 404) break; // only fall through to the next model when the model is not found
    }
  }
  throw lastErr;
}
