// Jeri on Cloudflare Workers (free plan).
// Same /api routes as server/index.js. The page comes from public/ (static assets).
// Saved data (analyses + audio clips) lives in Workers KV. GEMINI_API_KEY is a Worker secret.
import { analyzeWithGemini, GeminiError } from "../server/gemini.js";
import { finalize } from "../server/postprocess.js";
import { speakBeats, TtsError, setBlobStore } from "../server/tts.js";
import { cacheKey } from "../server/keys.js";
import northbridge from "../fixtures/emails/northbridge.json";
import shift from "../fixtures/emails/shift-change.json";
import professor from "../fixtures/emails/professor.json";
import club from "../fixtures/emails/club-notice.json";
import japanese from "../fixtures/emails/japanese-intern.json";

const DEMO_LIST = [northbridge, shift, professor, club, japanese];
const DEMO = Object.fromEntries(DEMO_LIST.map((e) => [e.id, e]));
const inFlight = new Map();
const buckets = new Map();

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" },
});

function limited(ip, name, max, windowMs = 3600_000) {
  const k = `${name}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n += 1;
  buckets.set(k, b);
  return b.n > max;
}

function resolveEmail(body) {
  const { emailId, text, subject, from, lang } = body || {};
  if (emailId && DEMO[emailId]) return DEMO[emailId];
  if (typeof text !== "string" || !text.trim()) return null;
  if (text.length > 20000) throw Object.assign(new Error("Email is too long (max 20,000 characters)."), { status: 413 });
  const id = typeof emailId === "string" && /^[\w-]{1,80}$/.test(emailId) ? emailId : `pasted-${text.length}-${[...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}`;
  const guessLang = /[぀-ヿ一-龯]/.test(text) ? "ja" : "en";
  return { id, text, subject: String(subject || "").slice(0, 300), from: String(from || "").slice(0, 300), lang: lang === "ja" || lang === "en" ? lang : guessLang };
}

// The page may be served from Firebase Hosting (another origin). Only these origins may call the API from a browser.
function allowedOrigin(origin, env) {
  if (!origin) return null;
  const extra = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/.test(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}
function withCors(res, origin) {
  if (!origin) return res;
  const out = new Response(res.body, res);
  out.headers.set("access-control-allow-origin", origin);
  out.headers.append("vary", "Origin");
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const origin = allowedOrigin(request.headers.get("origin"), env);
    if (request.method === "OPTIONS" && new URL(request.url).pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: origin ? {
        "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "Origin" } : {} });
    }
    return withCors(await handle(request, env, ctx), origin);
  },
};

const handle = async (request, env, ctx) => {
  {
    const url = new URL(request.url);
    const path = url.pathname;
    const ip = request.headers.get("cf-connecting-ip") || "local";
    const kv = env.JERI_KV;
    const kvGet = async (k) => (kv ? kv.get(k, "json") : null);
    const kvPut = async (k, v) => { if (kv) { try { await kv.put(k, JSON.stringify(v)); } catch (e) { console.warn("kv put failed", e.message); } } };
    setBlobStore({ getBlob: kvGet, saveBlob: kvPut });

    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      if (path === "/api/health") {
        return json({ ok: true, stub: false, platform: "cloudflare-workers", key: Boolean(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY), store: { kv: Boolean(kv) } });
      }
      if (path === "/api/config") return json({ stub: false, firebase: null });
      if (path === "/api/emails") return json(DEMO_LIST);

      const m = path.match(/^\/api\/analysis\/([\w-]+)$/);
      if (m && request.method === "GET") {
        const email = DEMO[m[1]];
        if (!email) return json({ error: "Not found" }, 404);
        const lang = url.searchParams.get("lang") === "ja" || url.searchParams.get("lang") === "en" ? url.searchParams.get("lang") : email.lang;
        return json({ analysis: await kvGet(cacheKey(email, lang)), cached: true });
      }

      if (path === "/api/analyze" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const email = resolveEmail(body);
        if (!email) return json({ error: "Send an emailId of a demo email, or the email text." }, 400);
        const lang = body.readerLang === "ja" || body.readerLang === "en" ? body.readerLang : email.lang;
        const key = cacheKey(email, lang);
        const saved = await kvGet(key);
        if (saved && !body.force) return json({ analysis: saved, cached: true });
        if (limited(ip, "analyze", 60)) return json({ error: "Too many analyses from this address. Please wait a while and try again." }, 429);

        let p = inFlight.get(key);
        const joined = Boolean(p);
        if (!p) {
          p = (async () => {
            const now = new Date();
            const { raw, model, attempts } = await analyzeWithGemini(email, { lang, now });
            const a = finalize(raw, email, { lang, now, model });
            a.meta.attempts = attempts;
            if (email.id.endsWith("-demo")) await kvPut(key, a);
            return a;
          })().finally(() => inFlight.delete(key));
          inFlight.set(key, p);
          ctx.waitUntil(p.catch(() => {})); // keep working (and save) even if the browser disconnects
        }
        const analysis = await p;
        return json({ analysis, cached: joined });
      }

      if (path === "/api/speak" && request.method === "POST") {
        const { beats, lang, rate } = await request.json().catch(() => ({}));
        if (!Array.isArray(beats) || !beats.length || beats.length > 20) return json({ error: "Send 1–20 beats as [{id, text}]." }, 400);
        const clean = beats.map((b) => ({ id: String(b.id).slice(0, 20), text: String(b.text || "").slice(0, 2000) })).filter((b) => b.text.trim());
        if (limited(ip, "speak", 400)) return json({ error: "Too many audio requests. Please wait a while." }, 429);
        const { clips, mimes, engine } = await speakBeats(clean, { lang: lang === "ja" ? "ja" : "en", rate });
        return json({ clips, mimes, engine });
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(path, err.message);
      if (path === "/api/speak") return json({ error: "Audio is not available right now. You can use Captions or Easy Read.", detail: err.message }, err instanceof TtsError ? 502 : 500);
      const status = err.status === 413 ? 413 : err.status === 429 || err.status === 503 ? 503 : 502;
      return json({
        error: err instanceof GeminiError ? "Jeri could not analyse this email right now. Nothing was guessed. Please try again." : err.message || "Something went wrong.",
        detail: err.message,
      }, status);
    }
  }
};
