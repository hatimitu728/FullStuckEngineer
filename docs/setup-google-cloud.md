# Google Cloud setup for Jeri (credit → key → live URL) / セットアップ手順

Takes about 15 minutes. Use ONE Google account for all steps.

## 1. Redeem the credit / クレジットを有効にする
1. Sign in to https://console.cloud.google.com/ with your Google account.
2. If asked, create a billing account (お支払い). The coupon needs a billing account; the credit is used before any charge.
3. Open **https://cloud.google.com/redeem**, enter the promotion code (プロモーションコード), and accept.
4. Check: Console → **お支払い (Billing)** → **請求先アカウント (Billing account)** → **クレジット (Credits)**: the promotion is listed.

## 2. Create the project / プロジェクトを作成
1. Console → project picker → **新しいプロジェクト (New project)** → name `jeri-devfest` → Create.
2. Billing → **アカウントをリンク (Link a billing account)** to the account with the credit.

## 3. Create the Gemini API key / APIキーを作成
1. Open https://aistudio.google.com/apikey → **Create API key** → choose the project `jeri-devfest`.
2. This one key is used for Gemini analysis **and** Gemini 3.8 Flash TTS.
3. Never paste the key in chat, Discord, screenshots or the video.

## 4. Give the key to Claude's session (for the CORE gate)
Claude Code environment menu (session title bar) → **Edit** → **Network secrets** → add:
- Host: `generativelanguage.googleapis.com` · Header: `x-goog-api-key` · Value: the key
- Optional (fallback voice): the same for `texttospeech.googleapis.com`

## 5. Deploy the live URL from Cloud Shell / Cloud Shellからデプロイ
Console → **Cloud Shell** (>_ icon, top right), then:
```bash
git clone https://github.com/hatimitu728/FullStuckEngineer.git && cd FullStuckEngineer
git checkout claude/product-dev-collab-e9hj8k
read -s -p "Gemini API key: " GEMINI_API_KEY; echo
GEMINI_API_KEY="$GEMINI_API_KEY" PROJECT_ID="$(gcloud config get-value project)" sh scripts/deploy.sh
```
(If the repo is private, Cloud Shell asks for GitHub login: use a GitHub personal access token as the password.)
The script prints **Live URL**. Open it once in a private window before recording (Cloud Run warm-up).

## 6. Optional: Google sign-in + Gmail (extra, cut at 12:00 if not working)
Firebase console → Add project → choose `jeri-devfest` → Authentication → Google → Enable → add the live domain to **Authorized domains**. Then re-run step 5 with `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_APP_ID` set (public web config values).
