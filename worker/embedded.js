// Same Worker, with the page files built in (no separate asset upload).
// Used for direct API-token deploys: npx wrangler deploy -c <config with main = "worker/embedded.js">
import api from "./index.js";
import html from "../public/index.html";
import css from "../public/styles.css";
import appJs from "../public/app.js";
import firebaseJs from "../public/firebase.js";

const FILES = {
  "/": [html, "text/html; charset=utf-8"],
  "/index.html": [html, "text/html; charset=utf-8"],
  "/styles.css": [css, "text/css; charset=utf-8"],
  "/app.js": [appJs, "text/javascript; charset=utf-8"],
  "/firebase.js": [firebaseJs, "text/javascript; charset=utf-8"],
};

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    const f = FILES[pathname];
    if (f) return new Response(f[0], { headers: { "content-type": f[1], "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
    if (pathname.startsWith("/api/")) return api.fetch(request, env, ctx);
    return new Response("Not found", { status: 404 });
  },
};
