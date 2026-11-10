// Jeri – one screen, one analysis, three ways to understand it.
// UI state is kept separate from the analysis data. A mode switch changes only `mode`.

const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- i18n (UI labels only; analysis text stays in its own language) ---------- */
const L = {
  en: {
    skip: "Skip to the email", tagline: "for people who cannot skim", speed: "Voice speed", slower: "Slower", normal: "Normal", faster: "Faster",
    signin: "Sign in with Google", signout: "Sign out", inbox: "Inbox", exampleData: "EXAMPLE DATA", inboxNote: "Fictional emails for the demo.",
    paste: "Paste an email", gmail: "Gmail (read-only)", draftDock: "Reply draft", neverSent: "· never sent automatically",
    editLabel: "Edit the reply draft", listenDraft: "Listen to draft", stopDraft: "Stop draft audio", editDraft: "Edit draft", doneEditing: "Done editing",
    approveDraft: "Approve draft", approved: "Approved", pasteTitle: "Paste an email", pasteHint: "Use only fictional or your own test emails. Jeri reads it once with Gemini.",
    subject: "Subject", emailText: "Email text", cancel: "Cancel", analyse: "Analyse",
    mustReply: "Must reply", noReply: "No reply needed", notAnalysed: "Not analysed yet", analysing: "Analysing…",
    chooseTitle: "Choose an email", chooseBody: "Pick an email from the inbox. Jeri reads it once and shows the ask, the evidence and any date problems.",
    loadingTitle: "Jeri is reading this email once…", loadingBody: "Gemini finds the asks. Then our code checks every date.",
    errorTitle: "Jeri could not analyse this email", retry: "Try again",
    networkError: "The connection to the server was lost before the analysis finished. Please try again.",
    aiLine: "AI analysis by Gemini, read once and saved.", codeLine: "Dates checked in code.", stubLine: "STUB DATA – not Gemini",
    whatItIs: "What it is", yourAsk: "Your ask", evidence: "Evidence", risks: "Date & condition risks", nextStep: "Next step",
    noAsk: "No ask found. You do not need to do anything.", evidenceFor: "Evidence", showEvidence: (id) => `Show evidence ${id} in the original email`,
    noRisks: "No date or condition problems found.", datesWritten: "Dates as written", checkedAs: "checked in code:",
    notStated: "Not stated / needs checking", canSkip: "You can skip",
    warning: "Warning", wrongWeekday: "Date conflict (weekday does not match)", deadlineAfter: "Deadline is after the event", deadlinePassed: "Deadline has passed", condition: "Condition to check",
    emailSays: "The email says", checkFound: "Our check found", whatMeans: "What this means", nextStepRow: "Next step",
    checkedInCode: "Checked in code, not by AI", fromEmail: "Found by AI in the email", viewInOriginal: "View in original email",
    modesLabel: "How do you want to take it in?", listen: "Listen", captions: "Captions", easyRead: "Easy Read",
    modeHint: "Same facts in every mode. Switching keeps your place and your draft.",
    play: "Play", pause: "Pause", resume: "Resume", prev: "Previous", next: "Next", beatOf: (i, n) => `${i} of ${n}`,
    audioLoading: "Getting audio from Gemini TTS…", audioPaused: (id) => `Paused at ${id}.`, audioPlaying: (id) => `Playing ${id}.`,
    audioDone: "Finished. Press Play to hear it again.", audioIdle: "Audio never plays by itself. Press Play when you are ready.",
    captionsNoSound: "No sound needed. These are exactly the spoken beats, in the same order.",
    original: "Original email", originalNote: "never changed, never deleted", showOriginal: "View original email", hideOriginal: "Hide original email",
    notApproved: "Not approved yet", approvedNotSent: "Approved — not sent", approvalCleared: "The draft changed, so the approval was cleared.",
    noDraft: "Choose an email to see a reply draft.", modeAnnounce: (m) => `${m} mode. Same content, same place.`,
    readyAnnounce: "Analysis ready.", confidence: "Note from Jeri:", savedTo: "Saved",
  },
  ja: {
    skip: "メールへ移動", tagline: "流し読みが難しい人のために", speed: "読み上げ速度", slower: "ゆっくり", normal: "ふつう", faster: "はやく",
    signin: "Googleでログイン", signout: "ログアウト", inbox: "受信トレイ", exampleData: "サンプルデータ", inboxNote: "デモ用の架空のメールです。",
    paste: "メールを貼り付ける", gmail: "Gmail（読み取りのみ）", draftDock: "返信の下書き", neverSent: "・自動送信はしません",
    editLabel: "返信の下書きを編集", listenDraft: "下書きを聞く", stopDraft: "下書きの音声を止める", editDraft: "下書きを編集", doneEditing: "編集を終える",
    approveDraft: "下書きを承認", approved: "承認済み", pasteTitle: "メールを貼り付ける", pasteHint: "架空のメールか、自分のテスト用メールだけを使ってください。JeriはGeminiで一度だけ読みます。",
    subject: "件名", emailText: "メール本文", cancel: "キャンセル", analyse: "解析する",
    mustReply: "要返信", noReply: "返信不要", notAnalysed: "未解析", analysing: "解析中…",
    chooseTitle: "メールを選んでください", chooseBody: "受信トレイからメールを選ぶと、Jeriが一度だけ読み、依頼・根拠・日付の問題を示します。",
    loadingTitle: "Jeriがメールを一度だけ読んでいます…", loadingBody: "Geminiが依頼を見つけ、コードが日付を確認します。",
    errorTitle: "このメールを解析できませんでした", retry: "もう一度試す",
    networkError: "解析が終わる前にサーバーとの接続が切れました。もう一度お試しください。",
    aiLine: "Geminiによる解析（一度だけ実行し保存）。", codeLine: "日付はコードで確認。", stubLine: "スタブデータ（Geminiではありません）",
    whatItIs: "何のメール？", yourAsk: "あなたへの依頼", evidence: "根拠", risks: "日付・条件のリスク", nextStep: "次の行動",
    noAsk: "依頼は見つかりませんでした。対応は必要ありません。", evidenceFor: "根拠", showEvidence: (id) => `根拠${id}を原文で表示`,
    noRisks: "日付や条件の問題は見つかりませんでした。", datesWritten: "原文の日付", checkedAs: "コードで確認：",
    notStated: "記載なし／確認が必要", canSkip: "読み飛ばしてよいもの",
    warning: "注意", wrongWeekday: "日付の矛盾（曜日が一致しません）", deadlineAfter: "期限が予定より後です", deadlinePassed: "期限が過ぎています", condition: "確認が必要な条件",
    emailSays: "メールの記載", checkFound: "確認結果", whatMeans: "意味", nextStepRow: "次の行動",
    checkedInCode: "AIではなくコードで確認", fromEmail: "AIがメールから抽出", viewInOriginal: "原文で確認",
    modesLabel: "どの方法で確認しますか？", listen: "Listen（音声）", captions: "Captions（字幕）", easyRead: "Easy Read（やさしい表示）",
    modeHint: "どのモードでも内容は同じです。切り替えても位置と下書きはそのままです。",
    play: "再生", pause: "一時停止", resume: "再開", prev: "前へ", next: "次へ", beatOf: (i, n) => `${i} / ${n}`,
    audioLoading: "Gemini TTSで音声を準備中…", audioPaused: (id) => `${id}で一時停止中。`, audioPlaying: (id) => `${id}を再生中。`,
    audioDone: "最後まで再生しました。もう一度聞くには再生を押してください。", audioIdle: "音声は自動で再生されません。準備ができたら再生を押してください。",
    captionsNoSound: "音は不要です。読み上げと同じ文章を同じ順番で表示します。",
    original: "元のメール", originalNote: "変更も削除もしません", showOriginal: "元のメールを表示", hideOriginal: "元のメールを隠す",
    notApproved: "未承認", approvedNotSent: "承認済み — 未送信", approvalCleared: "下書きが変更されたため、承認を解除しました。",
    noDraft: "メールを選ぶと返信の下書きが表示されます。", modeAnnounce: (m) => `${m}モード。内容と位置は同じです。`,
    readyAnnounce: "解析が完了しました。", confidence: "Jeriからのメモ：", savedTo: "保存済み",
  },
};
let uiLang = "en";
try { uiLang = localStorage.getItem("jeri.uiLang") === "ja" ? "ja" : "en"; } catch {}
const t = (k, ...args) => { const v = L[uiLang][k] ?? L.en[k] ?? k; return typeof v === "function" ? v(...args) : v; };

