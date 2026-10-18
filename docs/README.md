# CURIO

A teacher-led classroom where a student's question changes the world the whole class is learning in.

Layout, ownership, and the build order are in [plan.md](plan.md). The Google Cloud shape of the system is in [architecture.md](architecture.md).

The prototype is a shared lesson on **How mountains form**. The teacher presents one cinematic world. Students ask by voice or text. The teacher picks a question, and the scene transforms — into the rock, its minerals, its crystals, its atoms — then returns to the lesson.

## 90 second demo

1. `npm install` then `npm run dev`
2. Open [http://localhost:5173](http://localhost:5173)
3. Open **Teacher** and **Student** side by side (student can be a phone on the same Wi-Fi via your machine's LAN address).
4. On the teacher screen, choose **What is this rock made of?** and press **Explore question**.
5. Watch the shared world move: rock, cross-section, minerals, crystals, atoms. Both screens stay in sync.
6. Press **Return to lesson**.
7. From the student screen, ask **Could we stand inside a crystal?** With Gemini configured, Vertex plans a new scene. Without it, the scene engine still transforms the world.

Language buttons (`en` / `hi` / `es`) change captions and narration for the whole class.

## Google Cloud

| Service | Role in CURIO |
| --- | --- |
| Gemini on Vertex AI | Reads the question in the lesson context and returns a 4–6 beat scene plan in English, Hindi, and Spanish |
| Scene engine | Plays that plan immediately for the whole class |
| Imagen (`gemini-2.5-flash-image`) | Optional diagram for the current beat |
| Veo | Optional cinematic clip. The operation starts in the background |
| Speech-to-Text | Browser capture in the student view, so a phone mic works with no extra setup |
| Text-to-Speech | Neural voice on the teacher screen when the API is enabled. Browser voice is the fallback |
| Cloud Translation | Used when `TRANSLATE_ENABLED=true` for lines that are not already localized |
| BigQuery | Streams curiosity events. Schema in `sql/curiosity_events.sql` |
| Cloud Storage | Bucket name is reserved for generated media (`GCS_BUCKET`) |
| Cloud Run | One container serves the app and the API |

The classroom state is in memory, so Cloud Run is pinned to one instance. That is the right shape for a live demo. A later version would put the same state in Firestore or Memorystore.

### Deploy

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default login   # only needed for local Vertex calls
chmod +x scripts/deploy.sh
./scripts/deploy.sh YOUR_PROJECT_ID
```

Give the Cloud Run service account `roles/aiplatform.user`. Enable Text-to-Speech if you want the neural voice. For analytics:

```bash
bq query --use_legacy_sql=false < sql/curiosity_events.sql
```

Then redeploy with `BIGQUERY_DATASET=curio` added to the environment.

### Local Gemini, without a full deploy

Copy `env.sample` to `.env` and set one of:

- `GOOGLE_CLOUD_PROJECT` after `gcloud auth application-default login`
- `GEMINI_API_KEY` from AI Studio, as a hackathon fallback

Restart `npm run dev`. The lobby shows which planner is active.

## API

- `GET /api/events` — live classroom stream
- `POST /api/questions` — `{ name, text, source }`
- `POST /api/control` — `select`, `explore`, `advance`, `jump`, `pause`, `play`, `return`, `language`, `raise`, `reset`
- `POST /api/tts` — Cloud Text-to-Speech, or `204` when it is not configured
- `POST /api/diagram` — Imagen for the current idea
- `POST /api/veo` — starts a Veo long-running clip
- `GET /api/health` — which Google services are configured

## Production path this demo is standing in for

The live loop stays the same: student question, teacher choice, shared transformation, return. Ahead of class, Veo would pre-render the base lesson and likely branches into Cloud Storage. In class, Gemini still plans anything the class did not rehearse, and the scene engine covers that moment immediately. BigQuery keeps the curiosity record so the next lesson can start from what this class actually asked.
