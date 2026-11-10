// Speech: one clip per spoken beat, prebuilt stock voices only (no custom voices).
// Primary engine: Gemini 3.8 Flash TTS (Gemini API, same key and host as the analysis).
// Fallback: Cloud Text-to-Speech standard voices.
// TTS_ENGINE = "gemini" (default, falls back to Cloud TTS on error) | "cloud" | "gemini-only"
import { createHash } from "node:crypto";
import { getBlob, saveBlob } from "./store.js";

const GEMINI_TTS_URL = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com") + "/v1beta/interactions";
// Tried in order. Each model has its own free-tier quota (per minute AND per day).
const GEMINI_TTS_MODELS = (process.env.GEMINI_TTS_MODELS || process.env.GEMINI_TTS_MODEL ||
  "gemini-3.8-flash-tts,gemini-3.8-flash-lite-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts")
  .split(",").map((m) => m.trim()).filter(Boolean);
const GEMINI_TTS_MODEL = GEMINI_TTS_MODELS[0];
const exhaustedUntil = new Map(); // model -> time when its quota should be back
const GEMINI_VOICE = process.env.GEMINI_TTS_VOICE || "Sulafat"; // prebuilt voice ("Warm"); language is auto-detected
const CLOUD_TTS_URL = (process.env.CLOUD_TTS_BASE || "https://texttospeech.googleapis.com") + "/v1/text:synthesize";
const CLOUD_VOICES = {
  en: { languageCode: "en-US", name: "en-US-Standard-C" },
  ja: { languageCode: "ja-JP", name: "ja-JP-Standard-A" },
};
const cache = new Map(); // key -> {data, mime, engine}
const MAX_CACHE = 500;

export class TtsError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

async function errText(res) {
  const raw = await res.text();
  try { const j = JSON.parse(raw); return (Array.isArray(j) ? j[0] : j)?.error?.message || raw; } catch { return raw; }
}

function styleFor(rate) {
  const pace = rate < 0.95 ? "slowly, with short pauses between sentences" : rate > 1.05 ? "a little faster than usual, still clearly" : "at a calm, even pace";
  return `Clear, warm and friendly, ${pace}, like reading an important message to someone who needs to catch every word`;
}

/** Find the last {type:"audio", data} item anywhere in the Interactions response. */
function findAudio(node, found = []) {
  if (Array.isArray(node)) node.forEach((n) => findAudio(n, found));
  else if (node && typeof node === "object") {
    if (node.type === "audio" && typeof node.data === "string") found.push(node);
    for (const v of Object.values(node)) if (v && typeof v === "object") findAudio(v, found);
  }
  return found;
}

async function geminiTts(text, lang, rate, model = GEMINI_TTS_MODEL) {
  const key = process.env.GEMINI_API_KEY || "proxy-injected";
  const res = await fetch(GEMINI_TTS_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model,
      input: [{
        type: "user_input",
        content: [{
          type: "text",
          text: text.replace(/[<>]/g, " "), // angle brackets are vocal-event tags in Gemini TTS
          // Only the 3.8 TTS models accept a speaking-style note; older models reject it.
          ...(/3\.8/.test(model) ? { annotations: [{ type: "speech_metadata", style: styleFor(rate) }] } : {}),
        }],
      }],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice: GEMINI_VOICE }] },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new TtsError(`Gemini TTS returned ${res.status}: ${(await errText(res)).slice(0, 300)}`);
  const json = await res.json();
  const items = findAudio(json.steps || json);
  const a = items[items.length - 1];
  if (!a?.data) throw new TtsError("Gemini TTS returned no audio.");
  const mime = a.mime_type || a.mimeType || "audio/wav";
  if (/^audio\/l16/i.test(mime)) return { data: pcmToWav(a.data, mime), mime: "audio/wav", engine: model };
  return { data: a.data, mime, engine: model };
}

async function cloudTts(text, lang, rate) {
  const key = process.env.TTS_API_KEY || process.env.GEMINI_API_KEY || "proxy-injected";
  const voice = CLOUD_VOICES[lang] || CLOUD_VOICES.en;
  const call = (v) => fetch(CLOUD_TTS_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ input: { text }, voice: v, audioConfig: { audioEncoding: "MP3", speakingRate: rate } }),
    signal: AbortSignal.timeout(30_000),
  });
  let res = await call(voice);
  if (res.status === 400) res = await call({ languageCode: voice.languageCode }); // voice name unavailable
  if (!res.ok) throw new TtsError(`Cloud TTS returned ${res.status}: ${(await errText(res)).slice(0, 300)}`);
  const { audioContent } = await res.json();
  if (!audioContent) throw new TtsError("Cloud TTS returned no audio.");
  return { data: audioContent, mime: "audio/mpeg", engine: "cloud-tts-standard" };
}

