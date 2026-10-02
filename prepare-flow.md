# Prepare pack flow

Short architecture for the teacher **Prepare** path: generate a reusable lesson pack (stills → video → 3D) once, then serve it from disk without calling generation APIs every class.

## Goal

Teacher writes a prompt. CURIO builds a **cell-mvp** (mock) pack:

1. **Plan** — beats + key objects + label metadata  
2. **Stills** — one Gemini/Imagen image per object  
3. **Video** — Veo **image→video** from those same stills (~15s as **2×8s** clips)  
4. **3D** — Tripo **image→model** from the **same** stills  

Labels are **app metadata** (JSON on the pack / overlays later), not Tripo geometry.

## Pipeline

```
Teacher prompt (Prepare UI)
        │
        ▼
POST /api/prepare/assets?stream=1
        │  SSE progress after each step
        ▼
prepareCellAssets()          backend/src/prepareAssets.js
        │
        ├─1─ Gemini plan          beats + objects + imagePrompt + labels
        │       └─ fallback plan if Gemini fails
        │
        ├─2─ Gemini/Imagen still  one PNG/JPEG per object
        │       └─ write frontend/public/generated/cell-mvp/<id>/source.*
        │
        ├─3─ Veo image→video      same still bytes + beat videoPrompt
        │       └─ ~8s MP4 per beat → …/video/clip-*.mp4
        │
        └─4─ Tripo image→3D      upload same still → poll → model.glb
                └─ …/<id>/model.glb + mesh.json
                └─ manifest.json updated throughout
```

**Why stills first:** one image is the shared source of truth for both Veo and Tripo, so video and 3D stay visually aligned.

## Runtime pieces

| Layer | Role |
| --- | --- |
| `frontend/src/Prepare.jsx` | Prompt, toggles, SSE client, progressive UI |
| `frontend/src/components/AssetViewer.jsx` | Still above Tripo GLB (OrbitControls); labels list in card text only |
| `backend/src/index.js` | `GET/POST /api/prepare/assets`; `?stream=1` → SSE |
| `backend/src/prepareAssets.js` | Pack orchestration, manifest, reuse logic |
| `backend/src/gcp.js` | Gemini plan + stills; Veo image→video + poll/save |
| `backend/src/tripo.js` | Image upload, image→model, poll, GLB download |

## UI toggles (per run)

| Toggle | Effect |
| --- | --- |
| **Reuse existing stills + video** | Skip regenerating plan/stills/clips when files already exist; useful for Tripo-only re-runs |
| **Gemini plan** | Beats + objects + labels |
| **Veo image→video** | 2×8s from stills (~16s total for the mock) |
| **Tripo image→3D** | Credits; needs `TRIPO_API_KEY` / `TRIPO_ENABLED` |

Progress streams over SSE so the page fills in as each step finishes (plan → still → clip → GLB).

## On-disk pack

```
frontend/public/generated/cell-mvp/
  manifest.json                 full pack status + pipeline log
  nucleus/
    source.png                  Gemini still
    model.glb                   Tripo mesh
    mesh.json                   generator metadata
  mitochondria/
    source.png
    model.glb
    mesh.json
  video/
    clip-1-nucleus.mp4
    clip-2-mitochondria.mp4
```

Browser loads assets as `/generated/cell-mvp/...`. After a pack is “done,” classroom/mock modes can use these files with generation APIs turned off.

## Product decisions (locked for this mock)

- **Pre-generate, then freeze** — spend API credits in Prepare; live class should not wait on Veo/Tripo.  
- **Image→video and image→3D**, not separate text prompts for each — same stills.  
- **~15s narration window** ≈ two Veo clips at 8s (Veo length options are discrete).  
- **Tripo is the hosted image→3D API** (not local TripoSR for this path).  
- **Labels** stay in the pack JSON for UI; they are not baked by Tripo.  
- **Reuse mode** lets you re-run only Tripo (or recover GLBs) without regenerating stills/video.

## Config (high level)

- Google: `GOOGLE_CLOUD_PROJECT` / ADC (or API key path in `gcp.js`), Gemini + Imagen + Veo models via env.  
- Tripo: `TRIPO_API_KEY`, `TRIPO_ENABLED=true`, optional model id.  
- See `env.sample` for names.

## Related docs

- `architecture.md` — live classroom (teacher/student SSE, Cloud Run, lesson runtime).  
- This file — **Prepare pack generation** only.
