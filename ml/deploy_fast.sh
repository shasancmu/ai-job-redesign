#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Fast redeploy of the sciscore model service — for iterating on SERVER CODE.
#
# Builds the image in Cloud Build with Kaniko LAYER CACHING (no local Docker
# needed), then rolls a new Cloud Run revision from that image. The heavy layers
# (torch/transformers install, SciBERT download) are cached in Artifact Registry,
# so a code-only change deploys in ~1-2 min instead of the ~8 min a cache-less
# `deploy_cloudrun.sh --source` build takes.
#
# Deploying with --image PRESERVES the service's existing env — so, unlike
# deploy_cloudrun.sh, this does NOT rotate the SCISCORE_API_KEY. Use this for
# server-code iteration; use deploy_cloudrun.sh for a first-time / from-scratch
# deploy or when you deliberately want to set a new key.
#
# Usage (gcloud is at ~/google-cloud-sdk/bin, not on PATH):
#   PATH="$HOME/google-cloud-sdk/bin:$PATH" bash ml/deploy_fast.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT="${PROJECT:-com-sci-2}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-sciscore}"
REPO="${REPO:-cloud-run-source-deploy}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}"
TAG="$(git -C "$HERE" rev-parse --short HEAD 2>/dev/null || date +%s)"

echo "Project: $PROJECT | Region: $REGION | Service: $SERVICE"
echo "Image:   $IMAGE:$TAG"
gcloud config set project "$PROJECT" >/dev/null

# 1) Build (Kaniko, cached). First run seeds the cache and is still slow; every
#    run after that reuses the torch/transformers/SciBERT layers.
echo "Building (Kaniko, cached)…"
gcloud builds submit "$HERE" \
  --config "$HERE/cloudbuild.fast.yaml" \
  --substitutions "_IMAGE=${IMAGE},_TAG=${TAG}"

# 2) Roll a new revision from the image. No --set-env-vars, so the existing env
#    (including SCISCORE_API_KEY) is preserved. The warm/boost flags keep the
#    startup preload inside the health-probe window (see the deploy reference).
echo "Deploying revision…"
gcloud run deploy "$SERVICE" \
  --image "${IMAGE}:${TAG}" \
  --region "$REGION" \
  --memory 4Gi --cpu 2 \
  --concurrency 4 \
  --min-instances 1 --max-instances 3 \
  --no-cpu-throttling --cpu-boost \
  --timeout 120 \
  --allow-unauthenticated

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo "Done. Serving: $URL"
