# Jeri

**Jeri reads one email once and gives you the same facts three ways — Listen, Captions and Easy Read — so you can find the ask, check the dates, and choose your next step.**

Built for DevFest GDGoC Japan Hackathon 2026 · Theme: *“Own the Why, Build with intent.”* · Team FullStuckEngineer

- **Live URL:** _(added after deploy)_
- **Demo email:** “Northbridge” is fictional EXAMPLE DATA. No real inboxes or personal data are used.

## Why

Tinish juggles school, clubs, part-time work and interviews. Long walls of AI-written text arrive every day, and with dyslexia that means rereading again and again to find the actual request.

Jeri is for **people who cannot skim**: dyslexic, blind or low-vision, and Deaf or hard-of-hearing readers. It does not shorten the email. It keeps the meaning, points every fact back to the original sentence, and leaves the decision to you.

## What it does

1. **One email** (demo inbox, pasted, or Gmail read-only when signed in).
2. **Gemini reads it once** with a strict JSON schema: the ask, evidence quotes (E1, E2…), dates as written, junk, spoken beats, easy-read cards, a draft reply.
3. **Code checks every date.** The server parses each date *as written*, computes the real weekday in Japan time, and reports mismatches and “deadline after the event”. Gemini never decides a weekday. The original text is never changed.
4. **One shared result, three modes on one screen:**
   | Mode | What you get |
   |---|---|
   | Listen | Gemini 3.8 Flash TTS reads the spoken beats (one clip per beat; Cloud TTS fallback). No autoplay. Play, pause, resume, previous, next. Current sentence highlighted. |
   | Captions | Exactly the same beats, same order, no sound needed. Warnings shown with icon + the word “Warning”. |
   | Easy Read | Large plain cards: What · Ask · When · Risk · Skip · Next. Every “NOT” kept. |
5. **Draft Dock**: always at the bottom. Edit clears approval. Switching modes keeps it. Approve shows **“Approved — not sent”**. Jeri never sends email.

Switching modes never calls the server and never re-runs Gemini.

On the Northbridge demo Jeri catches: the buried ask (confirm the 30-minute Google Meet), **“Wednesday, 12 November 2026” is a Thursday**, **“Thursday, 13 November 2026” is a Friday**, the **confirm-by deadline is after the interview**, and that the newsletter / raffle / residence card are not needed for the call.

## Google technology and why

| Tech | Why |
|---|---|
| **Gemini API** (JSON mode + `responseSchema`) | Reads the email once and finds asks, evidence and junk for three kinds of readers. Retries once on bad JSON or non-exact quotes. |
| **Gemini 3.8 Flash TTS** (Gemini API) | Speaks the beats with a prebuilt stock voice; language (English/Japanese) is detected automatically, and a calm, clear speaking style is set per request. One clip per beat so Captions can stop audio and keep the position. Same key as the analysis. |
| **Cloud Text-to-Speech** (fallback) | Standard voices (en-US / ja-JP) used automatically if Gemini TTS is unavailable. |
| **Firebase Authentication** | Google sign-in with the `gmail.readonly` scope (optional extra). |
| **Cloud Firestore** | Saves each analysis by email ID (analyse once), and each signed-in user’s draft and approval. |
| **Gmail API** | Read-only inbox list for the sidebar (optional extra, test inbox with fictional emails only). |
| **Cloud Run** | Hosts the server and the page on one URL (no CORS). Keys stay server-side. |

## How to run

```bash
cp .env.example .env      # add GEMINI_API_KEY (Gemini API key; also used for Gemini TTS)
npm install
npm run dev               # http://localhost:8080
npm test                  # date check + post-processing unit tests
npm run core              # CORE gate (Playwright) against http://localhost:8080
node scripts/a11y-check.js http://localhost:8080/   # keyboard, screen-reader structure, axe WCAG 2.1 AA
```

Without a key you can run `JERI_STUB=1 npm start`: the screen then shows a red **STUB DATA** banner and uses the team’s sample file. It is never used in the demo.

### Deploy (Cloud Run)

```bash
PROJECT_ID=your-project GEMINI_API_KEY=... sh scripts/deploy.sh
```
or run the **Deploy Jeri to Cloud Run** GitHub Action (secrets listed at the top of `.github/workflows/deploy.yml`).
Step-by-step (credit, key, Cloud Shell deploy): [docs/setup-google-cloud.md](docs/setup-google-cloud.md).
Optional Firebase sign-in: set `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` (public web config) and add the live domain to Firebase Auth → Authorized domains. Firestore rules are in `firestore.rules`.

## Free-tier limits (good to know before a demo)
- Gemini TTS free tier: about 3 requests/minute and 10/day **per model**. Jeri makes one clip per beat, one at a time, falls back through
  `gemini-3.8-flash-tts → 3.8-flash-lite-tts → 3.1-flash-tts-preview → 2.5-flash-preview-tts`, and caches every clip (Firestore on Cloud Run).
  Play the demo email once before recording so all clips are cached. Linking a billing account to the key's project removes these limits.
- Analysis models are tried in order (`gemini-3.5-flash`, `gemini-3.8-flash`, `gemini-flash-latest`, lite models) and a busy (503) or slow one is skipped.

## Project layout

```
server/      Express server: /api/analyze, /api/speak, prompt.md, schema.js, dateCheck.js, postprocess.js, store.js
public/      One-screen app (HTML/CSS/JS, no build step), design tokens from the UI guide
fixtures/    Fictional demo emails + sample-northbridge.json (EXAMPLE DATA)
test/        Unit tests (node:test)
scripts/     CORE gate, accessibility check, key scan, deploy
docs/        Product description, 著作物利用シート, QA record, judge Q&A, video script
```

## Honesty notes

- The demo emails are fictional (EXAMPLE DATA).
- Accessibility: built with みつ’s UI guide and tested by keyboard, screen-reader structure checks and axe. This is **not** a claim of legal or JIS compliance.
- Nothing on screen is hard-coded: every result comes from Gemini + code at run time.

## Licence

MIT — see [LICENSE](LICENSE). Third-party assets are listed in [docs/copyright-sheet.md](docs/copyright-sheet.md).
