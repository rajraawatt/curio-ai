# CURIO plan

Read [architecture.md](architecture.md) before changing code. Pull this structure before starting a feature branch. Commit on your own branch. We will merge and resolve conflicts after each slice, not at the end of the hackathon.

## Sequence

1. **Shared baseline.** Folder split, Cloud Run deploy, and the mountain lesson. This is the branch everyone starts from.
2. **Parallel work.** Raj and Anita use the file lists below. Stay inside those files.
3. **Integration.** Merge Raj first, then Anita. Run the demo script in the README on two browsers.
4. **Deploy.** `./scripts/deploy.sh PROJECT_ID` once the two slices still share one classroom.

Do not both edit `frontend/src/Teacher.jsx`, `frontend/src/styles.css`, or `backend/src/classroom.js` unless a change cannot live in your own file. If you must, keep the commit tiny and say so in the message.

## Raj — teacher chrome and the live loop

### 1. Enhance the left panel

The panel is the dark rail: Class, Questions, Analytics, Settings, and the live dot.

Make it obvious which view is active, and show the room (`CURIO`) so a second device knows where it joined.

Files:

- `frontend/src/components/SidePanel.jsx`
- `.side` rules in `frontend/src/styles.css`

### 2. Enhance the bottom toolbar

The toolbar is how the teacher stays in charge: pause, explore, next beat, return, audio, captions, project, and language.

The labels should match the phase. A teacher who has never seen the app should know the one next action.

Files:

- `frontend/src/components/Toolbar.jsx`
- `.transport` and `.lang` rules in `frontend/src/styles.css`

### 3. Verify student–teacher interactiveness

Prove the loop on two browsers, then fix whatever fails.

- Student asks by text. The question appears on the teacher list without a refresh.
- Student raises a hand. The teacher sees the name.
- Teacher selects and explores. The student world changes to the same beat.
- Teacher returns. Both screens are back on the mountain.
- A second student tab stays on the same lesson.

Files:

- `frontend/src/Student.jsx`
- `frontend/src/components/QuestionPanel.jsx`
- `frontend/src/useClassroom.js`
- `.student` and `.questions` rules in `frontend/src/styles.css`

Touch `backend/src/classroom.js` only if a check shows the API itself is wrong.

## Anita — video and analytics

### 1. How the teacher generates video

Settings can already start a Veo job (`POST /api/veo`). It does not yet poll the operation or play the file.

Finish the path: the teacher asks for a clip of the current beat, the job runs on Vertex AI, the finished video is stored in Cloud Storage, and the teacher can play it without leaving the lesson. The live scene engine keeps running while Veo works.

Files:

- `backend/src/gcp.js`
- `backend/src/index.js` (the `/api/veo` route and a status route)
- `frontend/src/components/VideoSettings.jsx`
- `.settings` rules in `frontend/src/styles.css`

### 2. Analytics

The board already counts questions from memory and can stream rows to BigQuery when `BIGQUERY_DATASET` is set.

Make the board show what the class was curious about: questions, concepts explored, and the event list. Confirm a row lands in `sql/curiosity_events.sql` when the dataset exists.

Files:

- `frontend/src/components/AnalyticsPanel.jsx`
- `sql/curiosity_events.sql`
- `backend/src/gcp.js` (`insertAnalytics`)
- `.analytics` rules in `frontend/src/styles.css`

## Shared, leave alone unless the task needs it

- `frontend/src/World.jsx` and `frontend/src/scenes.jsx` — the world both screens already share
- `backend/src/lesson.js` — the mountain script
- `scripts/deploy.sh` and `Dockerfile` — the Cloud Run path

## Done when

- Raj can run teacher and student side by side and narrate the loop without a missed update.
- Anita can start a Veo clip from the teacher screen and show curiosity events for that session.
- `npm run dev` still opens the lobby, and `./scripts/deploy.sh` still builds one Cloud Run service.
