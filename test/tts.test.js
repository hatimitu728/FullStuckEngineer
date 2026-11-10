// Gemini TTS response parsing and Cloud TTS fallback, against fake servers.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

let geminiMode = "ok";
const seen = { gemini: [], cloud: 0 };
let gem, cloud;
const listen = (srv) => new Promise((r) => srv.listen(0, () => r(srv.address().port)));

before(async () => {
  gem = createServer((req, res) => {
    let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
      seen.gemini.push({ url: req.url, body: JSON.parse(b), key: req.headers["x-goog-api-key"] });
      if (geminiMode === "fail") { res.writeHead(400, { "content-type": "application/json" }); res.end('[{"error":{"code":400,"message":"model not available"}}]'); return; }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ steps: [
        { type: "user_input" },
        { type: "model_output", content: [{ type: "text", text: "ok" }, { type: "audio", mime_type: "audio/wav", data: "UklGRg==" }] },
      ] }));
    });
  });
  cloud = createServer((req, res) => {
    let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
      seen.cloud += 1;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ audioContent: "SUQz" }));
    });
  });
  process.env.GEMINI_API_BASE = `http://127.0.0.1:${await listen(gem)}`;
  process.env.CLOUD_TTS_BASE = `http://127.0.0.1:${await listen(cloud)}`;
  process.env.GEMINI_API_KEY = "test";
});
after(() => { gem.close(); cloud.close(); });

test("Gemini 3.8 Flash TTS: request shape, audio found in steps, WAV mime passed on", async () => {
  const { speakBeats } = await import(`../server/tts.js?ok`);
  const r = await speakBeats([{ id: "S1", text: "Warning. <Check> the date." }], { lang: "en", rate: 0.8 });
  assert.equal(r.clips.S1, "UklGRg==");
  assert.equal(r.mimes.S1, "audio/wav");
  assert.match(r.engine, /gemini-3\.8-flash-tts/);
  const call = seen.gemini.at(-1);
  assert.equal(call.url, "/v1beta/interactions");
  assert.equal(call.body.model, "gemini-3.8-flash-tts");
  assert.deepEqual(call.body.response_format, { type: "audio" });
  assert.equal(call.body.generation_config.speech_config[0].voice, "Sulafat");
  const t = call.body.input[0].content[0];
  assert.ok(!/[<>]/.test(t.text), "angle brackets removed (they are vocal tags)");
  assert.match(t.annotations[0].style, /slowly/);
});

test("falls back to Cloud TTS when Gemini TTS fails", async () => {
  geminiMode = "fail";
  const { speakBeats } = await import(`../server/tts.js?fail`);
  const r = await speakBeats([{ id: "S2", text: "Fallback please." }], { lang: "ja" });
  assert.equal(r.clips.S2, "SUQz");
  assert.equal(r.mimes.S2, "audio/mpeg");
  assert.equal(r.engine, "cloud-tts-standard");
  assert.equal(seen.cloud, 1);
});

test("retryDelayMs reads seconds, minutes and hours; pcmToWav adds a WAV header", async () => {
  const { retryDelayMs, pcmToWav } = await import(`../server/tts.js?util`);
  assert.equal(retryDelayMs("Please retry in 26s or upgrade"), 26_500);
  assert.equal(retryDelayMs("Please retry in 3h7m15s or upgrade"), (3 * 3600 + 7 * 60 + 15) * 1000 + 500);
  assert.equal(retryDelayMs("Please retry in 5.2s."), 5_700);
  const wav = Buffer.from(pcmToWav(Buffer.alloc(480).toString("base64"), "audio/L16;codec=pcm;rate=24000"), "base64");
  assert.equal(wav.subarray(0, 4).toString(), "RIFF");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.length, 44 + 480);
});
