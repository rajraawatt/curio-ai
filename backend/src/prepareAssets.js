import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  engineMode,
  geminiGenerate,
  generateDiagram,
  generateVeoClipFromImage,
  projectId,
} from "./gcp.js";
import { normalizeCaptions, normalizeNarration, withHouseStyle } from "./preparePrompt.js";
import { generateGlbFromLocalImage, tripoEnabled } from "./tripo.js";
import {
  MAX_LESSON_CLIPS,
  MERGE_FADE_SECONDS,
  buildMergedVideoMeta,
  ensureMergedLessonVideo,
  mergeLessonClips,
  writeMergedPoster,
} from "./mergeLessonVideo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const GENERATED_ROOT = path.join(__dirname, "../../frontend/public/generated");
export const PACK_ID = "cell-mvp";

/** Default teacher prompt for the mock prepare flow. */
export const MOCK_CELL_SUMMARY = `
Create a short educational lesson about an animal cell.
Show the nucleus as the control center, mitochondria producing energy,
and the cell membrane as the outer boundary.
Keep it clear for middle-school students.
`.trim();

const FALLBACK_PLAN = {
  beats: [
    {
      id: "beat_nucleus",
      title: "Nucleus",
      narration: "The nucleus holds the cell's genetic material.",
      durationHintSec: 8,
      objectId: "nucleus",
      videoPrompt: "Slow camera move around an animal cell nucleus, educational science style, no text",
    },
    {
      id: "beat_mito",
      title: "Mitochondria",
      narration: "Mitochondria produce energy for the cell.",
      durationHintSec: 8,
      objectId: "mitochondria",
      videoPrompt: "Gentle orbit around mitochondria with visible folds, educational, no text",
    },
  ],
  objects: [
    {
      id: "nucleus",
      label: "Nucleus",
      reason: "Control center of the cell; holds DNA",
      color: "#5c6bc0",
      mesh: { type: "sphere", radius: 1.1 },
      imagePrompt: "Isolated animal cell nucleus, spherical, educational still, clean studio, no text",
      labels: [
        { id: "nuclear_envelope", text: "Nuclear envelope" },
        { id: "nucleolus", text: "Nucleolus" },
      ],
    },
    {
      id: "mitochondria",
      label: "Mitochondria",
      reason: "Energy-producing organelles",
      color: "#ef6c00",
      mesh: { type: "capsule", radius: 0.45, length: 1.4 },
      imagePrompt: "Isolated mitochondria organelle, oval with inner folds, educational still, no text",
      labels: [
        { id: "outer", text: "Outer membrane" },
        { id: "cristae", text: "Cristae" },
      ],
    },
  ],
};

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Expected data:image/...;base64 from Gemini");
  return { mimeType: match[1], base64: match[2] };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/** Strip fences / extract object, then repair common truncation from MAX_TOKENS. */
function parseModelJson(raw) {
  let text = String(raw || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  text = text.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(repairTruncatedJson(text));
  }
}

function repairTruncatedJson(text) {
  let s = String(text || "");
  // Close an unfinished string value.
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') inString = !inString;
  }
  if (inString) s += '"';

  // Drop a dangling comma after the last complete value.
  s = s.replace(/,\s*$/g, "");

  const stack = [];
  inString = false;
  escape = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{" || c === "[") stack.push(c);
    if (c === "}" || c === "]") stack.pop();
  }
  while (stack.length) {
    s += stack.pop() === "{" ? "}" : "]";
  }
  return s.replace(/,\s*([}\]])/g, "$1");
}