/* ---------- Icons (drawn for Jeri, no external assets) ---------- */
const ICON = {
  warning: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2 1 21h22L12 2zm0 4.5 7.5 13h-15L12 6.5zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  dot: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>',
  ear: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
  cc: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H5V6h14v12zM7 15h3a1 1 0 0 0 1-1v-1H9.5v.5h-2v-3h2v.5H11v-1a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1zm7 0h3a1 1 0 0 0 1-1v-1h-1.5v.5h-2v-3h2v.5H18v-1a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1z"/></svg>',
  cards: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 5h16v4H4zm0 5h16v4H4zm0 5h16v4H4z" opacity=".9"/></svg>',
};

/* ---------- DOM helper (textContent only; email text is never injected as HTML) ---------- */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // only used for our own static icons
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const icon = (name) => h("span", { html: ICON[name], class: "icon", "aria-hidden": "true", style: "display:inline-flex" });

/* ---------- State ---------- */
const state = {
  config: { stub: false, firebase: null },
  emails: [],            // demo + pasted + gmail emails
  selectedEmailId: null,
  mode: "listen",        // "listen" | "captions" | "easyread"
  isPlaying: false,
  audioKind: null,       // "beat" | "draft" | null
  analyses: {},          // emailId -> analysis (from server; never changed by the UI)
  status: {},            // emailId -> "idle" | "loading" | "ready" | "error"
  errors: {},
  per: {},               // emailId -> { currentBeatIndex, draftText, approvalState, editing, finished }
  originalOpen: false,
  rate: 1,
  user: null,
};
const per = (id = state.selectedEmailId) => (state.per[id] ||= { currentBeatIndex: 0, draftText: null, approvalState: "none", editing: false, finished: false });
const current = () => state.analyses[state.selectedEmailId];
const currentEmail = () => state.emails.find((e) => e.id === state.selectedEmailId);
const clips = {};        // `${emailId}:${rate}` -> {S1: base64}
const serverCalls = { analyze: 0, speak: 0 };

// Read-only snapshot for tests and the CORE gate.
window.__jeri = {
  get state() {
    const p = state.selectedEmailId ? per() : {};
    return {
      selectedEmailId: state.selectedEmailId, mode: state.mode, currentBeatIndex: p.currentBeatIndex, isPlaying: state.isPlaying,
      draftText: p.draftText, approvalState: p.approvalState, serverCalls: { ...serverCalls },
    };
  },
};

