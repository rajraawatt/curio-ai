import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";
import { generateDiagram, generateVeoClipFromImage, geminiGenerate } from "./gcp.js";
import { writeMergedPoster } from "./mergeLessonVideo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, "../../frontend/public/generated");

export const STUDIO_MOMENTS = 5;
export const STUDIO_IMAGES = 4;
const CLIP_SECONDS = 8;
const IMAGE_KINDS = ["wide", "angle", "part", "detail"];

const STUDIO_STILL_INSTRUCTION = `Visual style: photorealistic cinematic realism.
Generate an exceptionally realistic, high-detail, cinematic image of the requested subject. It should look like a premium real-world photograph or a high-end photorealistic 3D render from an expert visual effects studio, never like a cartoon, illustration, flat graphic, or generic AI artwork.
Reproduce believable proportions, accurate structures, authentic real-world detail, physically realistic materials, fine surface texture, natural imperfections, and convincing depth. The subject should feel tangible and physically present.
Use cinematic, physically believable lighting: natural highlights, soft shadows, realistic reflections, and subtle atmospheric depth. Dramatic but controlled contrast, realistic color, no excessive glow, neon, oversaturation, or fantasy effects.
Match the field: aerospace photography for rockets, realistic medical visualization for anatomy, architectural photography for buildings, industrial product photography for machines, naturalistic photography for landscapes. Keep structures scientifically and physically plausible. Do not invent parts, incorrect anatomy, impossible geometry, or misleading detail.
Make the primary subject immediately recognizable and dominant. Cinematic camera, realistic perspective, clean frame, sharp subject detail, natural depth of field.
Generate only the requested scene. Do not add captions, labels, UI, watermarks, logos, or decorative typography.`;

const STUDIO_VIDEO_STYLE =
  "Photorealistic cinematic video, like a premium documentary frame or high-end visual-effects render. Believable materials, real texture, physically plausible light, soft shadows, and natural color. Not a cartoon, diagram, or flat graphic. No captions, labels, logos, or watermark. One slow obvious motion. No dialogue, no narration, no voiceover.";

function cleanId(value, fallback) {
  const id = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return id || fallback;
}

function parseJson(text) {
  const raw = String(text || "").trim().replace(/^```json\s*|```$/g, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Gemini plan was not JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Image was not a data URL");
  return { mimeType: match[1], base64: match[2] };
}

export function normalizeStudioPlan(parsed, prompt) {
  const momentsIn = Array.isArray(parsed?.moments) ? parsed.moments : [];
  const moments = [];
  for (let i = 0; i < STUDIO_MOMENTS; i += 1) {
    const src = momentsIn[i] || {};
    const title = String(src.title || `Moment ${i + 1}`).slice(0, 80);
    const imagesIn = Array.isArray(src.images) ? src.images : [];
    const images = IMAGE_KINDS.map((kind, k) => {
      const item = imagesIn[k] || {};
      const fallback =
        kind === "angle"
          ? `${title}, the same subject from another real camera angle`
          : kind === "part"
            ? `${title}, one important part of the same subject`
            : kind === "detail"
              ? `${title}, a closer view of the same subject`
              : `${title}, one clear view of the whole subject`;
      return {
        id: cleanId(item.id, kind),
        kind,
        prompt: String(item.prompt || item.imagePrompt || fallback).slice(0, 500),
        url: null,
        error: null,
        positions: {},
      };
    });
    const labelsIn = Array.isArray(src.labels) ? src.labels : [];
    let labels = labelsIn
      .slice(0, 3)
      .map((label, n) => ({
        id: cleanId(label.id || label.text, `part_${n + 1}`),
        text: String(label.text || label.name || "").slice(0, 40),
        blurb: String(label.blurb || label.reason || "").slice(0, 240),
      }))
      .filter((label) => label.text);
    if (labels.length < 2) {
      labels = [
        { id: "whole", text: "Whole subject", blurb: `This is the main subject of ${title}.` },
        { id: "detail", text: "Key detail", blurb: `A closer look at what matters in ${title}.` },
      ];
    }
    const pointsIn = Array.isArray(src.points) ? src.points : [];
    let points = pointsIn
      .map((point) => String(point || "").replace(/\s+/g, " ").trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 4);
    if (points.length < 2) {
      points = [`${title} shows the subject clearly.`, "The parts work together in this moment."];
    }
    moments.push({
      id: cleanId(src.id, `moment_${i + 1}`),
      title,
      caption: String(src.caption || title).slice(0, 80),
      videoPrompt: String(src.videoPrompt || `${title}. Slow obvious motion, no dialogue.`).slice(0, 400),
      images,
      labels,
      points,
      exploded: { url: null, error: null },
      inside: { url: null, error: null },
      seekSec: null,
      clipError: null,
    });
  }
  return {
    topic: String(parsed?.topic || prompt).slice(0, 120),
    moments,
  };
}

function planPrompt(prompt) {
  return `You plan a short classroom lesson from one teacher prompt.
Prompt: "${String(prompt).replace(/"/g, "'")}"

Return JSON only. Exactly 5 moments, in order: introduction, what it is made of, how it works, what changes, why it matters.
Each moment has exactly 4 short image prompts: wide view, another angle, one part, a closer view. Photorealistic, not a diagram or cartoon.
Each moment has 2 or 3 part labels.
Each moment has exactly 3 short summary points. One sentence each.
Captions are 8 words or fewer. Each video prompt is one slow action and no dialogue.

{
  "topic": "short topic",
  "moments": [
    {
      "id": "moment_1",
      "title": "short title",
      "caption": "eight words max",
      "videoPrompt": "one slow action",
      "images": [
        { "id": "wide", "prompt": "one clear view of the whole subject" },
        { "id": "angle", "prompt": "the same subject from another angle" },
        { "id": "part", "prompt": "one important part" },
        { "id": "detail", "prompt": "a closer view of the same subject" }
      ],
      "points": [
        "One short fact about this moment.",
        "What the student should notice.",
        "Why that matters."
      ],
      "labels": [
        { "id": "part_a", "text": "Part name", "blurb": "one sentence a student can understand" }
      ]
    }
  ]
}`;
}

export function publicStudioSession(session) {
  return {
    id: session.id,
    topic: session.topic,
    prompt: session.prompt,
    moments: session.moments.map((moment) => ({
      id: moment.id,
      title: moment.title,
      caption: moment.caption,
      seekSec: moment.seekSec ?? null,
      clipError: moment.clipError || null,
      labels: moment.labels,
      points: moment.points || [],
      exploded: moment.exploded ? { url: moment.exploded.url || null, error: moment.exploded.error || null } : null,
      inside: moment.inside ? { url: moment.inside.url || null, error: moment.inside.error || null } : null,
      images: moment.images.map((image) => ({
        id: image.id,
        kind: image.kind,
        url: image.url || null,
        error: image.error || null,
        positions: image.positions || {},
      })),
    })),
    video: session.video,
    errors: session.errors,
  };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg is not available (ffmpeg-static missing)"));
      return;
    }
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.split("\n").filter(Boolean).slice(-3).join(" ") || `ffmpeg exited ${code}`));
    });
  });
}

