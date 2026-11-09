# Jeri — Product description

**One email. One analysis. Three ways to understand it. You decide what happens next.**

## Whose problem, and the moment it happens

Tinish is a student who juggles school, clubs, part-time work and job interviews. Every day brings long emails, many written or padded by AI. Tinish has dyslexia: finding the one sentence that asks for something means reading the whole wall of text again and again. The real ask is often buried in the middle, next to a date that is wrong, under a pile of newsletters and raffles.

That moment — *“What do they actually want from me, and by when?”* — is the same for many people who **cannot skim**: dyslexic readers, blind or low-vision readers who use a screen reader, and Deaf or hard-of-hearing readers who cannot rely on audio.

## What Jeri does

1. **Gemini reads the email once** and returns one structured result: whether you must reply and why, what the email is, your asks, the exact evidence sentences (E1, E2…), the dates as written, things you can skip, spoken beats, easy-read cards and a polite draft reply.
2. **Code checks every date.** Our server reads each date as written and computes the real weekday in Japan time. If they do not match, or a reply deadline falls after the event, Jeri shows a Warning Card: *what the email says* and *what our check found*, side by side. Jeri never “fixes” the date and never guesses.
3. **The same result, three modes, one screen:**
   - **Listen** — Gemini 3.8 Flash TTS reads the spoken beats in a calm, clear voice. No autoplay. Play, pause, resume, previous, next.
   - **Captions** — the same beats as text, in the same order, with visual warnings. No sound needed.
   - **Easy Read** — large, plain cards, one topic each. Every “not”, condition and exception is kept.
4. **Draft Dock** — the reply draft stays at the bottom in every mode. You can edit it (which clears approval) and approve it. Approval shows **“Approved — not sent.”** Jeri never sends email.

Switching modes keeps your email, your place and your draft, and never calls Gemini again.

## What really works today

- Real Gemini analysis with a strict JSON schema; quotes are checked to be exact copies of the email (retry once, otherwise removed and flagged).
- Date and weekday check in code, tested with unit tests.
- Real Gemini 3.8 Flash TTS audio per beat (Cloud Text-to-Speech as automatic fallback).
- The three modes and the Draft Dock, on desktop, tablet and mobile.
- Analysis saved by email ID (Firestore when configured), with a guard so a second request never starts a second Gemini call.
- Optional: Google sign-in (Firebase Auth) with Gmail read-only, and drafts saved per user in Firestore.

## The Northbridge demo (fictional EXAMPLE DATA)

An internship interview invitation. Jeri finds:
- **The buried ask:** confirm the 30-minute Google Meet using their form (or propose two other times that week).
- **Wrong weekday:** “Wednesday, 12 November 2026” — 12 November 2026 is a **Thursday**.
- **Wrong weekday (bonus):** “Thursday, 13 November 2026” — that date is a **Friday**.
- **Deadline after the event:** confirm by 13 Nov 17:00, but the interview is 12 Nov 16:00.
- **Junk:** newsletter, mailing list, raffle. The residence card is **NOT** needed for the video call.

## Accessibility

Built from みつ’s UI design guide (Swiss Style structure, Apple HIG clarity, Material 3 states). Tested with keyboard-only use, screen-reader structure checks (one h1, labelled buttons, aria-live announcements, correct `lang` for Japanese), axe WCAG 2.1 A/AA rules in all three modes, 200% text zoom, and reduced motion. This is our own testing, **not** a claim of legal or JIS compliance.

## SDGs

- **10.2 (primary):** empower and promote the inclusion of all, irrespective of disability — Jeri lets people who cannot skim act on the same emails as everyone else, on their own terms.
- **4.5 (supporting):** equal access to education for persons with disabilities — school and seminar emails are a core use case.
- **8.5 (adjacent only):** full and productive employment for persons with disabilities — interview and shift emails are where missed asks cost the most.

## Limits

- Jeri does not send email, does not manage a full inbox, and does not create custom voices.
- Gemini can still miss an ask; every fact links to its original sentence so the user can check, and the original email is always one click away.
- Date checking assumes Japan time (JST) unless the email says otherwise.

## What we cut, and why

Separate systems per mode (they would drift apart), re-analysing on a mode switch (slow, and the facts could change), reading the raw email aloud (that is the problem, not the solution), auto-sending (the human stays in control), custom voices, and a full inbox app.