// Free-tier Gemini TTS allows only a few requests per minute, so calls run one at a time
// and wait when Google says "retry in Ns". Clips are cached (memory + Firestore when configured).
let tail = Promise.resolve();
function enqueue(fn) { const run = tail.then(fn); tail = run.catch(() => {}); return run; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** "retry in 26s", "retry in 3h7m15s", or RetryInfo "retryDelay": "26s" → milliseconds. */
export function retryDelayMs(message) {
  const m = /retry in ((?:[\d.]+h)?(?:[\d.]+m(?!s))?(?:[\d.]+s)?)/i.exec(message) || /"retryDelay":\s*"([\d.]+s)"/.exec(message);
  if (!m || !m[1]) return 20_000;
  const part = (u) => Number((new RegExp(`([\\d.]+)${u}`).exec(m[1]) || [0, 0])[1]);
  return Math.ceil((part("h") * 3600 + part("m") * 60 + part("s")) * 1000) + 500;
}

/** Raw 16-bit PCM (audio/L16) → playable WAV (base64). */
export function pcmToWav(b64, mime) {
  const pcm = Buffer.from(b64, "base64");
  const rate = Number(/rate=(\d+)/i.exec(mime)?.[1] || 24000);
  const ch = Number(/channels=(\d+)/i.exec(mime)?.[1] || 1);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]).toString("base64");
}

async function geminiWithRetry(text, lang, rate) {
  let lastErr;
  for (const model of GEMINI_TTS_MODELS) {
    if ((exhaustedUntil.get(model) || 0) > Date.now()) continue;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await geminiTts(text, lang, rate, model);
      } catch (err) {
        lastErr = err;
        const limited = / 429:/.test(err.message);
        const wait = limited ? retryDelayMs(err.message) : 0;
        if (limited && (/per day/i.test(err.message) || wait > 65_000)) {
          exhaustedUntil.set(model, Date.now() + wait);
          console.warn(`[tts] ${model}: daily quota used up, trying the next TTS model`);
          break;
        }
        if (limited && attempt < 3) {
          console.warn(`[tts] ${model}: rate limited, waiting ${Math.round(wait / 1000)}s`);
          await sleep(wait);
          continue;
        }
        if (/ (400|404|403):/.test(err.message)) console.warn(`[tts] ${model}: ${err.message.slice(0, 100)}`);
        break; // other errors: try the next model
      }
    }
  }
  throw lastErr || new TtsError("No Gemini TTS model is available right now.");
}

async function synth(text, lang, rate) {
  const engine = process.env.TTS_ENGINE || "gemini";
  if (engine === "cloud") return cloudTts(text, lang, rate);
  try {
    return await enqueue(() => geminiWithRetry(text, lang, rate));
  } catch (err) {
    if (engine === "gemini-only") throw err;
    console.warn("[tts] Gemini TTS failed, trying Cloud TTS:", err.message.slice(0, 160));
    try {
      return await cloudTts(text, lang, rate);
    } catch (cloudErr) {
      throw new TtsError(`${err.message.slice(0, 200)} | fallback: ${cloudErr.message.slice(0, 120)}`);
    }
  }
}

const inflight = new Map();
export function clipKey(text, lang, rate) {
  const r = Math.min(1.5, Math.max(0.6, Number(rate) || 1));
  return createHash("sha256").update(`${process.env.TTS_ENGINE || "gemini"}|${GEMINI_VOICE}|${lang}|${r}|${text}`).digest("hex");
}
async function clipFor(text, lang, rate) {
  const k = clipKey(text, lang, rate);
  if (cache.has(k)) return cache.get(k);
  if (inflight.has(k)) return inflight.get(k);
  const p = (async () => {
    const saved = await getBlob(`tts_${k}`);
    const c = saved || await synth(text, lang, rate);
    if (!saved) await saveBlob(`tts_${k}`, c);
    cache.set(k, c);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    return c;
  })().finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

/** beats: [{id, text}] → { clips: {[id]: base64}, mimes: {[id]: mime}, engine } */
export async function speakBeats(beats, { lang = "en", rate = 1 } = {}) {
  const r = Math.min(1.5, Math.max(0.6, Number(rate) || 1));
  const clips = {}, mimes = {};
  const engines = new Set();
  for (const b of beats) { // in order: the queue keeps it one call at a time anyway
    const c = await clipFor(b.text, lang, r);
    clips[b.id] = c.data; mimes[b.id] = c.mime; engines.add(c.engine);
  }
  return { clips, mimes, engine: [...engines].join(", ") };
}
