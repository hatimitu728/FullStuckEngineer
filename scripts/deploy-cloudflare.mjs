// Deploy Jeri to Cloudflare Workers (free plan). Works on Windows, macOS, Linux.
// Usage:  npm run deploy:cf            (optional: npm run deploy:cf -- jeri.example.com  for your own subdomain)
// You need: Node.js 20+, a Cloudflare account, and a FREE Gemini API key from AI Studio
// (a project WITHOUT billing – keys from billed projects fail with "402 prepayment credits depleted").
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const run = (args, opts = {}) => spawnSync(npx, ["wrangler", ...args], { encoding: "utf8", shell: process.platform === "win32", ...opts });
const step = (n, t) => console.log(`\n== ${n} ${t}`);
const fail = (msg) => { console.error(`\n❌ ${msg}`); process.exit(1); };

step("1/5", "Cloudflare ログイン確認 / checking login");
let who = run(["whoami"]);
if (!/You are logged in|associated with the email/i.test(who.stdout + who.stderr)) {
  console.log("ブラウザが開くので Cloudflare にログインして「Allow」を押してください / a browser will open: log in and click Allow");
  if (run(["login"], { stdio: "inherit" }).status !== 0) fail("ログインできませんでした / login failed");
}

step("2/5", "KV (保存場所) を用意 / preparing KV storage");
let toml = readFileSync("wrangler.toml", "utf8");
if (!/^\[\[kv_namespaces\]\]/m.test(toml)) {
  const list = run(["kv", "namespace", "list"]);
  let id = null;
  try { id = JSON.parse(list.stdout).find((n) => /JERI_KV/.test(n.title))?.id; } catch {}
  if (!id) {
    const created = run(["kv", "namespace", "create", "JERI_KV"]);
    id = /"?id"?\s*[:=]\s*"([0-9a-f]{32})"/.exec(created.stdout + created.stderr)?.[1];
  }
  if (!id) console.log("   ⚠ KV を作れませんでした（KV なしで続けます）/ could not create KV, continuing without it");
  else {
    toml += `\n[[kv_namespaces]]\nbinding = "JERI_KV"\nid = "${id}"\n`;
    console.log(`   KV id: ${id}  (wrangler.toml に追加しました。git commit して push すると Cloudflare の自動ビルドでも使われます)`);
  }
} else console.log("   already set (ok)");

const domain = process.argv[2];
if (domain && !toml.includes(`pattern = "${domain}"`)) {
  toml += `\nroutes = [{ pattern = "${domain}", custom_domain = true }]\n`;
  console.log(`   custom domain: https://${domain}`);
}
writeFileSync("wrangler.toml", toml);

step("3/5", "Gemini API キーを Secret に保存 / saving the Gemini key as a secret");
const secrets = run(["secret", "list"]);
if (/GEMINI_API_KEY/.test(secrets.stdout)) console.log("   already saved (ok). 変更するには: npx wrangler secret put GEMINI_API_KEY");
else {
  console.log("   キーを貼り付けて Enter（画面には出ません）/ paste the key and press Enter");
  if (run(["secret", "put", "GEMINI_API_KEY"], { stdio: "inherit" }).status !== 0) {
    console.log("   (Worker がまだないので、先にデプロイしてからもう一度保存します / will retry after the first deploy)");
  }
}

step("4/5", "デプロイ / deploying");
const dep = run(["deploy"], { stdio: ["inherit", "pipe", "inherit"] });
process.stdout.write(dep.stdout || "");
if (dep.status !== 0) fail("デプロイに失敗しました。上のエラーを Claude に貼ってください（キーは貼らないで）");
if (!/GEMINI_API_KEY/.test(run(["secret", "list"]).stdout)) {
  console.log("   キーを貼り付けて Enter / paste the key and press Enter");
  run(["secret", "put", "GEMINI_API_KEY"], { stdio: "inherit" });
}

step("5/5", "確認 / checking");
const url = domain ? `https://${domain}` : /https:\/\/[\w.-]+\.workers\.dev/.exec(dep.stdout || "")?.[0];
if (url) {
  try {
    const h = await (await fetch(`${url}/api/health`)).json();
    console.log(`\n✅ Live URL: ${url}\n   Health: ${JSON.stringify(h)}`);
    if (!h.key) console.log("   ⚠ key=false → npx wrangler secret put GEMINI_API_KEY を実行してください");
  } catch { console.log(`\n✅ Live URL: ${url}  (数十秒後に開いてください / open it in a few seconds)`); }
} else console.log("\n✅ デプロイ完了。上の出力の https://….workers.dev が Live URL です。");
