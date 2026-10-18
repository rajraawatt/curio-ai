# Curio

Curio turns a topic into an interactive video lesson. Students, self-learners, educators, and creators can watch the moments, ask questions in context, and come back to the lesson later.

A lesson is 3 chapters (16s, 16s, 8s). Each clip is 8 seconds.

## Architecture

The React app talks to an Express API on Cloud Run (`us-central1`, one instance). `POST /api/studio/generate` streams progress while the lesson is built.

Gemini plans the chapters. Stills are made one at a time. A clip starts once both of its stills exist, with at most 4 clips at once. ffmpeg joins the clips, and the narration is mixed in before the join. Finished media is stored under `frontend/public/generated/studio/` and published to Cloud Storage. Ask Curio uses Gemini. Lesson analytics go to BigQuery.

| Step | Model |
| --- | --- |
| Lesson plan and Ask Curio | `gemini-2.5-flash` |
| Stills | `gemini-2.5-flash-image` |
| Clips | `veo-3.1-fast-generate-001` |
| Narration | Cloud TTS Chirp 3 HD (Sulafat) |

## Install locally

You need Node.js, npm, and the `gcloud` CLI.

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
npm install
npm run dev
```

Open http://localhost:5173. The API runs on port 8080.

Put `GOOGLE_CLOUD_PROJECT` in a `.env` file at the repo root if it is not already set in gcloud. Optional: `GCS_BUCKET`, `GEMINI_MODEL`, `VEO_MODEL`, `TTS_VOICE`. Do not commit `.env`.

Generating a lesson calls Vertex AI and spends credit. A full lesson usually takes several minutes. Files land in `frontend/public/generated/studio/<sessionId>/`. The home screen also opens saved lessons (camera, parasites, golden ratio, tardigrade).

## Deployed app

Live: https://curio-415543131068.us-central1.run.app

```bash
./scripts/deploy.sh PROJECT_ID
```

That deploys the `curio` Cloud Run service in `us-central1` with one instance. A generation request can run for up to 20 minutes. Shared media is read from Cloud Storage.
