// Analyse once per email: cache by email ID + content hash (memory, plus Firestore when configured)
// and an in-flight guard so a second request never starts a second Gemini call.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

// Optional local disk cache (for running Jeri on a laptop without Firestore).
const DIR = process.env.JERI_CACHE_DIR || "";
if (DIR) mkdirSync(DIR, { recursive: true });
const diskPath = (k) => `${DIR}/${k.replace(/[^\w-]/g, "_")}.json`;
const diskGet = (k) => { try { return DIR && existsSync(diskPath(k)) ? JSON.parse(readFileSync(diskPath(k), "utf8")) : null; } catch { return null; } };
const diskSet = (k, v) => { try { if (DIR) writeFileSync(diskPath(k), JSON.stringify(v)); } catch (e) { console.warn("[store] disk write failed:", e.message); } };

export const ANALYSIS_VERSION = "v3";
const memory = new Map();
const inFlight = new Map();
let firestore = null;
let firestoreError = null;

async function db() {
  const projectId = process.env.FIRESTORE_PROJECT_ID;
  if (!projectId || firestoreError) return null;
  if (firestore) return firestore;
  try {
    const { Firestore } = await import("@google-cloud/firestore");
    firestore = new Firestore({ projectId, ignoreUndefinedProperties: true });
    return firestore;
  } catch (e) {
    firestoreError = e;
    console.warn("[store] Firestore unavailable, using memory only:", e.message);
    return null;
  }
}

export function cacheKey(email, lang) {
  const h = createHash("sha256").update(email.text).digest("hex").slice(0, 16);
  return `${email.id}__${lang}__${h}__${ANALYSIS_VERSION}`.replace(/[^\w-]/g, "_");
}

export async function getSaved(key) {
  if (memory.has(key)) return memory.get(key);
  const local = diskGet(key);
  if (local) { memory.set(key, local); return local; }
  const d = await db();
  if (!d) return null;
  try {
    const snap = await d.collection("analyses").doc(key).get();
    if (!snap.exists) return null;
    const a = JSON.parse(snap.data().json);
    memory.set(key, a);
    return a;
  } catch (e) {
    console.warn("[store] Firestore read failed:", e.message);
    return null;
  }
}

export async function save(key, analysis, { persist = true } = {}) {
  memory.set(key, analysis);
  if (!persist) return;
  diskSet(key, analysis);
  const d = await db();
  if (!d) return;
  try {
    // Stored as a JSON string: Firestore does not allow nested arrays (evidence offsets).
    await d.collection("analyses").doc(key).set({
      emailId: analysis.emailId,
      lang: analysis.lang,
      json: JSON.stringify(analysis),
      savedAt: new Date(),
    });
  } catch (e) {
    console.warn("[store] Firestore write failed:", e.message);
  }
}

/** Run fn once per key at a time; concurrent callers share the same promise. */
export function once(key, fn) {
  if (inFlight.has(key)) return { promise: inFlight.get(key), joined: true };
  const p = (async () => { try { return await fn(); } finally { inFlight.delete(key); } })();
  inFlight.set(key, p);
  return { promise: p, joined: false };
}

export function storeInfo() {
  return { firestore: Boolean(process.env.FIRESTORE_PROJECT_ID) && !firestoreError, memoryEntries: memory.size };
}

/** Small binary-ish blobs (TTS clips) by key: memory is the caller's job; this is the Firestore layer. */
export async function getBlob(key) {
  const local = diskGet(key);
  if (local) return local;
  const d = await db();
  if (!d) return null;
  try {
    const snap = await d.collection("blobs").doc(key).get();
    return snap.exists ? JSON.parse(snap.data().json) : null;
  } catch (e) { console.warn("[store] blob read failed:", e.message); return null; }
}
export async function saveBlob(key, value) {
  diskSet(key, value);
  const d = await db();
  if (!d) return;
  const json = JSON.stringify(value);
  if (json.length > 900_000) return; // Firestore document limit is 1 MiB
  try { await d.collection("blobs").doc(key).set({ json, savedAt: new Date() }); }
  catch (e) { console.warn("[store] blob write failed:", e.message); }
}
