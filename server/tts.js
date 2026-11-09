// Speech: one clip per spoken beat, prebuilt stock voices only (no custom voices).
// Primary engine: Gemini 3.8 Flash TTS (Gemini API, same key and host as the analysis).
// Fallback: Cloud Text-to-Speech standard voices.
// TTS_ENGINE = "gemini" (default, falls back to Cloud TTS on error) | "cloud" | "gemini-only"
import { createHash } from "node:crypto";

const GEMINI_TTS_URL = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com") + "/v1beta/interactions";
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
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

async function geminiTts(text, lang, rate) {
  const key = process.env.GEMINI_API_KEY || "proxy-injected";
  const res = await fetch(GEMINI_TTS_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model: GEMINI_TTS_MODEL,
      input: [{
        type: "user_input",
        content: [{
          type: "text",
          text: text.replace(/[<>]/g, " "), // angle brackets are vocal-event tags in Gemini TTS
          annotations: [{ type: "speech_metadata", style: styleFor(rate) }],
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
  return { data: a.data, mime: a.mime_type || a.mimeType || "audio/wav", engine: GEMINI_TTS_MODEL };
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

async function synth(text, lang, rate) {
  const engine = process.env.TTS_ENGINE || "gemini";
  if (engine === "cloud") return cloudTts(text, lang, rate);
  try {
    return await geminiTts(text, lang, rate);
  } catch (err) {
    if (engine === "gemini-only") throw err;
    console.warn("[tts] Gemini TTS failed, using Cloud TTS:", err.message);
    return cloudTts(text, lang, rate);
  }
}

/** beats: [{id, text}] → { clips: {[id]: base64}, mimes: {[id]: mime}, engine } */
export async function speakBeats(beats, { lang = "en", rate = 1 } = {}) {
  const r = Math.min(1.5, Math.max(0.6, Number(rate) || 1));
  const clips = {}, mimes = {};
  const engines = new Set();
  await Promise.all(beats.map(async (b) => {
    const k = createHash("sha256").update(`${process.env.TTS_ENGINE || "gemini"}|${lang}|${r}|${b.text}`).digest("hex");
    if (!cache.has(k)) {
      cache.set(k, await synth(b.text, lang, r));
      if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    }
    const c = cache.get(k);
    clips[b.id] = c.data; mimes[b.id] = c.mime; engines.add(c.engine);
  }));
  return { clips, mimes, engine: [...engines].join(", ") };
}