function announce(msg) {
  const live = $("#live");
  live.textContent = "";
  setTimeout(() => { live.textContent = msg; }, 50);
}

async function api(path, body) {
  const res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(json?.error || `Request failed (${res.status})`), { detail: json?.detail, status: res.status });
  return json;
}

/* ---------- Inbox ---------- */
function fmtReceived(iso) {
  try {
    return new Intl.DateTimeFormat(uiLang === "ja" ? "ja-JP" : "en-GB", { timeZone: "Asia/Tokyo", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return ""; }
}
function badgeFor(id) {
  const a = state.analyses[id];
  if (state.status[id] === "loading") return h("span", { class: "tag tag-neutral" }, t("analysing"));
  if (!a) return h("span", { class: "tag tag-neutral" }, t("notAnalysed"));
  return a.needsReply?.value
    ? h("span", { class: "tag tag-must" }, icon("dot"), t("mustReply"))
    : h("span", { class: "tag tag-ok" }, t("noReply"));
}
function renderInbox() {
  const list = $("#email-list");
  const gmail = $("#gmail-list");
  list.replaceChildren();
  gmail.replaceChildren();
  for (const e of state.emails) {
    const fromName = e.from.replace(/\s*<.*>\s*/, "");
    const btn = h("button", {
      type: "button", class: "email-item", "aria-current": e.id === state.selectedEmailId ? "true" : "false",
      lang: e.lang, dataset: { id: e.id }, onclick: () => selectEmail(e.id),
    },
    h("span", { class: "email-from" }, fromName),
    h("span", { class: "email-subject" }, e.subject || "(no subject)"),
    h("span", { class: "email-meta" }, h("span", {}, fmtReceived(e.receivedAt)), badgeFor(e.id)));
    (e.source === "gmail" ? gmail : list).append(h("li", {}, btn));
  }
  $("#gmail-section").hidden = !state.emails.some((e) => e.source === "gmail");
}

/* ---------- Selecting and analysing ---------- */
async function selectEmail(id) {
  if (state.selectedEmailId === id) return;
  stopAudio();
  state.selectedEmailId = id;
  state.originalOpen = false;
  renderInbox();
  renderWorkspace();
  renderDock();
  if (!state.analyses[id] && state.status[id] !== "loading") await analyze(id);
}

async function analyze(id, { force = false } = {}) {
  const e = state.emails.find((x) => x.id === id);
  if (!e) return;
  state.status[id] = "loading";
  delete state.errors[id];
  renderInbox();
  if (id === state.selectedEmailId) renderWorkspace();
  try {
    serverCalls.analyze += 1;
    const body = e.source === "demo" ? { emailId: id, force } : { emailId: id, text: e.text, subject: e.subject, from: e.from, lang: e.lang, force };
    let analysis;
    try {
      ({ analysis } = await api("/api/analyze", body));
    } catch (err) {
      // The connection can drop on a long analysis while the server keeps working and saves the result.
      // For demo emails, pick the saved result up instead of failing.
      const dropped = err instanceof TypeError || [502, 503, 504].includes(err.status);
      if (!(dropped && e.source === "demo")) throw err;
      analysis = await waitForSaved(id);
      if (!analysis) throw Object.assign(new Error(t("networkError")), { detail: err.message });
    }
    state.analyses[id] = analysis;
    state.status[id] = "ready";
    const p = per(id);
    if (p.draftText == null) p.draftText = analysis.draftReply || "";
    await loadSavedDraft(id);
    if (id === state.selectedEmailId) announce(t("readyAnnounce"));
  } catch (err) {
    state.status[id] = "error";
    state.errors[id] = err;
  }
  renderInbox();
  if (id === state.selectedEmailId) { renderWorkspace(); renderDock(); }
}

async function waitForSaved(id, maxMs = 180_000) {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 4000));
    try {
      const { analysis } = await api(`/api/analysis/${encodeURIComponent(id)}`);
      if (analysis) return analysis;
    } catch {}
  }
  return null;
}

/* ---------- Workspace ---------- */
function evidenceChips(ids) {
  if (!ids?.length) return null;
  return h("span", { class: "chips" }, ids.map((id) => h("button", {
    type: "button", class: "chip", "aria-label": t("showEvidence", id), onclick: () => showEvidence(id),
  }, id)));
}

function infoRow(n, label, ...body) {
  return h("section", { class: "info-row", "aria-labelledby": `sec-${n}` },
    h("h2", { class: "info-label", id: `sec-${n}` }, h("span", { class: "num" }, String(n)), label),
    h("div", { class: "info-body" }, ...body));
}

function riskTitle(r) {
  return { wrong_weekday: t("wrongWeekday"), deadline_after_event: t("deadlineAfter"), deadline_passed: t("deadlinePassed") }[r.type] || t("condition");
}

function warningCard(r) {
  const code = r.certainty === "checked_in_code";
  return h("article", { class: "warning-card", "aria-labelledby": `risk-${r.id}` },
    h("h3", { id: `risk-${r.id}` }, icon("warning"), `${t("warning")} · ${riskTitle(r)}`),
    h("dl", {},
      h("dt", {}, t("emailSays")), h("dd", {}, `“${r.originalSays}”`, " ", evidenceChips(r.evidenceIds)),
      h("dt", {}, t("checkFound")), h("dd", {}, r.checkFound, " ", h("span", { class: `tag ${code ? "tag-code" : "tag-ai"}` }, code ? t("checkedInCode") : t("fromEmail"))),
      r.meaning ? [h("dt", {}, t("whatMeans")), h("dd", {}, r.meaning)] : null,
      h("dt", {}, t("nextStepRow")), h("dd", {}, r.nextStep || "")),
    r.evidenceIds?.length ? h("button", { type: "button", class: "btn btn-secondary", onclick: () => showEvidence(r.evidenceIds[0]) }, `▾ ${t("viewInOriginal")}`) : null);
}

