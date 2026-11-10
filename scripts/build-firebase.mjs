// Build the Firebase Hosting folder: the same page files as public/, plus one <meta> tag that tells
// the page where the API server is. Run automatically by `firebase deploy` (see firebase.json).
import { cpSync, rmSync, readFileSync, writeFileSync } from "node:fs";
const API = process.env.JERI_API_BASE || "https://jeri.fullstuckengineer.workers.dev";
rmSync("dist-firebase", { recursive: true, force: true });
cpSync("public", "dist-firebase", { recursive: true });
const html = readFileSync("dist-firebase/index.html", "utf8");
if (!html.includes('<meta charset="utf-8">')) throw new Error("index.html: <meta charset> not found");
writeFileSync("dist-firebase/index.html", html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <meta name="jeri-api-base" content="${API}">`));
console.log(`dist-firebase/ ready (API: ${API})`);
