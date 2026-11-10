// Cache keys shared by the Node server and the Cloudflare Worker.
import { createHash } from "node:crypto";

export const ANALYSIS_VERSION = "v3";

export function cacheKey(email, lang) {
  const h = createHash("sha256").update(email.text).digest("hex").slice(0, 16);
  return `${email.id}__${lang}__${h}__${ANALYSIS_VERSION}`.replace(/[^\w-]/g, "_");
}