async function normalizeClip(input, output) {
  const video =
    "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[v]";
  const common = [
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "main",
    "-preset",
    "fast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-t",
    String(CLIP_SECONDS),
    "-movflags",
    "+faststart",
    output,
  ];
  try {
    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-filter_complex",
      `${video};[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=0:${CLIP_SECONDS},asetpts=PTS-STARTPTS[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      ...common,
    ]);
  } catch {
    await runFfmpeg([
      "-y",
      "-i",
      input,
      "-f",
      "lavfi",
      "-t",
      String(CLIP_SECONDS),
      "-i",
      "anullsrc=r=48000:cl=stereo",
      "-filter_complex",
      video,
      "-map",
      "[v]",
      "-map",
      "1:a",
      ...common,
    ]);
  }
}

async function concatClips(inputPaths, destPath) {
  const dir = path.dirname(destPath);
  await fs.mkdir(dir, { recursive: true });
  const normalized = [];
  for (let i = 0; i < inputPaths.length; i += 1) {
    const output = path.join(dir, `.studio-norm-${i}.mp4`);
    await normalizeClip(inputPaths[i], output);
    normalized.push(output);
  }
  const listPath = path.join(dir, `.studio-concat-${Date.now()}.txt`);
  const list = normalized.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n");
  const tmpPath = path.join(dir, `.studio-lesson.${process.pid}.${Date.now()}.tmp.mp4`);
  try {
    await fs.writeFile(listPath, list);
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", tmpPath]);
    await fs.rename(tmpPath, destPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  } finally {
    await fs.unlink(listPath).catch(() => {});
    await Promise.all(normalized.map((file) => fs.unlink(file).catch(() => {})));
  }
}

function stillPrompt(image) {
  return `${image.prompt}. Same subject as the rest of this lesson.`;
}

async function writeStill(dir, sessionId, momentIndex, image) {
  const dataUrl = await generateDiagram(stillPrompt(image), {
    instruction: STUDIO_STILL_INSTRUCTION,
  });
  const { mimeType, base64 } = parseDataUrl(dataUrl);
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const name = `moment-${momentIndex + 1}-image-${image.kind}.${ext}`;
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  const stamp = Date.now();
  return {
    filePath,
    mimeType,
    base64,
    url: `/generated/studio/${sessionId}/${name}?t=${stamp}`,
  };
}

export async function generateStudioLesson({ prompt, onProgress }) {
  const text = String(prompt || "").trim();
  if (!text) {
    const err = new Error("Prompt is required");
    err.status = 400;
    throw err;
  }

  const sessionId = String(Date.now());
  const sessionDir = path.join(GENERATED_ROOT, "studio", sessionId);
  const videoDir = path.join(sessionDir, "video");
  await fs.mkdir(videoDir, { recursive: true });

  const session = {
    id: sessionId,
    topic: text.slice(0, 120),
    prompt: text,
    moments: [],
    video: null,
    errors: [],
  };

  const emit = async (notice) => {
    if (onProgress) await onProgress({ notice, session: publicStudioSession(session) });
  };

  await emit("Planning five moments…");
  const raw = await geminiGenerate(planPrompt(text), { json: true, maxOutputTokens: 8192, temperature: 0.4 });
  const plan = normalizeStudioPlan(parseJson(raw), text);
  session.topic = plan.topic;
  session.moments = plan.moments.map((moment) => ({
    ...moment,
    images: moment.images.map((image) => ({ ...image })),
    labels: moment.labels.map((label) => ({ ...label })),
  }));
  await emit("Plan ready. Creating stills…");

  for (let i = 0; i < session.moments.length; i += 1) {
    const moment = session.moments[i];
    for (let k = 0; k < moment.images.length; k += 1) {
      const image = moment.images[k];
      const n = i * STUDIO_IMAGES + k + 1;
      await emit(`Creating still ${n} of ${STUDIO_MOMENTS * STUDIO_IMAGES}…`);
      try {
        const saved = await writeStill(sessionDir, sessionId, i, image);
        image.url = saved.url;
        image.filePath = saved.filePath;
        image.mimeType = saved.mimeType;
        image.base64 = saved.base64;
        await emit(`Still ready: ${moment.title}`);
      } catch (err) {
        image.error = err.message;
        session.errors.push(`${moment.title}: ${err.message}`);
        await emit(`Still failed: ${moment.title}`);
      }
    }

    const lead = moment.images[0]?.prompt || moment.title;
    await emit(`Exploded view: ${moment.title}`);
    try {
      const saved = await writeStill(sessionDir, sessionId, i, {
        kind: "exploded",
        prompt: `${lead}. Exploded view of this one subject: its main parts separated in space, each part still recognizable, same materials and lighting.`,
      });
      moment.exploded = { url: saved.url, error: null };
      await emit(`Exploded view ready: ${moment.title}`);
    } catch (err) {
      moment.exploded = { url: null, error: err.message };
      session.errors.push(`${moment.title} exploded: ${err.message}`);
      await emit(`Exploded view failed: ${moment.title}`);
    }

    await emit(`Inside view: ${moment.title}`);
    try {
      const saved = await writeStill(sessionDir, sessionId, i, {
        kind: "inside",
        prompt: `${lead}. Inside view of this same subject: a clean cutaway that shows the interior, same materials and lighting.`,
      });
      moment.inside = { url: saved.url, error: null };
      await emit(`Inside view ready: ${moment.title}`);
    } catch (err) {
      moment.inside = { url: null, error: err.message };
      session.errors.push(`${moment.title} inside: ${err.message}`);
      await emit(`Inside view failed: ${moment.title}`);
    }
  }

  const clipPaths = [];
  const clipMoments = [];
  for (let i = 0; i < session.moments.length; i += 1) {
    const moment = session.moments[i];
    const still = moment.images.find((image) => image.base64);
    if (!still) {
      moment.clipError = "No still was available for this moment";
      session.errors.push(`${moment.title}: video clip skipped`);
      await emit(moment.clipError);
      continue;
    }
    await emit(`Generating video ${clipPaths.length + 1} of ${STUDIO_MOMENTS}: ${moment.title}…`);
    const destPath = path.join(videoDir, `clip-${i + 1}.mp4`);
    try {
      await generateVeoClipFromImage({
        prompt: `${moment.videoPrompt} ${STUDIO_VIDEO_STYLE}`,
        imageBase64: still.base64,
        mimeType: still.mimeType,
        destPath,
        durationSeconds: CLIP_SECONDS,
      });
      clipPaths.push(destPath);
      clipMoments.push(moment);
      await emit(`Video clip ready: ${moment.title}`);
    } catch (err) {
      moment.clipError = err.message;
      session.errors.push(`${moment.title}: ${err.message}`);
      await emit(`Video clip failed: ${moment.title}`);
    }
  }

  if (clipPaths.length > 0) {
    const lessonName = `lesson-${sessionId}.mp4`;
    const posterName = `lesson-${sessionId}-poster.jpg`;
    const destPath = path.join(videoDir, lessonName);
    const posterPath = path.join(videoDir, posterName);
    await emit("Joining the moments into one video…");
    try {
      if (clipPaths.length === 1) await fs.copyFile(clipPaths[0], destPath);
      else await concatClips(clipPaths, destPath);
      await writeMergedPoster(destPath, posterPath).catch(() => {});
      clipMoments.forEach((moment, index) => {
        moment.seekSec = index * CLIP_SECONDS;
      });
      const stamp = Date.now();
      session.video = {
        id: "studio-lesson",
        merged: true,
        title: session.topic,
        url: `/generated/studio/${sessionId}/video/${lessonName}?t=${stamp}`,
        posterUrl: `/generated/studio/${sessionId}/video/${posterName}?t=${stamp}`,
        durationSeconds: clipPaths.length * CLIP_SECONDS,
        captions: clipMoments.map((moment) => ({ atSec: moment.seekSec, text: moment.caption })),
      };
      await emit("Lesson video ready");
    } catch (err) {
      session.errors.push(err.message);
      await emit(`Could not join the video: ${err.message}`);
    }
  }

  return publicStudioSession(session);
}