function renderWorkspace() {
  const ws = $("#workspace");
  const e = currentEmail();
  ws.replaceChildren();
  if (!e) {
    ws.append(h("div", { class: "panel empty" }, h("h1", {}, t("chooseTitle")), h("p", {}, t("chooseBody"))));
    return;
  }
  const a = current();
  const header = h("header", { class: "panel email-header" },
    h("div", { class: "meta" },
      h("span", {}, e.from),
      h("span", {}, fmtReceived(e.receivedAt)),
      e.exampleData ? h("span", { class: "tag tag-neutral" }, t("exampleData")) : null),
    h("h1", { lang: e.lang }, e.subject || "(no subject)"));
  ws.append(header);

  if (state.status[e.id] === "loading" || (!a && !state.errors[e.id])) {
    ws.append(h("div", { class: "panel", role: "status" },
      h("p", { class: "lead" }, t("loadingTitle")), h("p", { class: "hint" }, t("loadingBody")),
      h("div", { class: "skeleton", "aria-hidden": "true" }, h("span"), h("span"), h("span"))));
    ws.append(originalEmailSection(e, null));
    return;
  }
  if (state.errors[e.id]) {
    const err = state.errors[e.id];
    ws.append(h("div", { class: "panel error-state", role: "alert" },
      h("h2", {}, icon("warning"), " ", t("errorTitle")),
      h("p", {}, err.message),
      err.detail ? h("p", { class: "hint" }, err.detail) : null,
      h("button", { type: "button", class: "btn btn-primary", onclick: () => analyze(e.id) }, t("retry"))));
    ws.append(originalEmailSection(e, null));
    return;
  }

  // Source line: AI analysis vs. original are clearly separate.
  const src = h("p", { class: "source-line" },
    a.meta?.source === "stub" ? h("span", { class: "tag tag-ai", style: "color:var(--color-critical-text);border-color:var(--color-critical-border)" }, t("stubLine"))
      : h("span", { class: "tag tag-ai" }, `Gemini${a.meta?.model ? " · " + a.meta.model : ""}`),
    a.meta?.source === "stub" ? "Sample file (team's fake example)." : t("aiLine"), h("span", { class: "tag tag-code" }, icon("check"), t("codeLine")));

  const next = a.easyRead?.find((c) => c.kind === "next");
  const nextText = next?.body || a.risks?.[0]?.nextStep || "";
  const lang = a.lang || e.lang;

  const analysis = h("div", { class: "panel info-order", lang },
    src,
    infoRow(1, t("whatItIs"),
      h("p", { class: "lead" }, a.whatItIs),
      h("p", {}, a.summary)),
    infoRow(2, t("yourAsk"),
      a.asks?.length
        ? a.asks.map((x) => h("div", { class: "ask" }, h("p", { class: "ask-what" }, x.what), h("p", { class: "ask-who" }, x.who, " "), evidenceChips(x.evidenceIds)))
        : h("p", {}, t("noAsk")),
      a.needsReply?.why ? h("p", { class: "hint" }, a.needsReply.why) : null),
    infoRow(3, t("evidence"),
      h("ul", { class: "evidence-list" }, (a.evidence || []).map((ev) => h("li", { class: "evidence-item" },
        h("button", { type: "button", class: "chip", "aria-label": t("showEvidence", ev.id), onclick: () => showEvidence(ev.id) }, ev.id),
        h("blockquote", { class: "evidence-quote", lang: e.lang }, `“${ev.quote}”`))))),
    infoRow(4, h("span", {}, t("risks"), a.risks?.length ? h("span", { class: "risk-count" }, ` (${a.risks.length})`) : null),
      a.risks?.length ? a.risks.map(warningCard) : h("p", { class: "no-risk" }, icon("check"), t("noRisks")),
      a.dates?.length ? h("p", { class: "not-stated" }, h("strong", {}, `${t("datesWritten")}: `),
        a.dates.map((d, i) => [i ? " · " : "", `${d.label}: “${d.asWritten}”`, d.weekdayReal ? ` (${t("checkedAs")} ${d.weekdayReal})` : ""])) : null,
      a.notStated?.length ? h("p", { class: "not-stated" }, h("strong", {}, `${t("notStated")}: `), a.notStated.map((n) => n.field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase()).join(", ")) : null),
    infoRow(5, t("nextStep"),
      h("p", { class: "lead" }, nextText),
      a.junk?.length ? h("p", { class: "not-stated" }, h("strong", {}, `${t("canSkip")}: `), a.junk.map((j) => j.text).join(" · ")) : null),
    a.confidenceNote ? h("p", { class: "confidence" }, `${t("confidence")} ${a.confidenceNote}`) : null,
    a.meta?.quality?.notes?.length ? h("p", { class: "confidence" }, a.meta.quality.notes.join(" ")) : null,
  );
  ws.append(analysis);

  // Modes
  const modes = h("section", { class: "panel modes", "aria-labelledby": "modes-h" },
    h("h2", { id: "modes-h", class: "info-label" }, t("modesLabel")),
    h("div", { class: "mode-switcher", role: "group", "aria-labelledby": "modes-h" },
      [["listen", "ear", t("listen")], ["captions", "cc", t("captions")], ["easyread", "cards", t("easyRead")]].map(([m, ic, label]) =>
        h("button", { type: "button", class: "mode-btn", "aria-pressed": String(state.mode === m), dataset: { mode: m }, onclick: () => setMode(m) }, icon(ic), label))),
    h("p", { class: "mode-hint" }, t("modeHint")),
    h("div", { id: "mode-panel", class: "mode-panel", lang }));
  ws.append(modes);
  ws.append(originalEmailSection(e, a));
  renderModePanel(false);
}

