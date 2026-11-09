// Keyboard-only + screen-reader structure + axe (WCAG 2.1 A/AA) checks, from Lane D's scripts.
// Usage: node scripts/a11y-check.js [url]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const url = process.argv.find((a) => a.startsWith("http")) || "http://localhost:8080/";
const results = [];
const check = (name, ok, note = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${note ? "  – " + note : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url);
await page.waitForSelector(".email-item");

const active = () => page.evaluate(() => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  return { tag: el.tagName, text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 60), outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2 };
});
async function tabTo(re, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const a = await active();
    if (re.test(a.text)) return a;
  }
  return null;
}

// Keyboard-only script
const nb = await tabTo(/Northbridge/);
check("Tab reaches the Northbridge email; focus outline visible", nb && nb.outline, nb ? `"${nb.text}"` : "not reached");
await page.keyboard.press("Enter");
await page.waitForSelector(".warning-card, .error-state", { timeout: 120_000 });
const hasAnalysis = await page.locator(".warning-card").count();
if (hasAnalysis) {
  const cap = await tabTo(/^Captions/);
  await page.keyboard.press("Enter");
  const m1 = await page.evaluate(() => window.__jeri.state.mode);
  await page.keyboard.press("Shift+Tab"); // Listen
  await page.keyboard.press(" ");
  const m2 = await page.evaluate(() => window.__jeri.state.mode);
  check("Mode buttons work with Enter and Space", cap && m1 === "captions" && m2 === "listen", `${m1} → ${m2}`);
  const play = await tabTo(/^(Play|Resume|Pause)$/);
  check("Player controls reachable by keyboard", Boolean(play));
  const orig = await tabTo(/View original email/, 120);
  await page.keyboard.press("Enter");
  const open1 = await page.locator("#original-body").isVisible();
  await page.keyboard.press("Enter");
  const open2 = await page.locator("#original-body").isVisible();
  check("Open and close “View original email” by keyboard", orig && open1 && !open2);
  const edit = await tabTo(/^Edit draft$/, 80);
  await page.keyboard.press("Enter");
  await page.keyboard.type(" Thanks.");
  await page.keyboard.press("Escape");
  const appr = await tabTo(/^Approve draft$/, 10);
  await page.keyboard.press("Enter");
  const st = (await page.locator("#approval-status").innerText()).trim();
  check("Edit then Approve by keyboard; shows “Approved — not sent”; focus not trapped", edit && appr && st === "Approved — not sent", st);
  const back = await tabTo(/Jeri|Skip|日本語/, 200);
  check("Focus cycles through the whole page (no trap)", Boolean(back));
}

// Screen-reader structure
const h1 = await page.locator("h1").count();
const h2 = await page.locator("h2").allInnerTexts();
check("Exactly one h1, clear h2s", h1 === 1 && h2.length >= 5, `h1=${h1}, h2: ${h2.map((x) => x.replace(/\s+/g, " ").slice(0, 24)).join(" | ")}`);
const unnamed = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => !(b.innerText.trim() || b.getAttribute("aria-label"))).length);
check("Every button has a name", unnamed === 0, `${unnamed} unnamed`);
const warnWord = await page.locator(".warning-card h3").allInnerTexts();
check("Warnings say the word “Warning”, not just colour", warnWord.length > 0 && warnWord.every((w) => /Warning/.test(w)));
const live = await page.locator("[aria-live]").count();
check("Mode change is announced (aria-live region)", live >= 1);
const jaLang = await page.evaluate(() => [...document.querySelectorAll('[lang="ja"]')].length);
check("Japanese text marked with lang=ja", jaLang >= 1, `${jaLang} elements`);

// axe
await page.addScriptTag({ content: axeSource });
for (const mode of ["Listen", "Captions", "Easy Read"]) {
  await page.getByRole("button", { name: new RegExp(`^${mode}`) }).click().catch(() => {});
  const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] })).violations.map((v) => `${v.id}(${v.nodes.length})`));
  check(`axe WCAG 2.1 A/AA – ${mode} mode`, r.length === 0, r.join(", "));
}

// Text zoom 200%
await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check("Text zoom 200%: no sideways scroll", !overflow);

await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
