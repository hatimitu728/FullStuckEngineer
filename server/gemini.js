import { responseSchema } from "./schema.js";
import { badQuotes } from "./postprocess.js";
import { preScanWeekdays } from "./dateCheck.js";

import PROMPT from "./prompt.js";
import { VERTEX, PROJECT, accessToken } from "./googleAuth.js";
const API = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com") + "/v1beta/models";
// Vertex AI (GEMINI_BACKEND=vertex): billed to the Google Cloud project, so Google Cloud credits apply.
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "global";
const VERTEX_BASE = process.env.VERTEX_API_BASE ||
  (VERTEX_LOCATION === "global" ? "https://aiplatform.googleapis.com" : `https://${VERTEX_LOCATION}-aiplatform.googleapis.com`);
// Tried in order. On "not found" or "busy" (404/429/5xx) the next model is used.
// gemini-2.5-flash is closed to new API keys; the 3.x flash models can be briefly overloaded.
const DEFAULT_MODELS = VERTEX
  ? ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"]
  : ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3-flash-preview"];
const PASSES = 3;              // rounds through the list when every model is busy
const PASS_WAIT_MS = [0, 3000, 8000];
const NEXT_MODEL_ON = new Set([404, 429, 500, 502, 503, 504]);

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

function dateFacts(text, now) {
  const facts = preScanWeekdays(text, { now });
  if (!facts.length) return "No weekday + date pairs were found by our code.";
  return facts.map((f) => f.matches
    ? `- "${f.phrase}": weekday matches the date (${f.real}).`
    : `- "${f.phrase}": the email says ${f.written}, but this date is a ${f.real}. MISMATCH – do not confirm this day in the draft; ask which day they mean.`).join("\n");
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
    date_facts: dateFacts(email.text, now),
  };
  return PROMPT.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

const CALL_TIMEOUT_MS = Number(process.env.GEMINI_CALL_TIMEOUT_MS || 50_000);

async function callModel(model, contents, { signal: total }) {
  if (total.aborted) throw new GeminiError("Jeri ran out of time waiting for Gemini.", { status: 504 });
  const signal = AbortSignal.any([total, AbortSignal.timeout(CALL_TIMEOUT_MS)]);
  try {
    return await callModelOnce(model, contents, signal);
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new GeminiError(`Gemini ${model} did not answer within ${Math.round(CALL_TIMEOUT_MS / 1000)}s`, { status: total.aborted ? 0 : 504 });
    }
    throw err;
  }
}

async function callModelOnce(model, contents, signal) {
  const url = VERTEX
    ? `${VERTEX_BASE}/v1/projects/${PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${encodeURIComponent(model)}:generateContent`
    : `${API}/${encodeURIComponent(model)}:generateContent`;
  const auth = VERTEX
    ? { authorization: `Bearer ${await accessToken()}` }
    : { "x-goog-api-key": process.env.GEMINI_API_KEY || "proxy-injected" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...auth },
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
    throw new GeminiError(`Gemini ${model} returned ${res.status}: ${msg.slice(0, 300)}`, { status: res.status });
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
  const preferred = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  const models = workingModel ? [workingModel, ...preferred] : preferred;
  const prompt = buildPrompt(email, opts);
  const contents = [{ role: "user", parts: [{ text: prompt }] }];
  const signal = AbortSignal.timeout(Number(process.env.GEMINI_TOTAL_TIMEOUT_MS || 170_000));

  let lastErr;
  for (let pass = 0; pass < PASSES; pass++) {
  if (PASS_WAIT_MS[pass]) await new Promise((r) => setTimeout(r, PASS_WAIT_MS[pass]));
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
      if (model === workingModel) workingModel = null;
      if (!NEXT_MODEL_ON.has(err.status)) break; // e.g. bad key (400/403): another model will not help
      console.warn(`[gemini] ${err.message.slice(0, 120)} → trying the next model`);
    }
  }
  if (!NEXT_MODEL_ON.has(lastErr?.status)) break;
  }
  throw lastErr;
}
