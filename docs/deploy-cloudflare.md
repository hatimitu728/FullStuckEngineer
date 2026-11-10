# Cloudflare Workers にデプロイ（無料）/ Deploy to Cloudflare Workers (free)

Jeri runs on the Cloudflare Workers **free plan**: the page is served as static files, `/api/*` runs in a Worker,
saved analyses and voice clips live in **Workers KV**, and the Gemini key is a **Worker secret** (never in code or GitHub).

## 必要なもの / You need
1. **Node.js 20 以上** – https://nodejs.org （Windows は「LTS」をインストール）
2. **Cloudflare アカウント**（無料）
3. **AI Studio の無料 Gemini API キー** – 課金を有効に**していない**プロジェクトで作ったもの。
   課金ありのプロジェクトのキーは「402 prepayment credits depleted」で動きません。

## 手順 / Steps（PowerShell / ターミナル）
```bash
git clone https://github.com/hatimitu728/FullStuckEngineer.git
cd FullStuckEngineer
npm install
npm run deploy:cf
```
- ブラウザが開いたら Cloudflare にログインして **Allow** を押す。
- 「キーを貼り付けて Enter」と出たら Gemini API キーを貼る（画面には出ません）。
- 最後に **`✅ Live URL: https://jeri.<あなたのサブドメイン>.workers.dev`** が出ます。誰でも開けるURLです。

### 自分のドメインのサブドメインにする / Your own subdomain
ドメインが Cloudflare にある場合（例: `example.com`）:
```bash
npm run deploy:cf -- jeri.example.com
```
→ `https://jeri.example.com` で公開されます（DNS と証明書は自動）。

## 無料枠について / Free-tier notes
- Gemini 無料枠: 解析は混雑時に自動で別モデルへ。音声（Gemini TTS）は **1モデル1日約10回**。作った音声は KV に保存して再利用します。
  **録画の前に一度、Northbridge を Listen で最後まで再生**しておくと、本番は保存済みの音声が流れます。
- Cloudflare 無料枠: Workers 1日10万リクエスト、KV 書き込み 1日1000回 – デモには十分です。

## 更新 / Update
```bash
git pull && npx wrangler deploy
```

## ローカルで試す / Run locally
```bash
npx wrangler dev --var GEMINI_API_KEY:<your key>
```
→ http://localhost:8787
