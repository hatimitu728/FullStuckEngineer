# Judge Q&A — likely questions, short answers

1. **Why not just use a summary?** Summaries drop the “not” and the conditions. Jeri keeps them, links every fact to the original sentence, and checks dates in code.
2. **Is Gemini deciding the weekday?** No. Gemini copies the date as written. Our code computes the real weekday in JST and reports mismatches. Gemini’s own weekday claims are thrown away.
3. **What if Gemini invents a quote?** Every quote must be an exact copy of the email. If not, we ask once more; if it is still wrong, the quote is removed and the screen says so.
4. **Does switching modes re-run the AI?** No. One analysis is saved per email; a mode switch changes only the view. Our automated gate counts zero server calls on a switch.
5. **Why three modes and not one?** Different readers need different paths to the same facts: listening, reading captions without sound, or plain large cards. One analysis keeps the facts identical.
6. **Does Jeri send emails?** Never. Approve records your decision and shows “Approved — not sent”.
7. **Privacy?** The demo uses fictional emails. Gmail is read-only and optional. Keys live only on the server. Firestore rules let each user read only their own drafts.
8. **Is it accessible?** Built from our designer’s guide and tested by keyboard, screen-reader structure checks and axe (WCAG 2.1 A/AA rules). We do not claim legal compliance.
