#!/bin/sh
# Deploy the Jeri page to Firebase Hosting (free Spark plan, no billing needed). Run in Google Cloud Shell.
# Usage: sh scripts/deploy-firebase.sh [PROJECT_ID]
set -u
PROJECT="${1:-$(gcloud config get-value project 2>/dev/null)}"
[ -n "$PROJECT" ] || { echo "❌ プロジェクトIDが必要です / project id needed: sh scripts/deploy-firebase.sh <PROJECT_ID>"; exit 1; }
FB="firebase"; command -v firebase >/dev/null 2>&1 || FB="npx --yes firebase-tools"
echo "== 1/3 Firebase をプロジェクトに追加 / adding Firebase to $PROJECT (already added = ok)"
$FB projects:addfirebase "$PROJECT" 2>&1 | tail -2
echo "== 2/3 ビルド + デプロイ / build + deploy"
$FB deploy --only hosting --project "$PROJECT" || {
  echo ""; echo "❌ デプロイ失敗 / deploy failed."
  echo "   ログインが必要な場合: $FB login --no-localhost  を実行してから、もう一度このスクリプトを実行してください。"
  exit 1; }
echo ""
echo "== 3/3 確認 / check"
echo "✅ Live URL (Firebase Hosting): https://$PROJECT.web.app"
