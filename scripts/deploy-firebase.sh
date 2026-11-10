#!/bin/sh
# Deploy the Jeri page to Firebase Hosting (free Spark plan, no billing needed). Run in Google Cloud Shell.
# Usage:
#   sh scripts/deploy-firebase.sh --new          create a new free Firebase project in YOUR account and deploy there
#   sh scripts/deploy-firebase.sh <PROJECT_ID>   deploy to a Firebase project you already own
set -u
FB="firebase"; command -v firebase >/dev/null 2>&1 || FB="npx --yes firebase-tools"
ARG="${1:-}"
[ -n "$ARG" ] || { echo "使い方 / usage:  sh scripts/deploy-firebase.sh --new   (または / or)   sh scripts/deploy-firebase.sh <PROJECT_ID>"; exit 1; }

if [ "$ARG" = "--new" ]; then
  echo "== 1/3 新しい Firebase プロジェクトを作成 / creating a new Firebase project (free)"
  PROJECT=""
  for ID in jeri-fullstuckengineer jeri-fse-2026 jeri-devfest-2026 "jeri-fse-$(date +%s | tail -c 7)"; do
    echo "   trying: $ID"
    if $FB projects:create "$ID" --display-name "Jeri" >/tmp/jeri-fb-create.log 2>&1; then PROJECT="$ID"; break; fi
    tail -2 /tmp/jeri-fb-create.log | sed 's/^/     /'
  done
  [ -n "$PROJECT" ] || {
    echo "❌ プロジェクトを作成できませんでした / could not create a project."
    echo "   https://console.firebase.google.com で「プロジェクトを追加」→ 作成後、 sh scripts/deploy-firebase.sh <そのプロジェクトID> を実行してください。"
    exit 1; }
  echo "   ✅ created: $PROJECT"
else
  PROJECT="$ARG"
  echo "== 1/3 プロジェクト確認 / checking project $PROJECT"
  $FB projects:list 2>/dev/null | grep -q "$PROJECT" || {
    echo "   Firebase プロジェクト一覧に見つかりません。追加を試みます / not in your Firebase projects yet, trying to add Firebase…"
    $FB projects:addfirebase "$PROJECT" 2>&1 | tail -2
  }
fi

echo "== 2/3 ビルド + デプロイ / build + deploy → $PROJECT"
$FB deploy --only hosting --project "$PROJECT" || {
  echo ""; echo "❌ デプロイ失敗 / deploy failed."
  echo "   ・403 / permission denied → このアカウントはそのプロジェクトの権限がありません。 sh scripts/deploy-firebase.sh --new を使ってください。"
  echo "   ・ログインが必要 → $FB login --no-localhost を実行してから、もう一度。"
  exit 1; }
echo ""
echo "== 3/3 完了 / done"
echo "✅ Live URL (Firebase Hosting): https://$PROJECT.web.app"
