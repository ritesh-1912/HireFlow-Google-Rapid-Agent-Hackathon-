#!/bin/bash

# Ensure execution stops on error
set -e

# Verify environment variables
if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID environment variable is not set."
    echo "Usage: PROJECT_ID=my-project-id MONGODB_URI=mongodb_uri ./deploy.sh"
    exit 1
fi

if [ -z "$MONGODB_URI" ]; then
    echo "Error: MONGODB_URI environment variable is not set."
    echo "Usage: PROJECT_ID=my-project-id MONGODB_URI=mongodb_uri ./deploy.sh"
    exit 1
fi

echo "Step 1: Navigating to backend directory..."
cd "$(dirname "$0")/backend"

echo "Step 2: Submitting container build to Google Cloud Build..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/hireflow-backend

echo "Step 3: Deploying container to Google Cloud Run..."
gcloud run deploy hireflow-backend \
  --image gcr.io/$PROJECT_ID/hireflow-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MONGODB_URI=$MONGODB_URI,GOOGLE_CLOUD_PROJECT=$PROJECT_ID

echo "Deployment completed successfully!"
