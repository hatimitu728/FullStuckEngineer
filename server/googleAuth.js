// Access token for Google APIs when running on Google Cloud (Cloud Run): the service account's
// token from the metadata server. No API key needed; usage is billed to the project (credits apply).
let cached = { token: "", exp: 0 };

export const VERTEX = process.env.GEMINI_BACKEND === "vertex";
export const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIRESTORE_PROJECT_ID || "";

export async function accessToken() {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN; // tests / local
  if (cached.token && Date.now() < cached.exp) return cached.token;
  const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
    headers: { "Metadata-Flavor": "Google" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Could not get a Google access token (${res.status}). Is this running on Cloud Run?`);
  const j = await res.json();
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1000 };
  return cached.token;
}
