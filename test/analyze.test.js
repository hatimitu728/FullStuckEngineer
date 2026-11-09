// End-to-end /api/analyze against a fake Gemini server: retry on a non-exact quote,
// code date check, caching and the in-flight guard (one Gemini call for concurrent requests).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const sample = JSON.parse(readFileSync(new URL("../fixtures/sample-northbridge.json", import.meta.url)));
let geminiCalls = 0;
let fake, app;
const APP_PORT = 18099;

before(async () => {
  fake = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      geminiCalls += 1;
      const parsed = JSON.parse(body);
      const isRetry = parsed.contents.length > 1;
      const out = structuredClone(sample);
      // First answer has a paraphrased quote → server must retry once.
      if (!isRetry) out.evidence[0].quote = "Please confirm attendance by Thursday";
      // Gemini claims a wrong weekday; code must ignore it.
      out.risks = [{ id: "R1", type: "wrong_weekday", originalSays: "x", checkFound: "12 November is a Monday", nextStep: "", evidenceIds: [] }];
      setTimeout(() => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }));
      }, 200);
    });
  }).listen(0);
  await new Promise((r) => fake.once("listening", r));
  app = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: String(APP_PORT), GEMINI_API_BASE: `http://127.0.0.1:${fake.address().port}`, GEMINI_API_KEY: "test", GEMINI_MODEL: "fake-model", JERI_STUB: "", NODE_USE_ENV_PROXY: "" },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://127.0.0.1:${APP_PORT}/api/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});
after(() => { app?.kill(); fake?.close(); });

const post = (body) => fetch(`http://127.0.0.1:${APP_PORT}/api/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

test("concurrent requests share one Gemini run; retry fixes the quote; code owns the dates", async () => {
  const [a, b] = await Promise.all([post({ emailId: "northbridge-demo" }), post({ emailId: "northbridge-demo" })]);
  assert.equal(geminiCalls, 2, "one first call + one retry, not two runs");
  assert.equal(a.analysis.meta.source, "gemini");
  assert.equal(a.analysis.meta.attempts, 2);
  assert.equal(b.cached, true);
  assert.equal(a.analysis.evidence.length, 5, "retried answer has all exact quotes");
  const types = a.analysis.risks.map((r) => r.type).sort();
  assert.deepEqual(types, ["deadline_after_event", "wrong_weekday", "wrong_weekday"]);
  assert.ok(!JSON.stringify(a.analysis.risks).includes("Monday"));
});

test("a later request is served from the saved result (no Gemini call)", async () => {
  const before = geminiCalls;
  const c = await post({ emailId: "northbridge-demo" });
  assert.equal(c.cached, true);
  assert.equal(geminiCalls, before);
  const saved = await fetch(`http://127.0.0.1:${APP_PORT}/api/analysis/northbridge-demo`).then((r) => r.json());
  assert.equal(saved.analysis.emailId, "northbridge-demo");
});

test("bad requests get a clear error", async () => {
  const r = await post({});
  assert.match(r.error, /emailId|text/);
});
