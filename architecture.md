# CURIO architecture

CURIO is one classroom with two screens. The teacher leads. Students ask. The shared world changes only when the teacher says so.

Everything we deploy runs on Google Cloud. The browser is only the classroom screen.

## What the class does

```
Teacher introduces the mountain lesson
        │
        ▼
Students ask by voice or text
        │
        ▼
Questions appear on the teacher panel
        │
        ▼
Teacher selects one question and explores it
        │
        ▼
The same scene plays on every screen
        │
        ▼
Teacher returns the class to the lesson
```

## Runtime

One Cloud Run service serves the teacher UI, the student UI, and the API. The classroom state lives in that process and is pushed to every screen with server-sent events (`GET /api/events`).

Cloud Run is pinned to **one instance** (`min-instances=1`, `max-instances=1`). A second instance would have its own memory and the screens would split. That limit is intentional for this prototype.

```
Browser (teacher or student)
        │  HTTPS, same origin
        ▼
Cloud Run  ── curio
        │
        ├── Vertex AI Gemini     scene plans for new questions
        ├── Vertex AI Imagen     diagram for the current beat
        ├── Vertex AI Veo        cinematic clip, started in the background
        ├── Cloud Text-to-Speech narration on the teacher screen
        ├── Cloud Speech-to-Text student voice (next step; the mic already captures speech)
        ├── Cloud Translation    Hindi and Spanish when TRANSLATE_ENABLED=true
        ├── BigQuery             curiosity events
        └── Cloud Storage        diagrams and Veo clips
```

## Repository

```
backend/          Express API, classroom state, Vertex / speech / BigQuery calls
frontend/         React teacher and student screens
sql/              BigQuery schema
scripts/          Cloud Run deploy
```

| Path | Role |
| --- | --- |
| `backend/src/index.js` | HTTP routes and the event stream |
| `backend/src/classroom.js` | Shared lesson state and teacher actions |
| `backend/src/lesson.js` | Authored mountain scenes, plus the matcher for known questions |
| `backend/src/gcp.js` | Vertex, Text-to-Speech, Translation, BigQuery, Veo |
| `frontend/src/Teacher.jsx` | Composes the teacher desk. Prefer not to edit this while feature work is in the panels. |
| `frontend/src/components/SidePanel.jsx` | Left navigation |
| `frontend/src/components/Toolbar.jsx` | Bottom controls |
| `frontend/src/components/QuestionPanel.jsx` | Live question list |
| `frontend/src/Student.jsx` | Student screen |
| `frontend/src/components/VideoSettings.jsx` | Imagen and Veo controls |
| `frontend/src/components/AnalyticsPanel.jsx` | Curiosity board |
| `frontend/src/World.jsx`, `scenes.jsx` | The shared world |
| `sql/curiosity_events.sql` | BigQuery table |

## Why the world can change immediately

A live class cannot wait for Veo. The loop is:

1. A known question (the rock, the height, the color) plays an authored scene sequence.
2. A new question is sent to **Gemini on Vertex AI**. Gemini returns 4–6 beats: a visual, a caption, and narration in English, Hindi, and Spanish.
3. The scene engine plays that plan on every connected screen.
4. **Imagen** and **Veo** are teacher actions in Settings. They enrich a beat. They do not block the lesson.

Ahead of a real class, Veo would pre-render the base film and the likely branches into Cloud Storage. In class, Gemini still covers the question nobody rehearsed.

## API

| Method | Path | Who calls it |
| --- | --- | --- |
| `GET` | `/api/events` | Both screens. The live state stream. |
| `GET` | `/api/state` | A fresh snapshot. |
| `GET` | `/api/health` | Which Google APIs are configured. |
| `POST` | `/api/questions` | Student. `{ name, text, source }` |
| `POST` | `/api/control` | Teacher. `select`, `explore`, `advance`, `jump`, `pause`, `play`, `return`, `language`, `raise`, `reset` |
| `POST` | `/api/tts` | Teacher screen. Cloud Text-to-Speech, or `204` if it is not configured. |
| `POST` | `/api/diagram` | Teacher. Imagen for the current beat. |
| `POST` | `/api/veo` | Teacher. Starts a Veo long-running job. |

## Deployment strategy

Google Cloud only. One command from this repo:

```bash
./scripts/deploy.sh YOUR_PROJECT_ID
```

That script enables the APIs and runs `gcloud run deploy curio --source .` in `us-central1`. Cloud Build builds the Dockerfile. The image lands in Artifact Registry. Cloud Run runs it.

The container build:

1. Installs the npm workspaces.
2. Builds `frontend/` with Vite.
3. Runs `backend/`, which serves `frontend/dist` and the API on port 8080.

### Identity

Cloud Run uses its runtime service account. No API key is shipped in the image.

| Role | Why |
| --- | --- |
| `roles/aiplatform.user` | Gemini, Imagen, and Veo on Vertex AI |
| `roles/bigquery.dataEditor` | Stream curiosity rows, after the dataset exists |
| `roles/storage.objectAdmin` on the media bucket | Save diagrams and Veo output |

```bash
bq query --use_legacy_sql=false < sql/curiosity_events.sql
```

Then set `BIGQUERY_DATASET=curio` on the Cloud Run service. Set `GCS_BUCKET` when a bucket exists for media. Set `TRANSLATE_ENABLED=true` only after Cloud Translation is enabled.

Local development uses the same APIs through Application Default Credentials (`gcloud auth application-default login`) and `GOOGLE_CLOUD_PROJECT` in `.env`. Copy `env.sample`.

### What we are not adding

A second host, a separate frontend deploy, or a database outside Google Cloud. Firebase is available if we later need multi-instance state, but this prototype stays on one Cloud Run service so the event stream and the UI share an origin.

## State the screens share

`phase` is `live`, `selected`, `transforming`, or `returning`. `playing` pauses the beat timer. `transform` holds the current scene plan, the beat index, and whether Gemini or the lesson script produced it. `questions`, `hands`, `language`, `analytics`, and `veo` travel with that snapshot.