/* ---------- Original email (never deleted; hiding is not deleting) ---------- */
function originalEmailSection(e, a) {
  const body = h("div", { id: "original-body", class: "original-body", lang: e.lang, hidden: !state.originalOpen });
  const marks = (a?.evidence || []).filter((x) => Array.isArray(x.offset)).sort((x, y) => x.offset[0] - y.offset[0]);
  let pos = 0;
  for (const ev of marks) {
    const [s, end] = ev.offset;
    if (s < pos || end > e.text.length) continue;
    body.append(e.text.slice(pos, s));
    body.append(h("mark", { id: `q-${ev.id}`, tabindex: "-1" }, h("span", { class: "ev-label" }, `[${ev.id}]`), e.text.slice(s, end)));
    pos = end;
  }
  body.append(e.text.slice(pos));
  const toggle = h("button", {
    type: "button", class: "btn btn-tertiary", id: "original-toggle", "aria-expanded": String(state.originalOpen), "aria-controls": "original-body",
    onclick: () => setOriginalOpen(!state.originalOpen),
  }, state.originalOpen ? `▴ ${t("hideOriginal")}` : `▾ ${t("showOriginal")}`);
  return h("section", { class: "panel", "aria-labelledby": "orig-h" },
    h("div", { class: "original-head" }, h("h2", { id: "orig-h" }, `${t("original")} `, h("span", { class: "hint" }, `(${t("originalNote")})`)), toggle),
    body);
}
function setOriginalOpen(open) {
  state.originalOpen = open;
  const body = $("#original-body"), tg = $("#original-toggle");
  if (!body || !tg) return;
  body.hidden = !open;
  tg.setAttribute("aria-expanded", String(open));
  tg.textContent = open ? `▴ ${t("hideOriginal")}` : `▾ ${t("showOriginal")}`;
}
function showEvidence(id) {
  setOriginalOpen(true);
  const m = document.getElementById(`q-${id}`);
  if (!m) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  m.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  m.focus({ preventScroll: true });
  m.classList.remove("flash"); void m.offsetWidth; m.classList.add("flash");
}

