# QA record — みつ’s 26-item checklist + CORE gate

**CORE ✅ on real Gemini + real Gemini TTS (Tue 10 Nov, 13:20 JST, local run, nothing mocked).** **CORE ✅ and 15/15 accessibility checks on the live URL https://jeri-fullstuckengineer.web.app (Firebase Hosting; API on https://jeri.fullstuckengineer.workers.dev), Tue 10 Nov 2026 18:26 JST.**

Automated by `scripts/core-gate.js` (CORE) and `scripts/a11y-check.js` (keyboard, screen-reader structure, axe WCAG 2.1 A/AA, text zoom).
Status as of the build on Tue 10 Nov 2026. “Human” = still needs a person on a real device.

## CORE gate

| Item | Status | Note |
|---|---|---|
| Northbridge → **real** Gemini returns the JSON | ✅ Tue 13:20 JST | Real Gemini (gemini-3.5-flash-lite after the bigger models answered “busy”), 82 s, all quotes exact. |
| Warning cards: both weekday mismatches + late deadline, checked in code | ✅ | 2 × wrong_weekday, 1 × deadline_after_event |
| Listen plays **real** TTS (Gemini 3.8 Flash TTS, Cloud TTS fallback); play, pause, resume | ✅ Tue 13:20 JST | Real gemini-3.8-flash-tts audio. Free tier = 3 TTS requests/min, so beats are made one at a time, prefetched and cached. |
| Captions stops audio, same beat; Easy Read same facts | ✅ | |
| Draft Dock: edit clears approval; mode switch keeps it; “Approved — not sent” | ✅ | |
| Mode switch makes zero server calls | ✅ | |

## 26 items

| # | Item | Status | How checked |
|---|---|---|---|
| 1 | Follows the 8pt grid | ✅ | Spacing tokens 4/8/16/24/32/48/64 only |
| 2 | Clear hierarchy by size and weight | ✅ | Type scale 32/24/20/18/16/14/12 |
| 3 | No heavy decoration or shadows | ✅ | No shadows, no gradients (except loading skeleton) |
| 4 | Colour meanings the same everywhere | ✅ | Amber = warning, green = checked/approved, blue = info/evidence, red = error/stub |
| 5 | Your ask is clear at once | ✅ | Section 2, bold 18px |
| 6 | Ask and its evidence can be checked | ✅ | Evidence chips open the exact sentence in the original |
| 7 | Original email always available | ✅ | “View original email”, never deleted |
| 8 | Date and deadline warnings are clear | ✅ | Warning Card: email says / our check found / meaning / next step |
| 9 | No autoplay | ✅ | CORE gate checks no audio before Play |
| 10 | Play, stop, resume work | ✅ | CORE gate, real TTS |
| 11 | Captions: same content and order as Listen | ✅ | Both render `spokenBeats` |
| 12 | Switching stops the audio | ✅ | CORE gate |
| 13 | Easy Read: What / Ask / When / Risk / Next Step organised | ✅ | Plus “You can skip” |
| 14 | Mode switch does not reset state | ✅ | Beat index, draft, approval kept |
| 15 | Editing the draft clears approval | ✅ | CORE gate |
| 16 | Draft reachable in every mode | ✅ | Fixed Draft Dock |
| 17 | Approve does not send; shows “Approved — not sent” | ✅ | No send code exists |
| 18 | Works by keyboard | ✅ | a11y-check keyboard script |
| 19 | Works with a screen reader | ✅ structure / Human | One h1, labelled buttons, aria-live, lang=ja. Run VoiceOver or NVDA once on the live URL. |
| 20 | Works with text zoom | ✅ | 200% zoom, no sideways scroll |
| 21 | No info by colour or sound alone | ✅ | Icon + the word “Warning” + colour |
| 22 | On mobile the dock does not hide content | ✅ | Page padding follows the dock height |
| 23 | Layout adapts at every width | ✅ | 1366 / 900 / 390 px, no sideways scroll |
| 24 | Reduced motion respected | ✅ | `prefers-reduced-motion` disables all motion |
| 25 | Mode switch never re-runs Gemini | ✅ | 0 server calls on switch |
| 26 | Original and AI analysis clearly separate | ✅ | “AI analysis by Gemini” line vs. “Original email (never changed)” panel |

axe WCAG 2.1 A/AA: 0 violations in Listen, Captions and Easy Read (stub data).

## Found with real Gemini, fixed in code
- A lighter model wrote a draft that confirmed “Wednesday, 12 November” and claimed the form was already submitted. Now: the prompt forbids it, and code adds the “which day do you mean?” question whenever a weekday is wrong.
- Duplicate evidence quotes (E4 = E6) are merged.
- The draft beat always says “It is not sent.”
- gemini-2.5-flash is closed to new keys; models are tried in order and a busy (503) or slow model is skipped.

## Real Gemini on all 5 demo emails (Tue 10 Nov, afternoon)
| Email | Result |
|---|---|
| Northbridge (×3 runs) | Ask found, both wrong weekdays + late deadline every time (code), “NOT needed” kept, draft asks which day |
| Shift change | Wrong weekday (Sat 15 Nov is a Sunday) caught; draft asks instead of confirming |
| Professor | Both asks found (report by Mon 16 Nov, slot choice by Fri 20 Nov); no false date warnings |
| Club notice | “No reply needed”; no false warnings; last beat says no reply is needed |
| ミナトデザイン (Japanese) | 11月18日（火）→ 水曜日 caught in Japanese; Japanese draft asks which day |

Fixed after these runs: code now checks weekdays in the email *before* Gemini and gives it the facts, so drafts ask instead of confirming a wrong day;
the date question is placed before the sign-off and never duplicated; free-tier TTS limits (3/min and 10/day per model) are handled by
falling back through 4 Gemini TTS models and caching every clip.
