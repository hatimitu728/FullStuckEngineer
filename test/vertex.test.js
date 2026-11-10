// Vertex AI mode: Gemini via aiplatform with a Bearer token (no API key), Cloud TTS with the same token.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const sample = readFileSync(new URL("../fixtures/sample-northbridge.json", import.meta.url), "utf8");
const seen = [];
let srv;
before(async () => {
  srv = createServer((req, res) => {
    let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
      seen.push({ url: req.url, auth: req.headers.authorization, key: req.headers["x-goog-api-key"], body: JSON.parse(b || "{}") });
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url.includes(":generateContent")) res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: sample }] } }] }));
      else res.end(JSON.stringify({ audioContent: "SUQz" }));
    });
  }).listen(0);
  await new Promise((r) => srv.once("listening", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  Object.assign(process.env, {
    GEMINI_BACKEND: "vertex", GOOGLE_CLOUD_PROJECT: "demo-proj", GOOGLE_ACCESS_TOKEN: "tok123",
    VERTEX_API_BASE: base, CLOUD_TTS_BASE: base, GEMINI_API_KEY: "",
  });
});
after(() => srv.close());

test("Vertex: Gemini call goes to aiplatform with a Bearer token, no API key", async () => {
  const { analyzeWithGemini } = await import("../server/gemini.js");
  const email = JSON.parse(readFileSync(new URL("../fixtures/emails/northbridge.json", import.meta.url), "utf8"));
  const { raw, model } = await analyzeWithGemini(email, { lang: "en" });
  assert.equal(model, "gemini-3.5-flash");
  assert.equal(raw.evidence.length, 5);
  const call = seen.find((c) => c.url.includes(":generateContent"));
  assert.equal(call.url, "/v1/projects/demo-proj/locations/global/publishers/google/models/gemini-3.5-flash:generateContent");
  assert.equal(call.auth, "Bearer tok123");
  assert.equal(call.key, undefined);
  assert.ok(call.body.generationConfig.responseSchema);
});

test("Vertex: Listen uses Cloud TTS with the same token (Chirp 3 HD voice first)", async () => {
  const { speakBeats } = await import("../server/tts.js");
  const r = await speakBeats([{ id: "S1", text: "You need to reply." }], { lang: "en" });
  assert.equal(r.clips.S1, "SUQz");
  assert.match(r.engine, /cloud-tts en-US-Chirp3-HD-Sulafat/);
  const call = seen.find((c) => c.url === "/v1/text:synthesize");
  assert.equal(call.auth, "Bearer tok123");
  assert.equal(call.body.voice.name, "en-US-Chirp3-HD-Sulafat");
});