function normalizePlan(parsed, objectLimit = 2) {
  const fallback = FALLBACK_PLAN;
  const rawObjects = Array.isArray(parsed?.objects) ? parsed.objects : fallback.objects;
  const objects = rawObjects.slice(0, objectLimit).map((object, index) => {
    const fb = fallback.objects[index] || fallback.objects[0];
    const fromModel = Array.isArray(object.labels)
      ? object.labels
          .slice(0, 4)
          .map((l, i) => ({
            id: slug(l.id || l.text) || `label_${i}`,
            text: String(l.text || l.label || "").slice(0, 40),
          }))
          .filter((l) => l.text)
      : [];
    const labels = fromModel.length
      ? fromModel
      : [
          { id: "outer", text: "Outside" },
          { id: "inner", text: "Inside" },
        ];
    return {
      id: slug(object.id) || fb.id,
      label: String(object.label || fb.label).slice(0, 60),
      reason: String(object.reason || fb.reason).slice(0, 160),
      color: /^#[0-9a-fA-F]{6}$/.test(object.color) ? object.color : fb.color,
      mesh: object.mesh && typeof object.mesh === "object" ? object.mesh : fb.mesh,
      imagePrompt: String(object.imagePrompt || fb.imagePrompt).slice(0, 280),
      labels,
    };
  });

  const objectIds = new Set(objects.map((o) => o.id));
  const rawBeats = Array.isArray(parsed?.beats) ? parsed.beats : fallback.beats;
  let beats = rawBeats
    .map((beat, index) => {
      const fb = fallback.beats[index] || fallback.beats[0];
      const objectId = slug(beat.objectId) || objects[Math.min(index, objects.length - 1)]?.id;
      return {
        id: slug(beat.id) || fb.id,
        title: String(beat.title || fb.title).slice(0, 80),
        narration: normalizeNarration(beat.narration, fb.narration),
        captions: normalizeCaptions(beat.captions, beat.narration || fb.narration),
        durationHintSec: Number(beat.durationHintSec) || 8,
        objectId,
        videoPrompt: String(beat.videoPrompt || fb.videoPrompt).slice(0, 400),
      };
    })
    .filter((b) => objectIds.has(b.objectId));

  // Ensure one beat per object for the ~15s mock (2×8s).
  if (beats.length < objects.length) {
    beats = objects.map((o, i) => ({
      id: `beat_${o.id}`,
      title: o.label,
      narration: normalizeNarration(o.reason),
      captions: normalizeCaptions(null, o.reason),
      durationHintSec: 8,
      objectId: o.id,
        videoPrompt: `${o.imagePrompt}. Same object, one slow obvious motion a student can describe, no text, no labels`,
    }));
  }

  return { beats: beats.slice(0, objects.length), objects };
}

