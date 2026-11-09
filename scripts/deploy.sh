#!/bin/sh
# Deploy Jeri to Cloud Run (works in Google Cloud Shell or anywhere gcloud is logged in).
# Usage: GEMINI_API_KEY=... PROJECT_ID=my-project sh scripts/deploy.sh
set -eu
: "${PROJECT_ID:?set PROJECT_ID}"
: "${GEMINI_API_KEY:?set GEMINI_API_KEY}"
REGION="${REGION:-asia-northeast1}"
gcloud config set project "$PROJECT_ID" >/dev/null
echo "Enabling APIs (first time takes ~1 minute)…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  generativelanguage.googleapis.com texttospeech.googleapis.com firestore.googleapis.com
# Firestore database for saved analyses (ignored if it already exists).
gcloud firestore databases create --location="$REGION" --type=firestore-native 2>/dev/null \
  && echo "Firestore database created." || echo "Firestore database already exists (or skipped)."
ENV="GEMINI_API_KEY=${GEMINI_API_KEY},FIRESTORE_PROJECT_ID=${FIRESTORE_PROJECT_ID:-$PROJECT_ID}"
if [ -n "${FIREBASE_API_KEY:-}" ]; then
  ENV="$ENV,FIREBASE_API_KEY=$FIREBASE_API_KEY,FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN,FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-$PROJECT_ID},FIREBASE_APP_ID=$FIREBASE_APP_ID"
fi
gcloud run deploy jeri --source . --region "$REGION" \
  --allow-unauthenticated --min-instances 1 --memory 512Mi --set-env-vars "$ENV" --quiet
URL=$(gcloud run services describe jeri --region "$REGION" --format 'value(status.url)')
echo ""
echo "Live URL: $URL"
echo "Health:   $(curl -s "$URL/api/health")"
