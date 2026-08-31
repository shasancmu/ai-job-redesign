#!/usr/bin/env bash
# Deploy the sciscore inference service to Cloud Run from source (no local Docker).
# Prereq: gcloud installed + `gcloud auth login` done. Run from anywhere.
#
#   PROJECT=your-gcp-project bash ml/deploy_cloudrun.sh
#
# Optional overrides: REGION (default us-central1), SERVICE (default sciscore),
# SCISCORE_API_KEY (auto-generated if unset — printed so you can save it).
set -euo pipefail

PROJECT="${PROJECT:?Set PROJECT=your-gcp-project}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-sciscore}"
SCISCORE_API_KEY="${SCISCORE_API_KEY:-$(openssl rand -hex 24)}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Project: $PROJECT | Region: $REGION | Service: $SERVICE"
gcloud config set project "$PROJECT"

echo "Enabling APIs (Run, Cloud Build, Artifact Registry)…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

echo "Deploying from source (Cloud Build builds the image)…"
gcloud run deploy "$SERVICE" \
  --source "$HERE" \
  --region "$REGION" \
  --memory 4Gi --cpu 2 \
  --concurrency 4 \
  --min-instances 0 --max-instances 3 \
  --timeout 120 \
  --allow-unauthenticated \
  --set-env-vars "SCISCORE_API_KEY=$SCISCORE_API_KEY"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo
echo "======================================================================"
echo "Deployed:  $URL"
echo "API key:   $SCISCORE_API_KEY"
echo
echo "Set these in your app env (Vercel + .env.local):"
echo "  SCISCORE_URL=$URL"
echo "  SCISCORE_API_KEY=$SCISCORE_API_KEY"
echo
echo "Smoke test:"
echo "  curl $URL/health"
echo "  curl -X POST $URL/score -H \"Authorization: Bearer $SCISCORE_API_KEY\" \\"
echo "    -H 'Content-Type: application/json' -d '{\"task\":\"defense_impact\",\"text\":\"<abstract>\"}'"
echo "======================================================================"
