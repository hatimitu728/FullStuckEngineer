# Jeri demo video: narration script and storyboard

- **File:** `jeri-demo-final.mp4` · 3:56 · 1920×1080 · 30 fps · English narration, English captions burned in (`jeri-demo-captions.srt` has the same text)
- **Rules checked:** DevFest GDGoC Japan Hackathon 2026 kickoff slides: video of at most 5 minutes including the demo; English pitches are welcome (judged with translated captions).
- **Source footage:** two screen recordings of the live site https://jeri.fullstuckengineer.workers.dev on 10 Nov 2026 (`raw/take1_loading.webm`, `raw/take2_journey.webm`), fictional Northbridge example email.
- **Narration:** synthetic voice, Gemini TTS (voice “Charon”). The app’s own voice in the Listen scene is the real app audio (Gemini TTS, voice “Sulafat”), captured from the page and placed at the moments it played.

## Storyboard

| Time | Label on screen | Picture | Narration |
|---|---|---|---|
| 0:00–0:19 | THE PROBLEM | Card: “The ask is buried.” with a fictional wall of text; the one request highlighted. | Some emails are long, and the one thing they ask of you is buried in the middle. If you cannot skim, because of dyslexia, low vision, or because you cannot rely on sound, finding that request means reading everything again and again. |
| 0:20–0:38 | JERI · LIVE APP | Live site, opening view: demo inbox, “Choose an email”. Northbridge shows “Not analysed yet”. | Jeri, by team FullStuckEngineer, does not just summarise. It finds what the email asks of you, shows the evidence, checks the dates, and leaves the decision to you. This is the live app, using a fictional example email. |
| 0:39–0:55 | ANALYSED ONCE · REAL WAIT, SHORTENED | Click Northbridge. Status “Jeri is reading this email once…” and content-shaped skeletons; then the result appears. Real first-time Gemini analysis (16 s), 3 s removed. | We open an interview invitation from Northbridge, a fictional company. Gemini reads the email once. While it works, the page shows where each answer will appear. This wait is real, and shortened here. |
| 0:56–1:11 | YOUR ASK + EVIDENCE | Result: 1 What it is, 2 Your ask (with evidence chips E3, E4), 3 Evidence quotes. | Here is the result. What the email is. Your ask: confirm the interview, or propose two other times, using their form. And below it, the exact sentences from the email that support it. |
| 1:12–1:39 | DATE WARNINGS · CHECKED IN CODE | 4 Date & condition risks: three warning cards (“The email says / Our check found”, tag “Checked in code, not by AI”). Then “View in original email” opens the original with the sentence highlighted. | Now the part a summary would miss. Our code, not the AI, checks every date. The email says Wednesday the twelfth of November, but that date is a Thursday. The deadline is written as Thursday the thirteenth, which is a Friday, and it falls after the interview. Jeri does not guess which day is right. It shows what the email says, what the check found, and links each warning to the original sentence. |
| 1:41–1:53 | LISTEN | Mode panel. Listen is selected; cursor moves to Play. Nothing plays until Play is pressed. | There are three ways to take this in, all from the same analysis. Listen reads short spoken beats aloud. It never plays by itself. |
| 1:55–2:25 | LISTEN | Play pressed. Current sentence highlighted. Next is pressed during S3 to jump to the first warning. | *(App voice, real audio)* S1: “You need to reply to this email or fill out the form.” · S2: “Aiko Sato invited you to a second-round interview for the Northbridge internship.” · S3: “You are asked to confirm your interview attendance or propose two other times using the form by Thursday, 13 November 2026, 17:00 JST.” (cut short by Next) · S4: “Warning. The email says Wednesday, 12 November 2026, at 16:00 JST. Our check found that this date is a Thursday.” · S5: “Warning. The email says Thursday, 13 November 2026, 17:00 JST. Our check found that this date is a Friday.” (stopped by switching to Captions) |
| 2:25–2:36 | CAPTIONS | Click Captions: audio stops; the same warning sentence (S5) is shown as a caption. | Switch to Captions. The audio stops, and the same sentence appears as text, in the same place. No sound is needed. |
| 2:39–2:53 | EASY READ | Click Easy Read: cards What / Ask / When / Date warning / “You do NOT need residence card details…” / Skip / Next step. | Easy Read shows large, plain cards, one topic each. Every 'not' is kept. For example: you do not need your residence card for the video call. |
| 2:54–3:14 | DRAFT DOCK · APPROVE ≠ SEND | Draft Dock: Approve → “Approved — not sent”. Edit draft, type “Thank you.” → “Not approved yet”. | At the bottom, the Draft Dock holds a reply that asks which day they mean, instead of confirming a date that may be wrong. Approve records your decision: approved, not sent. Jeri never sends email. And if you edit the draft, the approval is cleared. |
| 3:18–3:44 | HOW IT WORKS | Card: 1 email → Gemini → Code checks → Gemini TTS. Notes: saved once; Gmail/Firebase and Cloud TTS not connected in this demo. | Under the hood, Gemini analyses the email once, into a structured result. Our code verifies the quotes and the dates. Gemini text to speech provides the voice. Results are saved, so switching modes never calls the AI again. Gmail sign-in is built, but not connected in this demo, so it uses a built-in inbox of fictional emails. |
| 3:45–3:54 |  | Closing card: Jeri · Find the ask. Keep the meaning. Choose the next step. · FullStuckEngineer · credits. | Jeri finds the ask, keeps the meaning, and lets you choose the next step. Jeri, by FullStuckEngineer. |

## Edit decisions

- **Take 1** (opening view → click → loading → result) was captured at 1280×720 and upscaled to 1080p, so it is slightly softer than the rest. It is kept because it is the genuine first-time analysis of this email; re-recording it would have meant analysing the email again and showing a different result than take 2.
- **Take 2** (the journey) is one continuous take at native 1920×1080 with the page at 150% zoom. It is used uncut from 0:55 to 3:17.
- Removed: 3 seconds of waiting inside the loading shot (take 1, 13.0–16.0 s). The opening view is held as a still while the introduction is spoken. Nothing else was sped up.
- Added in the edit: captions, scene labels, the “live site recording / fictional example data” tag, and the three cards. The cursor dot was added by the recording script because browser video capture does not include the mouse pointer.
- Take 2 runs on the analysis saved by take 1 (Jeri analyses each email once and reuses the result). Voice clips for beats S1–S5 were requested once before take 2, so they play without delay.

## Claims checked against the live app

| Claim in the video | How it was checked |
|---|---|
| 12 Nov 2026 is a Thursday, 13 Nov 2026 is a Friday, deadline is after the interview | Computed in `server/dateCheck.js`; unit tests; shown on the live site with “Checked in code, not by AI” |
| Captions stops the audio and keeps the place | Take 2 log: mode=captions, same beat index (S5), audio paused, 0 server calls after the switch |
| Approve does not send; edit clears approval | Take 2 log: “Approved — not sent” then “Not approved yet”; there is no send code in the app |
| Gemini analyses once; Gemini TTS is the voice | Live `/api/analysis` result: source gemini (model gemini-3.5-flash-lite); audio engine reported by `/api/speak` |
| Gmail sign-in is built but not connected | Code exists in `public/firebase.js`; the live site has no Firebase configuration. It has never been tested against a real Firebase project |
