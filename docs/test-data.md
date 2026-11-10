# Jeri test data

All test data is **fictional** (“EXAMPLE DATA”). No real people, companies, inboxes or personal data are used. The sender addresses use the reserved `.example` domain.

- **Where it lives:** `fixtures/emails/*.json` (the five demo emails shown in the inbox) and `fixtures/sample-northbridge.json` (a hand-written example of the analysis shape, used only by unit tests and by stub mode).
- **How it is used:** the live site shows these five emails in its built-in inbox. Selecting one sends it to Gemini once; the result is saved and reused. You can also paste any text with “Paste an email”.
- **Reader name in drafts:** Tinish. **Today’s date for checks:** the real current date in Japan time.

## The five demo emails

| # | File | From | Subject | Language | Length |
|---|---|---|---|---|---|
| 1 | `fixtures/emails/northbridge.json` | Aiko Sato &lt;aiko@northbridge.example> | Northbridge Internship – second-round interview and next steps | English | 2063 characters |
| 2 | `fixtures/emails/shift-change.json` | Kenji Mori &lt;kenji@corner-cafe.example> | Shift swap this week | English | 556 characters |
| 3 | `fixtures/emails/professor.json` | Prof. Lena Okafor &lt;okafor@university.example> | HCI seminar: report and presentation slot | English | 660 characters |
| 4 | `fixtures/emails/club-notice.json` | Hiking Club Committee &lt;committee@campus-hiking.example> | Hiking Club – November update | English | 592 characters |
| 5 | `fixtures/emails/japanese-intern.json` | 株式会社ミナトデザイン 採用担当 &lt;recruit@minato-design.example> | 【ミナトデザイン】説明会のご案内と参加確認のお願い | Japanese | 424 characters |

### 1. Northbridge Internship – second-round interview and next steps

- **ID:** `northbridge-demo`
- **Purpose:** Main demo. Internship interview invitation with the ask buried in a long message.
- **What is planted in it:**
  - “Wednesday, 12 November 2026” – that date is a **Thursday**
  - “Thursday, 13 November 2026” – that date is a **Friday**
  - Confirm-by deadline (13 Nov 17:00) is **after** the interview (12 Nov 16:00)
  - Negative that must survive: “you do **not** need them [residence card, bank details] for the video call itself”
  - Junk to skip: newsletter, mailing list, notebook raffle
- **Expected result:** Must reply. Ask: confirm attendance (or propose two other times) using the form. 2 × wrong weekday + 1 × deadline after event, all marked “Checked in code, not by AI”. Draft asks which day they mean.

<details><summary>Full text</summary>

```text
Dear Tinish,

Thank you so much for applying to the Northbridge Design & Engineering Internship, and congratulations on making it through the first round! We really enjoyed reading your portfolio, and the whole team was impressed by the accessibility project you described. Before anything else, we wanted to share a little about how our autumn programme works this year, because a few things have changed since the information session in October.

As you may know, Northbridge runs two intakes each year, and this autumn we have had more applications than ever before. Because of that, we are running second-round interviews over a shorter window than usual, and we are scheduling them in small groups so that the panel can give every candidate the same amount of attention. After checking the panel's calendars, the interview would be 30 minutes on Wednesday, 12 November 2026, at 16:00 JST, over Google Meet. The panel will be two people from the product team, and there is no need to prepare slides. Please confirm you can attend by Thursday, 13 November 2026, 17:00 JST, using this form: https://forms.example.com/northbridge-interview. If you cannot make that slot, propose two other times that same week in the form. We will do our best to fit around your classes and part-time work.

Some candidates have asked about documents. For the onboarding stage later on, we will ask for your residence card details and bank information, but you do not need them for the video call itself. We will send a separate message about onboarding only if you receive an offer.

Finally, a few community notes: our monthly newsletter comes out this Friday, you can join the Northbridge Campus mailing list from our website, and everyone who visits the autumn open day can enter a raffle for a Northbridge notebook. Those are optional and are not part of the interview decision.

If you have any questions at all, just reply to this email.

Warm regards,
Aiko Sato
Early Careers Team, Northbridge

[EXAMPLE DATA – Northbridge is a fictional company. This email is not real.]
```

</details>

### 2. Shift swap this week

- **ID:** `shift-change-demo`
- **Purpose:** Shift swap request with one wrong weekday.
- **What is planted in it:**
  - “Saturday, 15 November 2026” – that date is a **Sunday**
  - Reply deadline “Wednesday, 11 November 2026, 20:00 JST” is correct (no warning expected)
  - Negative: “You do **not** need to bring your uniform”
  - Condition: “If Saturday does not work, it is fine”
- **Expected result:** Must reply. 1 × wrong weekday. Draft asks which day instead of accepting the shift.

<details><summary>Full text</summary>

```text
Hi Tinish,

Sorry for the short notice. Mika is away this week, so we need to move some shifts around. Could you work the evening shift on Saturday, 15 November 2026, from 17:00 to 22:00 instead of your usual Friday shift? Please let me know by Wednesday, 11 November 2026, 20:00 JST, so I can update the rota. If Saturday does not work, it is fine – just tell me and I will ask someone else. You do not need to bring your uniform; we have spare aprons at the shop.

Thanks a lot,
Kenji
Corner Cafe

[EXAMPLE DATA – fictional cafe. This email is not real.]
```

</details>

### 3. HCI seminar: report and presentation slot