/* ---------- Modes: one analysis, three renderers ---------- */
function setMode(mode) {
  if (state.mode === mode) return;
  stopAudio();                     // switching stops audio, keeps the position
  state.mode = mode;               // the only thing a switch changes
  document.querySelectorAll(".mode-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  renderModePanel(true);
  announce(t("modeAnnounce", { listen: t("listen"), captions: t("captions"), easyread: t("easyRead") }[mode]));
}

function beatNode(b, i) {
  const risk = b.kind === "risk";
  return h("li", { class: `beat${risk ? " beat-risk" : ""}`, id: `beat-${b.id}`, dataset: { i } },
    h("span", { class: "beat-id" }, b.id),
    h("span", {}, risk ? [icon("warning"), " "] : null, b.text));
}

function renderModePanel(animate) {
  const panel = $("#mode-panel");
  const a = current();
  if (!panel || !a) return;
  panel.replaceChildren();
  panel.classList.remove("fade-in");
  if (animate) { void panel.offsetWidth; panel.classList.add("fade-in"); }
  const beats = a.spokenBeats || [];

  if (state.mode === "listen") {
    panel.append(h("div", { class: "player" },
      h("div", { class: "player-controls" },
        h("button", { type: "button", id: "btn-prev", class: "btn btn-secondary", onclick: () => stepBeat(-1) }, icon("prev"), t("prev")),
        h("button", { type: "button", id: "btn-play", class: "btn btn-primary", onclick: togglePlay }),
        h("button", { type: "button", id: "btn-next", class: "btn btn-secondary", onclick: () => stepBeat(1) }, icon("next"), t("next"))),
      h("div", { class: "progress" }, h("span", { id: "beat-counter" }), h("div", { class: "progress-bar", "aria-hidden": "true" }, h("span", { id: "beat-bar" }))),
      h("p", { id: "audio-status", class: "audio-status", role: "status" }, t("audioIdle")),
      h("ol", { class: "beat-list", "aria-label": "Spoken beats" }, beats.map(beatNode))));
  } else if (state.mode === "captions") {
    panel.append(h("div", { class: "captions" },
      a.needsReply?.value ? h("p", {}, h("span", { class: "tag tag-must" }, icon("dot"), t("mustReply"))) : null,
      h("p", { class: "hint" }, t("captionsNoSound")),
      h("p", { id: "cap-prev", class: "caption-prev", "aria-hidden": "true" }),
      h("div", { id: "cap-current", class: "caption-current", role: "region", "aria-live": "polite", "aria-label": "Current caption" }),
      h("p", { id: "cap-next", class: "caption-next", "aria-hidden": "true" }),
      h("div", { class: "player-controls" },
        h("button", { type: "button", id: "btn-prev", class: "btn btn-secondary", onclick: () => stepBeat(-1) }, icon("prev"), t("prev")),
        h("span", { id: "beat-counter", class: "caption-counter" }),
        h("button", { type: "button", id: "btn-next", class: "btn btn-secondary", onclick: () => stepBeat(1) }, icon("next"), t("next")))));
  } else {
    const kindLabel = { what: "What", ask: "Ask", when: "When", risk: "Risk", skip: "Skip", next: "Next step" };
    panel.append(h("div", { class: "easy-cards" }, (a.easyRead || []).map((c) =>
      h("article", { class: `easy-card k-${c.kind}`, "aria-labelledby": `card-${c.id}` },
        h("h3", { id: `card-${c.id}` }, c.kind === "risk" ? icon("warning") : null, c.kind === "risk" && !/warning|注意/i.test(c.title) ? `${t("warning")}: ` : null, c.title,
          h("span", { class: "kind" }, ` · ${kindLabel[c.kind] || c.kind}`)),
        String(c.body || "").split("\n").filter(Boolean).map((line) => h("p", {}, line)),
        evidenceChips(c.evidenceIds)))));
  }
  syncBeat();
}

function syncBeat() {
  const a = current();
  if (!a) return;
  const beats = a.spokenBeats || [];
  const p = per();
  const i = Math.min(p.currentBeatIndex, Math.max(0, beats.length - 1));
  const counter = $("#beat-counter");
  if (counter) counter.textContent = beats.length ? `${beats[i].id} · ${t("beatOf", i + 1, beats.length)}` : "";
  const bar = $("#beat-bar");
  if (bar) bar.style.width = beats.length ? `${((i + 1) / beats.length) * 100}%` : "0";
  const prev = $("#btn-prev"), next = $("#btn-next");
  if (prev) prev.disabled = i <= 0;
  if (next) next.disabled = i >= beats.length - 1;
  document.querySelectorAll(".beat").forEach((li) => li.setAttribute("aria-current", String(Number(li.dataset.i) === i)));
  const play = $("#btn-play");
  if (play) {
    const label = state.isPlaying && state.audioKind === "beat" ? t("pause") : (p.started && !p.finished ? t("resume") : t("play"));
    play.replaceChildren(icon(state.isPlaying && state.audioKind === "beat" ? "pause" : "play"), label);
  }
  const cur = $("#cap-current");
  if (cur && beats[i]) {
    const risk = beats[i].kind === "risk";
    cur.classList.toggle("is-risk", risk);
    cur.replaceChildren(
      h("span", { class: "cap-label" }, risk ? [icon("warning"), t("warning")] : beats[i].id),
      h("span", {}, beats[i].text),
      beats[i].evidenceIds?.length ? evidenceChips(beats[i].evidenceIds) : null);
    $("#cap-prev").textContent = beats[i - 1]?.text || "";
    $("#cap-next").textContent = beats[i + 1]?.text || "";
  }
}

function stepBeat(d) {
  const beats = current()?.spokenBeats || [];
  const p = per();
  const n = Math.max(0, Math.min(beats.length - 1, p.currentBeatIndex + d));
  if (n === p.currentBeatIndex) return;
  p.currentBeatIndex = n;
  p.finished = false;
  if (state.isPlaying && state.audioKind === "beat") playBeat(n);
  else { audio.removeAttribute("src"); p.resumeAt = null; }
  syncBeat();
}

/* ---------- Audio (Cloud TTS, one clip per beat, never autoplay) ---------- */
const audio = $("#audio");
function setAudioStatus(msg, isError = false) {
  const s = $("#audio-status");
  if (s) { s.textContent = msg; s.classList.toggle("audio-error", isError); }
}
// One clip per beat, fetched when needed (the next beat is prefetched while one plays).
// The server queues TTS calls so a low rate limit never drops a beat.
function getClip(a, i) {
  const key = `${a.emailId}:${a.lang}:${state.rate}`;
  const c = (clips[key] ||= { data: {}, mimes: {}, engine: "", pending: {} });
  const b = a.spokenBeats[i];
  if (!b) return Promise.resolve(null);
  if (c.data[b.id]) return Promise.resolve({ data: c.data[b.id], mime: c.mimes[b.id], engine: c.engine });
  if (!c.pending[b.id]) {
    serverCalls.speak += 1;
    c.pending[b.id] = api("/api/speak", { beats: [{ id: b.id, text: b.text }], lang: a.lang, rate: state.rate })
      .then((r) => {
        c.data[b.id] = r.clips[b.id]; c.mimes[b.id] = r.mimes?.[b.id] || "audio/mpeg"; c.engine = r.engine || c.engine;
        return { data: c.data[b.id], mime: c.mimes[b.id], engine: c.engine };
      })
      .finally(() => { delete c.pending[b.id]; });
  }
  return c.pending[b.id];
}
let playToken = 0;
async function playBeat(i) {
  const a = current();
  const token = ++playToken;
  const p = per();
  try {
    const ready = clips[`${a.emailId}:${a.lang}:${state.rate}`]?.data[a.spokenBeats[i]?.id];
    if (!ready) setAudioStatus(t("audioLoading"));
    const c = await getClip(a, i);
    getClip(a, i + 1)?.catch(() => {}); // prefetch the next beat
    if (token !== playToken || state.mode !== "listen") return;
    const b = a.spokenBeats[i];
    audio.src = `data:${c.mime || "audio/mpeg"};base64,${c.data}`;
    audio.dataset.engine = c.engine || "";
    audio.dataset.beat = b.id;
    audio.playbackRate = 1;
    state.isPlaying = true; state.audioKind = "beat"; p.started = true; p.finished = false;
    await audio.play();
    setAudioStatus(`${t("audioPlaying", b.id)}${c.engine ? " · " + c.engine : ""}`);
  } catch (err) {
    if (token !== playToken) return;
    state.isPlaying = false; state.audioKind = null;
    setAudioStatus(err.name === "NotAllowedError" ? err.message : (err.message || "Audio failed."), true);
  }
  syncBeat();
}
function togglePlay() {
  const p = per();
  const beats = current()?.spokenBeats || [];
  if (state.isPlaying && state.audioKind === "beat") {
    audio.pause();
    state.isPlaying = false;
    setAudioStatus(t("audioPaused", beats[p.currentBeatIndex]?.id));
    syncBeat();
    return;
  }
  if (state.audioKind === "draft") stopAudio();
  if (p.finished) { p.currentBeatIndex = 0; p.finished = false; }
  const b = beats[p.currentBeatIndex];
  if (audio.dataset.beat === b?.id && audio.getAttribute("src") && audio.currentTime > 0 && !audio.ended) {
    state.isPlaying = true; state.audioKind = "beat";
    audio.play().then(() => setAudioStatus(t("audioPlaying", b.id))).catch((e) => setAudioStatus(e.message, true));
    syncBeat();
  } else {
    playBeat(p.currentBeatIndex);
  }
}
audio.addEventListener("ended", () => {
  if (state.audioKind === "draft") { state.isPlaying = false; state.audioKind = null; syncDraftListen(); return; }
  if (state.audioKind !== "beat") return;
  const p = per();
  const beats = current()?.spokenBeats || [];
  if (p.currentBeatIndex < beats.length - 1) {
    p.currentBeatIndex += 1;
    syncBeat();
    playBeat(p.currentBeatIndex);
  } else {
    state.isPlaying = false; state.audioKind = null; p.finished = true;
    setAudioStatus(t("audioDone"));
    syncBeat();
  }
});
function stopAudio() {
  playToken++;
  if (!audio.paused) audio.pause();
  const wasDraft = state.audioKind === "draft";
  state.isPlaying = false;
  if (wasDraft) { audio.removeAttribute("src"); delete audio.dataset.beat; }
  state.audioKind = null;
  syncDraftListen();
}

/* ---------- Draft Dock: edit clears approval; mode switch keeps it; approve never sends ---------- */
const dock = $("#dock"), preview = $("#draft-preview"), editor = $("#draft-editor");
const btnEdit = $("#draft-edit"), btnApprove = $("#draft-approve"), statusEl = $("#approval-status"), btnListenDraft = $("#draft-listen");

function renderDock() {
  const a = current();
  const has = Boolean(a);
  dock.classList.toggle("is-empty", !has);
  if (!has) {
    preview.textContent = t("noDraft");
    editor.hidden = true; preview.hidden = false;
    statusEl.replaceChildren();
    statusEl.classList.remove("is-approved");
    return;
  }
  const p = per();
  const lang = currentEmail()?.lang || "en";
  preview.lang = lang; editor.lang = lang;
  preview.textContent = p.draftText.replace(/\s*\n\s*/g, " ");
  if (editor.value !== p.draftText) editor.value = p.draftText;
  editor.hidden = !p.editing;
  preview.hidden = p.editing;
  btnEdit.textContent = p.editing ? t("doneEditing") : t("editDraft");
  btnEdit.setAttribute("aria-expanded", String(p.editing));
  btnEdit.setAttribute("aria-controls", "draft-editor");
  syncApproval();
  syncDraftListen();
  updateDockHeight();
}
function syncApproval() {
  const p = per();
  const approved = p.approvalState === "approved";
  statusEl.classList.toggle("is-approved", approved);
  statusEl.replaceChildren(approved ? icon("check") : "", approved ? t("approvedNotSent") : t("notApproved"));
  btnApprove.disabled = approved;
  btnApprove.textContent = approved ? t("approved") : t("approveDraft");
}
function syncDraftListen() {
  btnListenDraft.textContent = state.audioKind === "draft" && state.isPlaying ? t("stopDraft") : t("listenDraft");
}
btnEdit.addEventListener("click", () => {
  if (!current()) return;
  const p = per();
  p.editing = !p.editing;
  renderDock();
  if (p.editing) editor.focus(); else btnEdit.focus();
});
editor.addEventListener("input", () => {
  const p = per();
  p.draftText = editor.value;
  preview.textContent = p.draftText.replace(/\s*\n\s*/g, " ");
  if (p.approvalState === "approved") {
    p.approvalState = "none";
    syncApproval();
    announce(t("approvalCleared"));
  }
  saveDraft();
});
editor.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { per().editing = false; renderDock(); btnEdit.focus(); } });
btnApprove.addEventListener("click", () => {
  if (!current()) return;
  const p = per();
  p.approvalState = "approved";   // recorded only. Nothing is sent.
  syncApproval();
  announce(t("approvedNotSent"));
  saveDraft();
});
btnListenDraft.addEventListener("click", async () => {
  const a = current();
  if (!a) return;
  if (state.audioKind === "draft" && state.isPlaying) { stopAudio(); return; }
  stopAudio();
  syncBeat();
  const text = per().draftText;
  try {
    btnListenDraft.disabled = true;
    serverCalls.speak += 1;
    const r = await api("/api/speak", { beats: [{ id: "DRAFT", text }], lang: currentEmail()?.lang === "ja" ? "ja" : "en", rate: state.rate });
    audio.src = `data:${r.mimes?.DRAFT || "audio/mpeg"};base64,${r.clips.DRAFT}`;
    delete audio.dataset.beat;
    state.isPlaying = true; state.audioKind = "draft";
    await audio.play();
  } catch (err) {
    state.isPlaying = false; state.audioKind = null;
    announce(err.message);
    statusEl.title = err.message;
  } finally {
    btnListenDraft.disabled = false;
    syncDraftListen();
  }
});
function updateDockHeight() {
  document.documentElement.style.setProperty("--dock-h", `${dock.offsetHeight}px`);
}
new ResizeObserver(updateDockHeight).observe(dock);

