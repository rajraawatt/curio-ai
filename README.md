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

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API is on port 8080.

Sign in with Application Default Credentials and set `GOOGLE_CLOUD_PROJECT`. Optional: `GCS_BUCKET`, `GEMINI_MODEL`, `VEO_MODEL`.

## Deploy

```bash
./scripts/deploy.sh PROJECT_ID
```

Deploys the `curio` Cloud Run service in `us-central1`.

Live: https://curio-415543131068.us-central1.run.app
