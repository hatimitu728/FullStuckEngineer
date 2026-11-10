#!/bin/sh
# Deploy Jeri to Cloud Run (works in Google Cloud Shell or anywhere gcloud is logged in).
# Usage: GEMINI_API_KEY=... PROJECT_ID=my-project sh scripts/deploy.sh
set -u
REGION="${REGION:-asia-northeast1}"
fail() { echo ""; echo "❌ $1"; echo "   $2"; exit 1; }

[ -n "${GEMINI_API_KEY:-}" ] || fail "GEMINI_API_KEY が空です / GEMINI_API_KEY is empty." \
  "read -s -p \"Gemini API key: \" GEMINI_API_KEY; echo  を実行してキーを貼り付けてください。"
[ -n "${PROJECT_ID:-}" ] || fail "PROJECT_ID が空です / PROJECT_ID is empty." \
  "gcloud projects list で PROJECT_ID を確認し、gcloud config set project <PROJECT_ID> を実行してください。"

echo "== 1/6 プロジェクト確認 / checking project: $PROJECT_ID"
gcloud projects describe "$PROJECT_ID" --format='value(projectId)' >/dev/null 2>&1 || {
  echo "あなたのプロジェクト一覧 / your projects:"; gcloud projects list --format='table(projectId,name)'
  fail "プロジェクト $PROJECT_ID が見つかりません / project not found." \
    "上の一覧の PROJECT_ID（名前ではなくID）で gcloud config set project <ID> を実行し、もう一度デプロイしてください。"
}
gcloud config set project "$PROJECT_ID" >/dev/null 2>&1

echo "== 2/6 課金確認 / checking billing"
BILLING=$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null)
[ "$BILLING" = "True" ] || fail "このプロジェクトに課金（請求先アカウント）がリンクされていません / billing is not enabled." \
  "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID でクレジットの入った請求先アカウントをリンクしてから、もう一度実行してください。"

echo "== 3/6 API を有効化（初回は1〜2分）/ enabling APIs"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  generativelanguage.googleapis.com texttospeech.googleapis.com firestore.googleapis.com || \
  fail "API を有効にできませんでした / could not enable APIs." "1分待ってからもう一度実行してください。"

echo "== 4/6 ビルド用の権限 / build permissions"
NUM=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="${NUM}-compute@developer.gserviceaccount.com"
echo "   build service account: $SA"
GRANTED=0
for ROLE in roles/run.builder roles/storage.objectViewer roles/artifactregistry.writer roles/logging.logWriter; do
  if gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role="$ROLE" \
      --condition=None --quiet --format=none; then
    echo "   ok $ROLE"; GRANTED=1
  else
    echo "   ⚠ could not grant $ROLE (see message above)"
  fi
done
if [ "$GRANTED" = 1 ]; then
  echo "   権限の反映を90秒待ちます / waiting 90s for IAM to apply…"; sleep 90
fi

echo "== 5/6 Firestore データベース"
gcloud firestore databases create --location="$REGION" --type=firestore-native >/dev/null 2>&1 \
  && echo "   created" || echo "   already exists (ok)"

echo "== 6/6 Cloud Run にデプロイ（3〜5分）/ deploying"
ENV="GEMINI_API_KEY=${GEMINI_API_KEY},FIRESTORE_PROJECT_ID=${FIRESTORE_PROJECT_ID:-$PROJECT_ID}"
if [ -n "${FIREBASE_API_KEY:-}" ]; then
  ENV="$ENV,FIREBASE_API_KEY=$FIREBASE_API_KEY,FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN,FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-$PROJECT_ID},FIREBASE_APP_ID=$FIREBASE_APP_ID"
fi
gcloud run deploy jeri --source . --region "$REGION" \
  --allow-unauthenticated --min-instances 1 --max-instances 1 --timeout 600 --memory 1Gi --no-cpu-throttling \
  --set-env-vars "$ENV" --quiet || \
  fail "デプロイに失敗しました / deploy failed." \
    "上のエラーの最後の10行を Claude に貼ってください（APIキーは貼らないでください）。"

URL=$(gcloud run services describe jeri --region "$REGION" --format 'value(status.url)')
echo ""
echo "✅ Live URL: $URL"
echo "   Health:   $(curl -s "$URL/api/health")"