/* ---------- Persistence of drafts (Firestore when signed in) ---------- */
let fb = null;
let saveTimer = null;
function saveDraft() {
  if (!fb || !state.user) return;
  clearTimeout(saveTimer);
  const id = state.selectedEmailId, p = per();
  saveTimer = setTimeout(() => fb.saveDraft(state.user.uid, id, { draftText: p.draftText, approvalState: p.approvalState }).catch(() => {}), 600);
}
async function loadSavedDraft(id) {
  if (!fb || !state.user) return;
  try {
    const d = await fb.loadDraft(state.user.uid, id);
    if (d) { const p = per(id); p.draftText = d.draftText ?? p.draftText; p.approvalState = d.approvalState || "none"; }
  } catch {}
}

/* ---------- Paste an email ---------- */
const dlg = $("#paste-dialog");
$("#paste-btn").addEventListener("click", () => dlg.showModal());
$("#paste-cancel").addEventListener("click", () => dlg.close());
$("#paste-form").addEventListener("submit", (ev) => {
  const text = $("#paste-text").value.trim();
  if (!text) { ev.preventDefault(); return; }
  const id = `pasted-${Date.now().toString(36)}`;
  state.emails.push({
    id, source: "pasted", text, subject: $("#paste-subject").value.trim() || text.split("\n")[0].slice(0, 80),
    from: "Pasted email", receivedAt: new Date().toISOString(), lang: /[぀-ヿ一-龯]/.test(text) ? "ja" : "en",
  });
  $("#paste-text").value = ""; $("#paste-subject").value = "";
  selectEmail(id);
});