async function planLessonWithGemini(teacherPrompt, objectLimit) {
  const prompt = `You are planning a short classroom video lesson (~15 seconds total) plus interactive 3D assets.
Keep every string SHORT so the JSON stays under ~3k characters.

Teacher prompt:
"""
${teacherPrompt}
"""

Return JSON only (no markdown):
{
  "beats": [
    {
      "id": "snake_case",
      "title": "short title",
      "narration": { "en": "A plant cell has a wall that holds it in shape.", "hi": "पादप कोशिका की दीवार उसे आकार में रखती है।", "es": "La célula vegetal tiene una pared que le da forma." },
      "captions": [
        { "atSec": 0, "text": { "en": "This is a plant cell.", "hi": "यह एक पादप कोशिका है।", "es": "Esta es una célula vegetal." } },
        { "atSec": 4, "text": { "en": "Its wall holds the shape.", "hi": "इसकी दीवार आकार रखती है।", "es": "Su pared mantiene la forma." } }
      ],
      "durationHintSec": 8,
      "objectId": "matching_object_id",
      "videoPrompt": "short Veo motion prompt, no on-screen text"
    }
  ],
  "objects": [
    {
      "id": "snake_case_id",
      "label": "Human label",
      "reason": "why students click this",
      "color": "#RRGGBB",
      "mesh": { "type": "sphere", "radius": 1 },
      "imagePrompt": "isolated still, educational, clean studio, no text",
      "labels": [{ "id": "part", "text": "Part name" }]
    }
  ]
}

Rules:
- The teacher may have written only a few keywords. Make one simple cause-and-effect a student can retell in one sentence.
- Exactly ${objectLimit} objects and ${objectLimit} beats, in story order. Scene 1 is before. Scene 2 is what changed.
- Each beat.objectId must match an object.id. The video must animate that same object, not a new scene.
- imagePrompt: one recognizable object, centered, plain light background, no clutter. English, under 160 characters. This picture is the student still and the first frame of the animation.
- videoPrompt: the same object doing one slow, obvious action. English, under 160 characters. No new characters, no on-screen text.
- The script is the narration and the two captions. A student hears it. Write it so they can explain the idea afterward. The plant-cell lines in the schema are only a pattern. Write the teacher's topic, not that example.
- Scene 1 script: first caption names the object ("This is a plant cell."). Second caption gives one fact ("A wall holds it in shape."). Narration is those two ideas in one sentence.
- Scene 2 script: first caption says what changes. Second caption says why it matters. Narration ties the change to the first scene.
- Match the age group. Ages 8–10: words a 9-year-old says. Ages 11–14: one classroom sentence, no jargon. Ages 15–18: one precise word is allowed only if the next words explain it.
- Real en/hi/es. Hindi and Spanish must explain the same idea, not copy English spelling. Each caption is 8 words or fewer. No slogans, no poetry, no "behold".
- Every object needs 2 to 4 labels. Each label is a real part of that object a student can point at on the 3D model. Do not leave labels empty.
- No trailing commentary outside the JSON object.`;

  const compactPrompt = `Return ONLY compact JSON. The teacher wrote only a few words. Make one idea a student can explain in one sentence, as ${objectLimit} scenes: scene 1 before, scene 2 the change. Script: scene 1 captions name the object then give one fact; scene 2 captions say what changes then why it matters. Narration is one spoken sentence per scene, everyday words for the age group, real en/hi/es, captions ≤8 words. Each still is one object on a plain background. Each video animates that same object with one slow motion. 2 to 4 real part labels per object.
"""
${teacherPrompt}
"""
Schema: {"beats":[{"id":"","title":"","narration":{"en":"","hi":"","es":""},"captions":[{"atSec":0,"text":{"en":"","hi":"","es":""}},{"atSec":4,"text":{"en":"","hi":"","es":""}}],"durationHintSec":8,"objectId":"","videoPrompt":""}],"objects":[{"id":"","label":"","reason":"","color":"#5c6bc0","mesh":{"type":"sphere","radius":1},"imagePrompt":"","labels":[{"id":"part","text":""}]}]}
Exactly ${objectLimit} beats and ${objectLimit} objects. Short strings only.`;

  let lastErr;
  for (const [attempt, nextPrompt] of [
    [1, prompt],
    [2, compactPrompt],
  ]) {
    try {
      const raw = await geminiGenerate(nextPrompt, {
        json: true,
        maxOutputTokens: attempt === 1 ? 8192 : 4096,
        temperature: 0.25,
      });
      return normalizePlan(parseModelJson(raw), objectLimit);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Gemini plan JSON could not be parsed");
}

async function writeStill(assetDir, object) {
  const imagePrompt = `${object.imagePrompt}. One object a student can name at a glance, centered, plain light background, simple and uncluttered, no text, no labels, no watermark. This picture is the still and the first frame of a short animation.`;
  const dataUrl = await generateDiagram(imagePrompt);
  const { mimeType, base64 } = parseDataUrl(dataUrl);
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const sourceImageName = `source.${ext}`;
  const filePath = path.join(assetDir, sourceImageName);
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  return { sourceImageName, filePath, mimeType, base64, imagePrompt };
}

async function loadExistingStill(assetDir, object) {
  const candidates = ["source.png", "source.jpg", "source.jpeg", "source.webp"];
  for (const sourceImageName of candidates) {
    const filePath = path.join(assetDir, sourceImageName);
    try {
      const buf = await fs.readFile(filePath);
      const mimeType = sourceImageName.endsWith(".png")
        ? "image/png"
        : sourceImageName.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
      return {
        sourceImageName,
        filePath,
        mimeType,
        base64: buf.toString("base64"),
        imagePrompt: object.imagePrompt,
        reused: true,
      };
    } catch {
      // try next
    }
  }
  return null;
}

function planFromExistingPack(existing, objectLimit) {
  if (!existing?.assets?.length) return null;
  const objects = existing.assets.slice(0, objectLimit).map((asset, index) => {
    const fb = FALLBACK_PLAN.objects[index] || FALLBACK_PLAN.objects[0];
    return {
      id: slug(asset.id) || fb.id,
      label: asset.label || fb.label,
      reason: asset.reason || fb.reason,
      color: asset.color || fb.color,
      mesh: asset.mesh?.type ? asset.mesh : fb.mesh,
      imagePrompt: asset.imagePrompt || fb.imagePrompt,
      labels: Array.isArray(asset.labels) && asset.labels.length ? asset.labels : fb.labels,
    };
  });
  const beats =
    Array.isArray(existing.beats) && existing.beats.length
      ? existing.beats.filter((b) => objects.some((o) => o.id === b.objectId)).slice(0, objects.length)
      : objects.map((o) => ({
          id: `beat_${o.id}`,
          title: o.label,
          narration: normalizeNarration(o.reason),
          durationHintSec: 8,
          objectId: o.id,
          videoPrompt: o.imagePrompt,
        }));
  return { beats, objects };
}

async function writeTripoFromStill(assetDir, object, still) {
  const result = await generateGlbFromLocalImage({
    filePath: still.filePath,
    destDir: assetDir,
    basename: "model",
  });
  return {
    glbName: result.glbName,
    previewName: result.previewName,
    taskId: result.taskId,
    credits: result.credits,
    pipeline: result.pipeline,
  };
}

/**
 * Full mock prepare pack:
 * teacher prompt → Gemini plan → stills → Veo image→video (~2×8s) → Tripo from same stills.
 * onProgress(partialPack) is called after each meaningful step so the UI can stream results.
 */
export async function prepareCellAssets({
  summary = MOCK_CELL_SUMMARY,
  prompt = null,
  useGemini = true,
  useVeo = true,
  useTripo = true,
  reuseExisting = false,
  objectCount = 2,
  lesson = null,
  onProgress = null,
} = {}) {
  const teacherPrompt = String(prompt || summary || MOCK_CELL_SUMMARY).trim();
  const packDir = path.join(GENERATED_ROOT, PACK_ID);
  const videoDir = path.join(packDir, "video");
  await ensureDir(packDir);
  await ensureDir(videoDir);

  const existingPack = reuseExisting ? await readCellPack() : null;
  const limit = Math.min(Math.max(Number(objectCount) || 2, 1), MAX_LESSON_CLIPS);
  const steps = [];
  let planSource = "fallback";
  let plan = normalizePlan(FALLBACK_PLAN, limit);
  let videos = reuseExisting && Array.isArray(existingPack?.videos) ? [...existingPack.videos] : [];
  let mergedVideo = reuseExisting ? existingPack?.mergedVideo || null : null;
  let assets = [];
  const stillByObject = {};

  const emit = async (status, extra = {}) => {
    const modeParts = [planSource];
    if (reuseExisting) modeParts.push("reuse");
    if (useVeo) modeParts.push("veo-image");
    if (useTripo) modeParts.push("tripo-image");
    const pack = {
      packId: PACK_ID,
      createdAt: new Date().toISOString(),
      status,
      mode: modeParts.join("+"),
      engine: engineMode(),
      teacherPrompt,
      summary: teacherPrompt,
      topic: lesson?.topic || null,
      ageGroup: lesson?.ageGroup || null,
      keywords: lesson?.keywords || [],
      language: lesson?.language || "en",
      released: false,
      planSource,
      useVeo,
      useTripo,
      reuseExisting,
      beats: plan.beats,
      videos,
      mergedVideo,
      videoDurationSec: mergedVideo?.durationSeconds
        || videos.reduce((n, v) => n + (v.durationSeconds || 0), 0),
      pipeline: Object.fromEntries(steps.map((step, i) => [`step${i + 1}`, step])),
      assets,
      ...extra,
    };
    await fs.writeFile(path.join(packDir, "manifest.json"), JSON.stringify(pack, null, 2), "utf8");
    if (typeof onProgress === "function") await onProgress(pack);
    return pack;
  };

  if (useVeo && !projectId()) {
    throw new Error("Veo requested but no Google project is set. Run: gcloud auth login && gcloud config set project PROJECT_ID");
  }
  if (useTripo && !tripoEnabled()) {
    steps.push("Tripo disabled (TRIPO_ENABLED=false) — skipping 3D API");
    useTripo = false;
    await emit("tripo-skipped", { notice: "Tripo API disabled — using stills only" });
  }

  await emit("starting", { notice: reuseExisting ? "Prepare started (reuse existing stills/video where possible)" : "Prepare started" });

  // 1) Plan — prefer existing pack when reusing
  const reusedPlan = reuseExisting ? planFromExistingPack(existingPack, limit) : null;
  if (reusedPlan) {
    plan = reusedPlan;
    planSource = "reused-manifest";
    steps.push("Reused beats + objects from existing pack");
  } else if (useGemini && engineMode() !== "lesson-scripts") {
    try {
      plan = await planLessonWithGemini(teacherPrompt, limit);
      planSource = "gemini";
      steps.push("Gemini planned beats + key objects");
    } catch (err) {
      plan = normalizePlan(FALLBACK_PLAN, limit);
      planSource = `fallback (gemini failed: ${err.message})`;
      steps.push(`Gemini plan failed — used fallback (${err.message})`);
    }
  } else {
    steps.push("Used fallback beats + key objects");
  }

  // Seed asset cards immediately so UI shows labels before images exist.
  assets = plan.objects.map((object) => ({
    id: object.id,
    label: object.label,
    reason: object.reason,
    color: object.color,
    imagePrompt: object.imagePrompt,
    labels: object.labels,
    previewUrl: null,
    sourceImageUrl: null,
    meshUrl: null,
    glbUrl: null,
    mesh: null,
  }));
  await emit("planned");

  // 2) Stills — reuse on-disk source.* when requested
  for (let i = 0; i < plan.objects.length; i++) {
    const object = plan.objects[i];
    const assetDir = path.join(packDir, object.id);
    await ensureDir(assetDir);

    let still = null;
    if (reuseExisting) {
      still = await loadExistingStill(assetDir, object);
    }

    if (still) {
      steps.push(`Reused still for ${object.label}`);
      await emit("image-ready", { notice: `Reused still: ${object.label}` });
    } else {
      await emit("image", { notice: `Generating still for ${object.label}…` });
      still = await writeStill(assetDir, object);
      steps.push(`Still image saved for ${object.label}`);
      await emit("image-ready", { notice: `Still ready: ${object.label}` });
    }

    stillByObject[object.id] = still;
    assets[i] = {
      ...assets[i],
      imagePrompt: still.imagePrompt,
      previewUrl: `/generated/${PACK_ID}/${object.id}/${still.sourceImageName}?t=${Date.now()}`,
      sourceImageUrl: `/generated/${PACK_ID}/${object.id}/${still.sourceImageName}?t=${Date.now()}`,
      meshUrl: null,
      glbUrl: null,
      mesh: null,
    };
    await emit("image-ready");
  }

  // 3) Veo
  if (useVeo) {
    videos = [];
    for (let i = 0; i < plan.beats.length; i++) {
      const beat = plan.beats[i];
      const still = stillByObject[beat.objectId];
      if (!still) continue;
      const fileName = `clip-${i + 1}-${beat.objectId}.mp4`;
      const destPath = path.join(videoDir, fileName);
      const durationSeconds = 8;
      await emit("veo", { notice: `Veo generating clip for ${beat.title}…` });
      await generateVeoClipFromImage({
        prompt: withHouseStyle(beat.videoPrompt || `${beat.title}. Educational science clip, no text`),
        imageBase64: still.base64,
        mimeType: still.mimeType,
        destPath,
        durationSeconds,
      });
      videos = [
        ...videos,
        {
          id: beat.id,
          title: beat.title,
          objectId: beat.objectId,
          narration: beat.narration,
          captions: beat.captions,
          durationSeconds,
          url: `/generated/${PACK_ID}/video/${fileName}?t=${Date.now()}`,
        },
      ];
      steps.push(`Veo image→video clip for ${beat.title} (${durationSeconds}s)`);
      await emit("veo-ready", { notice: `Video clip ready: ${beat.title}` });
    }
  } else if (reuseExisting && videos.length) {
    steps.push(`Reused ${videos.length} existing video clip(s)`);
    await emit("veo-skipped", { notice: "Veo skipped — keeping existing video clips" });
  } else {
    steps.push("Veo skipped");
    await emit("veo-skipped");
  }

  if (videos.length >= 2) {
    const stamp = Date.now();
    const slug = String(lesson?.topic || "lesson")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "lesson";
    const mergedBase = `lesson-${slug}-${stamp}`;
    const destPath = path.join(videoDir, `${mergedBase}.mp4`);
    const posterPath = path.join(videoDir, `${mergedBase}-poster.jpg`);
    const clipPaths = videos.slice(0, MAX_LESSON_CLIPS).map((clip) => {
      const name = clip.url.split("/").pop().split("?")[0];
      return path.join(videoDir, name);
    });
    await emit("merge", { notice: "Merging clips into one lesson video…" });
    try {
      const info = await mergeLessonClips(clipPaths, destPath, { fadeSec: MERGE_FADE_SECONDS });
      // Poster is best-effort; never leave mergedVideo pointing at a missing/corrupt file.
      await writeMergedPoster(destPath, posterPath).catch(() => fs.unlink(posterPath).catch(() => {}));
      mergedVideo = {
        ...buildMergedVideoMeta(videos, PACK_ID, MERGE_FADE_SECONDS),
        durationSeconds: info.durationSeconds,
        url: `/generated/${PACK_ID}/video/${mergedBase}.mp4?t=${stamp}`,
        posterUrl: `/generated/${PACK_ID}/video/${mergedBase}-poster.jpg?t=${stamp}`,
      };
      steps.push(`Merged 2 clips into one ${info.durationSeconds.toFixed(1)}s lesson video`);
      await emit("merge-ready", { notice: "One lesson video ready (~16s)" });
    } catch (err) {
      // Do not publish a URL to a half-written/corrupt lesson-merged.mp4.
      mergedVideo = null;
      await fs.unlink(destPath).catch(() => {});
      steps.push(`Merge skipped: ${err.message}`);
      await emit("merge-error", { notice: `Could not merge clips: ${err.message}` });
    }
  }

  // 4) Tripo
  if (useTripo) {
    for (let i = 0; i < assets.length; i++) {
      const object = plan.objects[i];
      const still = stillByObject[object.id];
      const assetDir = path.join(packDir, object.id);
      await emit("tripo", { notice: `Tripo generating 3D for ${object.label}…` });
      try {
        const tripo = await writeTripoFromStill(assetDir, object, still);
        const meshRecipe = {
          generator: "gemini-still+tripo-image-to-model",
          status: "ready",
          taskId: tripo.taskId,
          credits: tripo.credits,
          pipeline: tripo.pipeline,
          color: object.color,
          glb: tripo.glbName,
          sourceImage: still.sourceImageName,
          labels: object.labels,
        };
        await fs.writeFile(path.join(assetDir, "mesh.json"), JSON.stringify(meshRecipe, null, 2), "utf8");
        assets[i] = {
          ...assets[i],
          glbUrl: `/generated/${PACK_ID}/${object.id}/${tripo.glbName}?t=${Date.now()}`,
          meshUrl: `/generated/${PACK_ID}/${object.id}/mesh.json`,
          mesh: meshRecipe,
          tripoTaskId: tripo.taskId,
          credits: tripo.credits,
          pipeline: tripo.pipeline,
        };
        steps.push(`Tripo image→3D for ${object.label}`);
        await emit("tripo-ready", { notice: `3D ready: ${object.label}` });
      } catch (err) {
        const meshRecipe = {
          generator: "tripo-failed",
          status: "error",
          error: err.message,
          color: object.color,
          sourceImage: still?.sourceImageName || null,
          glb: null,
        };
        await fs.writeFile(path.join(assetDir, "mesh.json"), JSON.stringify(meshRecipe, null, 2), "utf8");
        assets[i] = {
          ...assets[i],
          glbUrl: null,
          meshUrl: `/generated/${PACK_ID}/${object.id}/mesh.json`,
          mesh: meshRecipe,
          error: err.message,
        };
        steps.push(`Tripo failed for ${object.label}: ${err.message}`);
        await emit("tripo-error", { notice: `Tripo failed for ${object.label}: ${err.message}` });
      }
    }
  } else {
    for (let i = 0; i < assets.length; i++) {
      assets[i] = {
        ...assets[i],
        glbUrl: null,
        meshUrl: null,
        mesh: null,
      };
    }
    steps.push("Tripo skipped");
    await emit("tripo-skipped");
  }

  return emit("done", { notice: "Prepare pack complete", status: "done" });
}

function packLooksComplete(pack) {
  if (!pack) return false;
  if (pack.status === "done") return true;
  const hasVideo = Boolean(pack.mergedVideo?.url || pack.videos?.some((v) => v?.url));
  const hasAssets = Array.isArray(pack.assets) && pack.assets.some((a) => a?.glbUrl || a?.sourceImageUrl || a?.previewUrl);
  return hasVideo || hasAssets;
}

export async function readCellPack({ repair = false } = {}) {
  const manifestPath = path.join(GENERATED_ROOT, `${PACK_ID}/manifest.json`);
  try {
    const text = await fs.readFile(manifestPath, "utf8");
    let pack = JSON.parse(text);
    const previousMerged = pack.mergedVideo || null;

    // Ordinary GETs stay read-only. Remux only when explicitly repairing or video is missing.
    const missingMerged = !pack.mergedVideo?.url;
    if (repair || missingMerged) {
      pack = await ensureMergedLessonVideo(pack, { packId: PACK_ID, generatedRoot: GENERATED_ROOT });
      if (!pack.mergedVideo?.url && previousMerged?.url) {
        pack = { ...pack, mergedVideo: previousMerged };
      }
      if (pack.mergedVideo?.url && pack.mergedVideo?.url !== previousMerged?.url) {
        await fs.writeFile(manifestPath, JSON.stringify(pack, null, 2), "utf8");
      }
    }

    // Interrupted generates leave status like "merge"/"tripo" — heal so UI survives refresh.
    if (packLooksComplete(pack) && pack.status !== "done") {
      pack = { ...pack, status: "done", notice: pack.notice || "Prepare pack ready" };
      await fs.writeFile(manifestPath, JSON.stringify(pack, null, 2), "utf8");
    }
    return pack;
  } catch {
    return null;
  }
}
