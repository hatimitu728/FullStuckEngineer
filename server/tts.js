// Cloud Text-to-Speech: one MP3 clip per spoken beat, standard stock voices only.
import { createHash } from "node:crypto";

const URL_TTS = "https://texttospeech.googleapis.com/v1/text:synthesize";
const VOICES = {
  en: { languageCode: "en-US", name: "en-US-Standard-C" },
  ja: { languageCode: "ja-JP", name: "ja-JP-Standard-A" },
};
const cache = new Map(); // key -> base64 mp3
const MAX_CACHE = 500;

export class TtsError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

async function synth(text, lang, rate) {
  const key = process.env.TTS_API_KEY || process.env.GEMINI_API_KEY || "proxy-injected";
  const voice = VOICES[lang] || VOICES.en;
  const body = (v) => JSON.stringify({
    input: { text },
    voice: v,
    audioConfig: { audioEncoding: "MP3", speakingRate: rate },
  });
  let res = await fetch(URL_TTS, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: body(voice),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 400) {
    // Voice name not available: fall back to the default voice for the language.
    res = await fetch(URL_TTS, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: body({ languageCode: voice.languageCode }),
      signal: AbortSignal.timeout(30_000),
    });
  }
  const raw = await res.text();
  if (!res.ok) {
    let msg = raw;
    try { msg = JSON.parse(raw).error?.message || raw; } catch {}
    throw new TtsError(`Cloud TTS returned ${res.status}: ${msg.slice(0, 300)}`);
  }
  const { audioContent } = JSON.parse(raw);
  if (!audioContent) throw new TtsError("Cloud TTS returned no audio.");
  return audioContent;
}

/** beats: [{id, text}] → { [id]: base64 mp3 } */
export async function speakBeats(beats, { lang = "en", rate = 1 } = {}) {
  const r = Math.min(1.5, Math.max(0.6, Number(rate) || 1));
  const out = {};
  await Promise.all(beats.map(async (b) => {
    const k = createHash("sha256").update(`${lang}|${r}|${b.text}`).digest("hex");
    if (!cache.has(k)) {
      cache.set(k, await synth(b.text, lang, r));
      if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
    }
    out[b.id] = cache.get(k);
  }));
  return out;
}
