// Shared recorder: real browser, live site, 1920x1080 frames (1280x720 CSS px at 1.5x), visible cursor dot,
// and a log of the page's own audio events so the real app audio can be laid back onto the silent screen capture.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readdirSync, renameSync } from "node:fs";

export const W = 1920, H = 1080, ZOOM = 1.5; // true 1080p frames; the page is shown at 150% zoom for readability
export async function startTake(outDir, name, url) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ["--autoplay-policy=user-gesture-required", "--force-color-profile=srgb"] });
  const context = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "en-GB", timezoneId: "Asia/Tokyo",
    recordVideo: { dir: `${outDir}/_raw_${name}`, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(() => {
    window.__ev = []; window.__src = {};
    document.addEventListener("DOMContentLoaded", () => {
      document.body.style.zoom = "1.5"; // readable zoom, like pressing Ctrl + in a browser
      const c = document.createElement("div");
      c.setAttribute("aria-hidden", "true");
      c.style.cssText = "position:fixed;left:-50px;top:-50px;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(180,83,9,.30);border:3px solid #B45309;z-index:99999;pointer-events:none;transition:transform 120ms";
      document.documentElement.appendChild(c); // outside the zoomed body, so it follows the real pointer
      addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
      addEventListener("mousedown", () => { c.style.transform = "scale(.6)"; }, true);
      addEventListener("mouseup", () => { c.style.transform = "scale(1)"; }, true);
      const a = document.getElementById("audio");
      if (a) {
        const log = (ev) => {
          const key = a.dataset.beat || "DRAFT";
          if (ev === "play" && !window.__src[key]) window.__src[key] = a.src;
          window.__ev.push({ ev, key, t: Date.now(), ct: a.currentTime });
        };
        a.addEventListener("playing", () => log("play"));
        a.addEventListener("pause", () => log("pause"));
        a.addEventListener("ended", () => log("end"));
      }
    });
  });
  const page = await context.newPage();
  const t0 = Date.now();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cues = [];
  const now = () => (Date.now() - t0) / 1000;
  const cue = (id) => { cues.push({ id, t: now() }); };
  const wait = (ms) => page.waitForTimeout(ms);
  async function moveTo(loc, { block = "center" } = {}) {
    await loc.evaluate((el, b) => el.scrollIntoView({ block: b, behavior: "smooth" }), block);
    await wait(650);
    const b = await loc.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 60), { steps: 24 });
    await wait(300);
  }
  async function click(loc, opts) { await moveTo(loc, opts); await page.mouse.down(); await wait(90); await page.mouse.up(); await wait(350); }
  async function scrollTo(loc, block = "start", offset = -16) {
    await loc.evaluate((el, b) => el.scrollIntoView({ block: b, behavior: "instant" }), block);
    if (block === "start" && offset) await page.mouse.wheel(0, offset * ZOOM);
    await wait(700);
  }
  async function finish(extra = {}) {
    const ev = await page.evaluate(() => window.__ev).catch(() => []);
    const src = await page.evaluate(() => window.__src).catch(() => ({}));
    const state = await page.evaluate(() => window.__jeri?.state).catch(() => null);
    await context.close(); await browser.close();
    const raw = readdirSync(`${outDir}/_raw_${name}`).find((f) => f.endsWith(".webm"));
    renameSync(`${outDir}/_raw_${name}/${raw}`, `${outDir}/${name}.webm`);
    const clips = {};
    for (const [k, s] of Object.entries(src)) {
      const m = /^data:([^;]+);base64,(.*)$/s.exec(s);
      if (!m) continue;
      clips[k] = `${outDir}/${name}_${k}.${/wav|l16/i.test(m[1]) ? "wav" : "mp3"}`;
      writeFileSync(clips[k], Buffer.from(m[2], "base64"));
    }
    const segs = [];
    for (let i = 0; i < ev.length; i++) {
      if (ev[i].ev !== "play") continue;
      const stop = ev.slice(i + 1).find((e) => e.key === ev[i].key && (e.ev === "pause" || e.ev === "end"));
      segs.push({ key: ev[i].key, start: (ev[i].t - t0) / 1000, offset: ev[i].ct, dur: stop ? (stop.t - ev[i].t) / 1000 : 8, file: clips[ev[i].key] });
    }
    const meta = { name, url, cues, audio: segs, state, errors, ...extra };
    writeFileSync(`${outDir}/${name}.json`, JSON.stringify(meta, null, 2));
    return meta;
  }
  return { page, cue, now, wait, moveTo, click, scrollTo, finish, errors };
}
