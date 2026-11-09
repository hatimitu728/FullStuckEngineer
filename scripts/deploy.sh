#!/bin/sh
# Deploy Jeri to Cloud Run from your own machine (needs gcloud logged in).
# Usage: GEMINI_API_KEY=... PROJECT_ID=my-project sh scripts/deploy.sh
set -eu
: "${PROJECT_ID:?set PROJECT_ID}"
: "${GEMINI_API_KEY:?set GEMINI_API_KEY}"
REGION="${REGION:-asia-northeast1}"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  generativelanguage.googleapis.com texttospeech.googleapis.com firestore.googleapis.com --project "$PROJECT_ID"
ENV="GEMINI_API_KEY=${GEMINI_API_KEY},FIRESTORE_PROJECT_ID=${FIRESTORE_PROJECT_ID:-$PROJECT_ID}"
[ -n "${FIREBASE_API_KEY:-}" ] && ENV="$ENV,FIREBASE_API_KEY=$FIREBASE_API_KEY,FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN,FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID,FIREBASE_APP_ID=$FIREBASE_APP_ID"
gcloud run deploy jeri --source . --project "$PROJECT_ID" --region "$REGION" \
  --allow-unauthenticated --min-instances 1 --memory 512Mi --set-env-vars "$ENV"