/* ---------- Header controls ---------- */
function applyUiLang() {
  document.documentElement.lang = uiLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  const b = $("#ui-lang");
  b.textContent = uiLang === "ja" ? "English" : "日本語";
  b.lang = uiLang === "ja" ? "en" : "ja";
  b.setAttribute("aria-label", uiLang === "ja" ? "Switch the interface to English" : "日本語の表示に切り替え");
  if (state.user) $("#signin").textContent = t("signout");
}
$("#ui-lang").addEventListener("click", () => {
  uiLang = uiLang === "ja" ? "en" : "ja";
  try { localStorage.setItem("jeri.uiLang", uiLang); } catch {}
  applyUiLang();
  renderInbox(); renderWorkspace(); renderDock();
});
$("#rate").addEventListener("change", (e) => { stopAudio(); state.rate = Number(e.target.value) || 1; syncBeat(); });

/* ---------- Google sign-in + Gmail (read-only) via Firebase, when configured ---------- */
async function initFirebase(config) {
  try {
    fb = await import("./firebase.js");
    await fb.init(config);
  } catch (e) { console.warn("Firebase not available:", e); fb = null; return; }
  const btn = $("#signin");
  btn.hidden = false;
  fb.onUser(async (user) => {
    state.user = user;
    $("#account").hidden = !user;
    $("#account").textContent = user ? user.email || user.displayName : "";
    btn.textContent = user ? t("signout") : t("signin");
    if (!user) { state.emails = state.emails.filter((e) => e.source !== "gmail"); renderInbox(); }
  });
  btn.addEventListener("click", async () => {
    if (state.user) { await fb.signOut(); return; }
    try {
      const { token } = await fb.signIn();
      const mails = await fb.listGmail(token, 10);
      state.emails = state.emails.filter((e) => e.source !== "gmail").concat(mails.map((m) => ({ ...m, source: "gmail" })));
      renderInbox();
    } catch (e) { announce(e.message); alert(e.message); }
  });
}

/* ---------- Boot ---------- */
async function boot() {
  applyUiLang();
  renderWorkspace();
  renderDock();
  try {
    state.config = await api("/api/config");
    $("#stub-banner").hidden = !state.config.stub;
    const demo = await api("/api/emails");
    state.emails = demo.map((e) => ({ ...e, source: "demo" }));
    renderInbox();
    // Badges from saved analyses only (no Gemini call).
    await Promise.all(state.emails.map(async (e) => {
      try {
        const { analysis } = await api(`/api/analysis/${encodeURIComponent(e.id)}`);
        if (!analysis) return;
        state.analyses[e.id] = analysis; state.status[e.id] = "ready";
        per(e.id).draftText ??= analysis.draftReply || "";
      } catch {}
    }));
    renderInbox();
    if (state.config.firebase) initFirebase(state.config.firebase);
  } catch (e) {
    $("#workspace").replaceChildren(h("div", { class: "panel error-state", role: "alert" }, h("h1", {}, t("errorTitle")), h("p", {}, e.message)));
  }
}
boot();
