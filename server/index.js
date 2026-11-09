import express from "express";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { analyzeWithGemini, GeminiError } from "./gemini.js";
import { finalize } from "./postprocess.js";
import { speakBeats, TtsError } from "./tts.js";
import { cacheKey, getSaved, save, once, storeInfo } from "./store.js";

const ROOT = new URL("../", import.meta.url);
const STUB = process.env.JERI_STUB === "1";

// Fictional demo emails (EXAMPLE DATA). Order = inbox order.
const ORDER = ["northbridge-demo", "shift-change-demo", "professor-demo", "club-notice-demo", "japanese-intern-demo"];
const DEMO = Object.fromEntries(
  readdirSync(new URL("fixtures/emails/", ROOT))
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(new URL(`fixtures/emails/${f}`, ROOT), "utf8")))
    .map((e) => [e.id, e]),
);
const SAMPLE = JSON.parse(readFileSync(new URL("fixtures/sample-northbridge.json", ROOT), "utf8"));

const stats = { analyzeRequests: 0, geminiCalls: 0, cacheHits: 0, joinedInFlight: 0, speakRequests: 0 };

// Simple per-IP limiter so a public URL cannot burn the key.
const buckets = new Map();
function limited(ip, name, max, windowMs = 3600_000) {
  const k = `${name}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n += 1;
  buckets.set(k, b);
  return b.n > max;
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "200kb" }));
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.get("/api/health", (req, res) => res.json({ ok: true, stub: STUB, store: storeInfo() }));
app.get("/api/stats", (req, res) => res.json(stats));

app.get("/api/config", (req, res) => {
  const f = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
  };
  res.json({ stub: STUB, firebase: f.apiKey && f.projectId ? f : null });
});

app.get("/api/emails", (req, res) => {
  res.json(ORDER.filter((id) => DEMO[id]).map((id) => DEMO[id]));
});

function resolveEmail(body) {
  const { emailId, text, subject, from, lang } = body || {};
  if (emailId && DEMO[emailId]) return DEMO[emailId]; // demo text always comes from the server
  if (typeof text !== "string" || !text.trim()) return null;
  if (text.length > 20000) throw Object.assign(new Error("Email is too long (max 20,000 characters)."), { status: 413 });
  const id = typeof emailId === "string" && /^[\w-]{1,80}$/.test(emailId)
    ? emailId
    : `pasted-${createHash("sha256").update(text).digest("hex").slice(0, 12)}`;
  const guessLang = /[぀-ヿ一-龯]/.test(text) ? "ja" : "en";
  return { id, text, subject: String(subject || "").slice(0, 300), from: String(from || "").slice(0, 300), lang: lang === "ja" || lang === "en" ? lang : guessLang };
}

app.get("/api/analysis/:emailId", async (req, res) => {
  const email = DEMO[req.params.emailId];
  if (!email) return res.status(404).json({ error: "Not found" });
  const lang = req.query.lang === "ja" || req.query.lang === "en" ? req.query.lang : email.lang;
  const saved = await getSaved(cacheKey(email, lang));
  if (!saved) return res.json({ analysis: null, cached: false });
  res.json({ analysis: saved, cached: true });
});

app.post("/api/analyze", async (req, res) => {
  stats.analyzeRequests += 1;
  try {
    const email = resolveEmail(req.body);
    if (!email) return res.status(400).json({ error: "Send an emailId of a demo email, or the email text." });
    const lang = req.body.readerLang === "ja" || req.body.readerLang === "en" ? req.body.readerLang : email.lang;
    const key = cacheKey(email, lang);
    const saved = await getSaved(key);
    if (saved && !req.body.force) { stats.cacheHits += 1; return res.json({ analysis: saved, cached: true }); }

    if (STUB) {
      if (email.id !== "northbridge-demo") return res.status(503).json({ error: "Stub mode: only the Northbridge demo has stub data. Add GEMINI_API_KEY for real analysis." });
      const a = finalize(SAMPLE, email, { lang: "en", model: "stub" });
      a.meta.source = "stub";
      return res.json({ analysis: a, cached: false });
    }

    if (limited(req.ip, "analyze", Number(process.env.ANALYZE_LIMIT_PER_HOUR || 60))) {
      return res.status(429).json({ error: "Too many analyses from this address. Please wait a while and try again." });
    }

    const { promise, joined } = once(key, async () => {
      stats.geminiCalls += 1;
      const now = new Date();
      const { raw, model, attempts } = await analyzeWithGemini(email, { lang, now });
      const a = finalize(raw, email, { lang, now, model });
      a.meta.attempts = attempts;
      await save(key, a, { persist: email.id.endsWith("-demo") });
      return a;
    });
    if (joined) stats.joinedInFlight += 1;
    const analysis = await promise;
    res.json({ analysis, cached: joined });
  } catch (err) {
    console.error("[analyze]", err.message);
    const status = err.status && err.status >= 400 && err.status < 600 ? (err.status === 404 ? 502 : err.status) : 502;
    res.status(status).json({
      error: err instanceof GeminiError
        ? "Jeri could not analyse this email right now. Nothing was guessed. Please try again."
        : err.message || "Something went wrong.",
      detail: err.message,
    });
  }
});

app.post("/api/speak", async (req, res) => {
  stats.speakRequests += 1;
  try {
    const { beats, lang, rate } = req.body || {};
    if (!Array.isArray(beats) || !beats.length || beats.length > 20) return res.status(400).json({ error: "Send 1–20 beats as [{id, text}]." });
    const clean = beats.map((b) => ({ id: String(b.id).slice(0, 20), text: String(b.text || "").slice(0, 2000) })).filter((b) => b.text.trim());
    if (STUB) return res.status(503).json({ error: "Stub mode: Cloud TTS is not configured. Add a key for real audio." });
    if (limited(req.ip, "speak", Number(process.env.SPEAK_LIMIT_PER_HOUR || 400))) {
      return res.status(429).json({ error: "Too many audio requests. Please wait a while." });
    }
    const { clips, mimes, engine } = await speakBeats(clean, { lang: lang === "ja" ? "ja" : "en", rate });
    res.json({ clips, mimes, engine });
  } catch (err) {
    console.error("[speak]", err.message);
    res.status(err instanceof TtsError ? 502 : 500).json({ error: "Audio is not available right now. You can use Captions or Easy Read.", detail: err.message });
  }
});

app.use(express.static(new URL("public/", ROOT).pathname, { extensions: ["html"], maxAge: "5m" }));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`Jeri listening on http://localhost:${port}${STUB ? " (STUB MODE)" : ""}`));
