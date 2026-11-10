// CORE gate (team plan, section 3), automated with Playwright.
// Usage: node scripts/core-gate.js [url]            -> real gate, nothing mocked
//        node scripts/core-gate.js [url] --mock-audio -> checks the UI mechanics only (NOT a CORE pass)
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = await import("playwright")); }

const url = process.argv.find((a) => a.startsWith("http")) || "http://localhost:8080/";
const MOCK = process.argv.includes("--mock-audio");
const results = [];
const check = (name, ok, note = "") => { results.push({ name, ok: Boolean(ok), note }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${note ? "  – " + note : ""}`); };

function toneWavBase64(seconds = 1.2) {
  const rate = 8000, n = Math.floor(rate * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(i / 8) * 3000), 44 + i * 2);
  return buf.toString("base64");
}

const browser = await chromium.launch({ args: ["--autoplay-policy=user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const requests = [];
page.on("request", (r) => { if (r.url().includes("/api/")) requests.push(r.url()); });
if (MOCK) {
  const wav = toneWavBase64();
  await page.route("**/api/speak", async (route) => {
    const { beats } = route.request().postDataJSON();
    await route.fulfill({ json: { clips: Object.fromEntries(beats.map((b) => [b.id, wav])), mimes: Object.fromEntries(beats.map((b) => [b.id, "audio/wav"])), engine: "MOCK", mocked: true } });
  });
}
const S = () => page.evaluate(() => window.__jeri.state);
const audioState = () => page.evaluate(() => { const a = document.getElementById("audio"); return { paused: a.paused, t: a.currentTime, beat: a.dataset.beat || null, src: Boolean(a.getAttribute("src")) }; });

try {
  await page.goto(url);
  const t0 = Date.now();
  await page.getByRole("button", { name: /Northbridge/ }).click();
  const resp = await page.waitForResponse((r) => r.url().includes("/api/analyze"), { timeout: 15_000 }).catch(() => null);
  await page.waitForSelector(".warning-card, .error-state", { timeout: 240_000 });
  let body = resp ? await resp.json().catch(() => null) : null;
  if (!body?.analysis) {
    // Already analysed earlier: the page used the saved Gemini result (no new Gemini call needed).
    body = await page.evaluate(() => fetch("/api/analysis/northbridge-demo").then((r) => r.json()));
    if (body) body.cached = true;
  }
  const source = body?.analysis?.meta?.source;
  check("1. Paste/select Northbridge → REAL Gemini returns the JSON", source === "gemini",
    `source=${source || "none"} model=${body?.analysis?.meta?.model || "-"} ${body?.cached ? "(saved result)" : `(${Math.round((Date.now() - t0) / 1000)}s)`}${body?.error ? " error=" + body.error : ""}`);

  const a = body?.analysis;
  const risks = a?.risks || [];
  const ww = risks.filter((r) => r.type === "wrong_weekday" && r.certainty === "checked_in_code");
  const late = risks.filter((r) => r.type === "deadline_after_event" && r.certainty === "checked_in_code");
  const cards = await page.locator(".warning-card").allInnerTexts();
  check("2. Warning cards show both weekday mismatches + late deadline, checked in code",
    ww.length === 2 && late.length === 1 && cards.some((c) => /Thursday/.test(c) && /12 November/.test(c)) && cards.some((c) => /13 November 2026 is a Friday/.test(c)),
    `wrong_weekday=${ww.length} deadline_after_event=${late.length} cards=${cards.length}`);

  // 3. Listen: no autoplay, then play, pause, resume.
  const before = await audioState();
  const noAutoplay = before.paused && !before.src;
  const speakBefore = requests.filter((r) => r.includes("/api/speak")).length;
  await page.locator("#btn-play").click();
  const speakResp = await page.waitForResponse((r) => r.url().includes("/api/speak"), { timeout: 180_000 }).catch(() => null);
  const speakJson = speakResp ? await speakResp.json().catch(() => ({})) : {};
  await page.waitForFunction(() => { const a = document.getElementById("audio"); return !a.paused && a.currentTime > 0.2; }, null, { timeout: 120_000 }).catch(() => {});
  const playing = await audioState();
  await page.locator("#btn-play").click(); // pause
  const paused = await audioState();
  await page.waitForTimeout(300);
  const label = (await page.locator("#btn-play").innerText()).trim();
  await page.locator("#btn-play").click(); // resume
  await page.waitForTimeout(400);
  const resumed = await audioState();
  const realAudio = speakResp?.ok() && !speakJson.mocked && Object.keys(speakJson.clips || {}).length >= 1 && /gemini|cloud/.test(speakJson.engine || "");
  check(`3. Listen plays ${MOCK ? "MOCKED" : "real TTS (" + (speakJson.engine || "?") + ")"} audio; play, pause, resume work`,
    noAutoplay && speakBefore === 0 && (MOCK || realAudio) && !playing.paused && paused.paused && /Resume/.test(label) && !resumed.paused && resumed.beat === paused.beat && resumed.t >= paused.t,
    `noAutoplay=${noAutoplay} clips=${Object.keys(speakJson.clips || {}).length} playing=${!playing.paused} paused=${paused.paused} label="${label}" resumedSameBeat=${resumed.beat === paused.beat}`);

  // Move to the first warning beat, then switch to Captions while playing.
  await page.locator("#btn-play").click(); // pause again
  const beats = a?.spokenBeats || [];
  const target = Math.max(0, beats.findIndex((b) => b.kind === "risk"));
  for (let i = (await S()).currentBeatIndex; i < target; i++) await page.locator("#btn-next").click();
  await page.locator("#btn-play").click(); // play from the warning beat
  await page.waitForTimeout(300);
  const idxBefore = (await S()).currentBeatIndex;
  const reqBeforeSwitch = requests.length;
  await page.getByRole("button", { name: /Captions/ }).click();
  await page.waitForTimeout(250);
  const capState = await S();
  const capAudio = await audioState();
  const capText = await page.locator("#cap-current").innerText();
  await page.getByRole("button", { name: /Easy Read/ }).click();
  await page.waitForTimeout(250);
  const easy = await page.locator(".easy-cards").innerText();
  check("4. Captions stops audio, shows the same beat; Easy Read shows the same facts",
    capAudio.paused && !capState.isPlaying && capState.currentBeatIndex === idxBefore && capText.includes(beats[idxBefore]?.text || "@@") &&
      /NOT/.test(easy) && /Thursday|Friday/.test(easy),
    `audioPaused=${capAudio.paused} beat ${idxBefore}→${capState.currentBeatIndex} easyHasNOT=${/NOT/.test(easy)}`);

  // 5. Draft Dock
  await page.getByRole("button", { name: "Approve draft" }).click();
  const st1 = (await page.locator("#approval-status").innerText()).trim();
  await page.getByRole("button", { name: /Listen/ }).first().click();
  await page.getByRole("button", { name: /Captions/ }).click();
  const st2 = (await page.locator("#approval-status").innerText()).trim();
  await page.getByRole("button", { name: "Edit draft" }).click();
  await page.locator("#draft-editor").press("End");
  await page.locator("#draft-editor").type(" ");
  const st3 = (await page.locator("#approval-status").innerText()).trim();
  const s3 = await S();
  check("5. Draft Dock: Approve → “Approved — not sent”; mode switch keeps it; Edit clears it",
    st1 === "Approved — not sent" && st2 === "Approved — not sent" && st3 === "Not approved yet" && s3.approvalState === "none",
    `after approve="${st1}" after switch="${st2}" after edit="${st3}"`);

  const switchCalls = requests.slice(reqBeforeSwitch).filter((r) => /\/api\/(analyze|speak)/.test(r));
  check("Extra: mode switches made zero server calls", switchCalls.length === 0, `${switchCalls.length} calls`);
  check("Extra: no page errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  check("Gate ran to the end", false, e.message);
} finally {
  await browser.close();
}
const pass = results.every((r) => r.ok);
console.log(pass ? (MOCK ? "\nUI mechanics OK (audio mocked – this is NOT a CORE ✅)" : "\nCORE ✅") : "\nCORE ❌ – fix the FAIL lines above");
process.exit(pass ? 0 : 1);
