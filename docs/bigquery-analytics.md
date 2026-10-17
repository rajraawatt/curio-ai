# CURIO Content Insights (BigQuery)

## What this adds

- Structured product events for lesson starts/completions, chapter selections, questions, and generated answers.
- A BigQuery-backed `/api/analytics/dashboard` endpoint with aggregate KPIs, daily trends, event mix, top lessons, and chapters that prompt questions.
- A dedicated `/analytics` page named **Content Insights**.
- No raw question text, chat transcript, email, or direct personal identifier is sent to BigQuery.

## Google Cloud setup

1. Select the same Google Cloud project used by CURIO / Cloud Run. Check it before running commands:

   ```bash
   gcloud config get-value project
   gcloud projects describe "$(gcloud config get-value project)" --format="value(projectId)"
   ```

2. Enable BigQuery API:

   ```bash
   gcloud services enable bigquery.googleapis.com --project YOUR_PROJECT_ID
   ```

3. In BigQuery Studio, open `sql/bigquery_setup.sql`, replace each `YOUR_PROJECT_ID` with your actual project ID, confirm the dataset location is `US` (or change both the SQL and `BIGQUERY_LOCATION` together), and run the script. Dataset location cannot be changed after creation.

4. Grant the Cloud Run runtime service account permissions. Find the service identity used by the deployed service:

   ```bash
   gcloud run services describe curio --region us-central1 --project YOUR_PROJECT_ID --format="value(spec.template.spec.serviceAccountName)"
   ```

   If the result is empty, Cloud Run uses the project's default compute service account. Find the project number with `gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"`; the default identity is usually `PROJECT_NUMBER-compute@developer.gserviceaccount.com`. Confirm it in IAM before granting roles.

   Grant these project roles to the confirmed runtime identity:

   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:YOUR_RUNTIME_SERVICE_ACCOUNT" \
     --role="roles/bigquery.jobUser"
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:YOUR_RUNTIME_SERVICE_ACCOUNT" \
     --role="roles/bigquery.dataEditor"
   ```

   For tighter production access, grant data-editor permissions only on the `curio_analytics` dataset rather than at project level. The runtime needs to insert rows and execute aggregate queries. Do not create service-account keys or put credentials in frontend code; Cloud Run uses its service identity.

5. Deploy the branch after installing the new backend dependency. Configure:

   ```bash
   GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
   BIGQUERY_DATASET=curio_analytics
   BIGQUERY_EVENTS_TABLE=product_events
   BIGQUERY_LOCATION=US
   ```

   The code defaults to these dataset/table/location values when not set. The dataset and table must exist before events are accepted.

6. Open `https://YOUR_CLOUD_RUN_URL/analytics`, generate/open a lesson, select moments, and ask a question. Refresh Content Insights after a few interactions. BigQuery streaming inserts can take a short time to become queryable.

## Local development

- Install dependencies from repo root with `npm install`.
- For BigQuery client libraries locally, set up Application Default Credentials using `gcloud auth application-default login` and make sure your user has BigQuery Job User plus dataset write permissions.
- `gcloud auth login` alone is not necessarily the same as Application Default Credentials.
- Run `npm run dev` from the repository root.
- If credentials/table are not configured, the analytics page shows a setup message; existing lesson functionality remains usable.

## What the dashboard measures

- Active sessions: distinct session IDs with events in the selected period.
- Lessons started/completed: explicit events emitted by the UI; completion means the user clicked **Start Learning**, not that they finished watching the entire video.
- Questions asked and moments explored: engagement signals, not validated learning outcomes.
- Estimated AI cost: reserved field for future token/model cost instrumentation; it remains zero unless real cost estimates are sent. Do not use it as billing truth.

For genuine learning impact, add quiz/assessment outcomes and compare cohorts or run an experiment. Engagement by itself does not prove better learning.
