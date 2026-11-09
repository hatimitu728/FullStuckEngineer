// Firebase Auth (Google sign-in, Gmail read-only scope) + Firestore (drafts and approvals per user).
// Loaded only when the server provides a Firebase web config.
const V = "10.14.1";
let auth, db, mod = {};

export async function init(config) {
  const [{ initializeApp }, a, f] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  mod = { ...a, ...f };
  const app = initializeApp(config);
  auth = a.getAuth(app);
  db = f.getFirestore(app);
}

export function onUser(cb) { return mod.onAuthStateChanged(auth, cb); }

export async function signIn() {
  const provider = new mod.GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/gmail.readonly"); // read-only. Jeri never sends mail.
  const result = await mod.signInWithPopup(auth, provider);
  const cred = mod.GoogleAuthProvider.credentialFromResult(result);
  return { user: result.user, token: cred?.accessToken };
}

export function signOut() { return mod.signOut(auth); }

function b64urlToText(data) {
  const bin = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}
function findPart(part, type) {
  if (!part) return null;
  if (part.mimeType === type && part.body?.data) return part;
  for (const p of part.parts || []) { const f = findPart(p, type); if (f) return f; }
  return null;
}
function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body?.innerText || doc.body?.textContent || "";
}

/** Latest inbox messages as plain text. Read-only. */
export async function listGmail(token, max = 10) {
  if (!token) throw new Error("Google did not return a Gmail access token. Please sign in again.");
  const H = { Authorization: `Bearer ${token}` };
  const list = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&labelIds=INBOX`, { headers: H });
  if (!list.ok) throw new Error(`Gmail list failed (${list.status}). Is your account a test user of this app?`);
  const { messages = [] } = await list.json();
  const out = [];
  for (const m of messages) {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, { headers: H });
    if (!r.ok) continue;
    const msg = await r.json();
    const hdr = (n) => msg.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value || "";
    const plain = findPart(msg.payload, "text/plain");
    const html = plain ? null : findPart(msg.payload, "text/html");
    let text = plain ? b64urlToText(plain.body.data) : html ? htmlToText(b64urlToText(html.body.data)) : (msg.snippet || "");
    text = text.replace(/\r\n/g, "\n").trim().slice(0, 20000);
    if (!text) continue;
    out.push({
      id: `gmail-${m.id}`,
      from: hdr("from") || "(unknown sender)",
      subject: hdr("subject"),
      receivedAt: new Date(Number(msg.internalDate)).toISOString(),
      lang: /[぀-ヿ一-龯]/.test(text) ? "ja" : "en",
      text,
    });
  }
  return out;
}

export async function saveDraft(uid, emailId, data) {
  await mod.setDoc(mod.doc(db, "users", uid, "drafts", emailId), { ...data, updatedAt: mod.serverTimestamp() }, { merge: true });
}
export async function loadDraft(uid, emailId) {
  const s = await mod.getDoc(mod.doc(db, "users", uid, "drafts", emailId));
  return s.exists() ? s.data() : null;
}