- **ID:** `professor-demo`
- **Purpose:** Email with two separate asks and no date errors.
- **What is planted in it:**
  - Ask 1: upload the mid-term report by Monday, 16 November 2026, 23:59 JST (correct weekday)
  - Ask 2: reply with first and second choice of presentation slot by Friday, 20 November 2026 (correct weekday)
  - Condition: late reports only with a note from the student office
  - Optional: the Norman paper “will not be graded”
- **Expected result:** Must reply. Two asks. **No** date warnings (checks that Jeri does not invent problems).

<details><summary>Full text</summary>

```text
Dear students,

I hope the semester is going well. A short administrative note for the HCI seminar. First, please upload your mid-term report to the course page by Monday, 16 November 2026, 23:59 JST; late reports will only be accepted with a note from the student office. Second, each of you needs to choose a presentation slot. Please reply to this email with your first and second choice from the list on the course page, by Friday, 20 November 2026. The slots are first come, first served. Reading the optional paper by Norman is encouraged but it will not be graded.

Best wishes,
Lena Okafor

[EXAMPLE DATA – fictional professor. This email is not real.]
```

</details>

### 4. Hiking Club – November update

- **ID:** `club-notice-demo`
- **Purpose:** Notice with no ask at all.
- **What is planted in it:**
  - “There is nothing you need to do right now”
  - Date “Monday, 7 December 2026” is correct
- **Expected result:** No reply needed. No asks. No date warnings. The last spoken beat says no reply is needed.

<details><summary>Full text</summary>

```text
Hi everyone,

Here is the November update from the Hiking Club committee. Thank you to the 23 members who joined the Mt. Takao walk last Saturday – the photos are now in the shared album. The committee met on Tuesday and agreed to keep the membership fee the same next year. The club room will be closed during the exam period, from Monday, 7 December 2026, while the building is cleaned. There is nothing you need to do right now; we will send sign-up details for the spring trip in January.

Happy walking,
The Hiking Club Committee

[EXAMPLE DATA – fictional club. This email is not real.]
```

</details>

### 5. 【ミナトデザイン】説明会のご案内と参加確認のお願い

- **ID:** `japanese-intern-demo`
- **Purpose:** Japanese email, to check Japanese analysis, Japanese weekday reading and Japanese voice.
- **What is planted in it:**
  - 「2026年11月18日（火）」 – その日は**水曜日**
  - 「2026年11月16日（月）17時まで」 は正しい（警告なし）
  - 否定：「履歴書の提出は不要」「カメラをオンにしていただく必要はありません」
  - 任意：メールマガジン登録、ノベルティ企画
- **Expected result:** 要返信。曜日不一致の警告 1 件（日本語で表示）。下書きは日本語で、どちらの日かを確認する。

<details><summary>Full text</summary>

```text
ティニッシュ様

この度は弊社インターンシップにご応募いただき、誠にありがとうございます。採用担当の山田です。

先日ご案内した会社説明会について、日程が確定しましたのでお知らせいたします。説明会は2026年11月18日（火）14時から、オンライン（Google Meet）で約60分間行います。参加される場合は、2026年11月16日（月）17時までに、本メールへの返信で参加可否をお知らせください。ご都合が合わない場合は、録画の視聴も可能ですので、その旨をお知らせください。

なお、説明会では履歴書の提出は不要です。当日はカメラをオンにしていただく必要はありません。社内報のメールマガジン登録やノベルティのプレゼント企画は任意であり、選考とは関係ありません。

ご不明な点がございましたら、お気軽にお問い合わせください。

株式会社ミナトデザイン 採用担当 山田

【EXAMPLE DATA – 架空の会社です。このメールは実在しません。】
```

</details>

## Calendar facts the tests rely on (2026, Japan time)

| Date | Real weekday | What the email says |
|---|---|---|
| 11 Nov 2026 | Wednesday | Wednesday (shift email, correct) |
| 12 Nov 2026 | **Thursday** | “Wednesday” (Northbridge, wrong) |
| 13 Nov 2026 | **Friday** | “Thursday” (Northbridge, wrong) |
| 15 Nov 2026 | **Sunday** | “Saturday” (shift email, wrong) |
| 16 Nov 2026 | Monday | Monday / 月 (professor and Japanese emails, correct) |
| 18 Nov 2026 | **Wednesday** | 火 = Tuesday (Japanese email, wrong) |
| 20 Nov 2026 | Friday | Friday (professor email, correct) |
| 7 Dec 2026 | Monday | Monday (club notice, correct) |

The weekdays are computed by code in `server/dateCheck.js`, never by the AI.

## Automated tests that use this data

| Command | What it checks |
|---|---|
| `npm test` | 28 unit and integration tests: weekday and deadline checks on the dates above, exact-quote checking against `northbridge.json`, draft guard, fake-server tests for Gemini, Gemini TTS, the Cloud TTS fallback and Vertex mode |
| `node scripts/core-gate.js <URL>` | The five CORE checks on a running site with the Northbridge email (real Gemini, real audio, mode switching, Draft Dock) |
| `node scripts/a11y-check.js <URL>` | 15 keyboard, screen-reader-structure and WCAG 2.1 A/AA checks with the Northbridge email |

**Latest results:** see `docs/qa-record.md`. Real Gemini was run on all five emails on 10 Nov 2026; the results matched the “Expected result” lines above.

## Known limits of this test data

- Five emails is a small set. They were written by the team to exercise specific cases, so they do not show how Jeri behaves on real, messy email.
- No real users have tested Jeri with this data yet.
- Gmail inbox data was not tested: the Gmail and Firebase sign-in code is not connected on the live site.
