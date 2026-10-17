#!/usr/bin/env bash
set -euo pipefail

PROJECT="${1:-${GOOGLE_CLOUD_PROJECT:-project-6804402b-5017-4cc9-96c}}"
BUCKET="${GCS_BUCKET:-curio-assets-${PROJECT}}"
ASSET_DIR="${2:-frontend/public/generated/studio}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI is required. Install Google Cloud CLI first." >&2
  exit 1
fi

if [[ ! -d "$ASSET_DIR" ]]; then
  echo "ERROR: Local demo assets directory not found: $ASSET_DIR" >&2
  echo "Run this from the repository root, and make sure your locally generated assets are present." >&2
  exit 1
fi

if ! gcloud storage buckets describe "gs://$BUCKET" --project="$PROJECT" >/dev/null 2>&1; then
  echo "ERROR: Bucket gs://$BUCKET was not found or you cannot access it." >&2
  echo "Check GCS_BUCKET and your Google Cloud project." >&2
  exit 1
fi

count=0
while IFS= read -r -d '' file; do
  relative="${file#"$ASSET_DIR"/}"
  destination="gs://$BUCKET/studio/$relative"
  echo "Uploading $relative"
  gcloud storage cp "$file" "$destination" --project="$PROJECT"
  count=$((count + 1))
done < <(find "$ASSET_DIR" -type f -print0)

if [[ "$count" -eq 0 ]]; then
  echo "ERROR: No files found under $ASSET_DIR" >&2
  exit 1
fi

echo "Uploaded $count demo asset files to gs://$BUCKET/studio/"
echo "Existing /generated/studio/<id>/... URLs are now served from the private bucket by Cloud Run."
