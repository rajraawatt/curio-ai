import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";
import { generateDiagram, generateVeoClipFromImage, geminiGenerate } from "./gcp.js";
import { writeMergedPoster } from "./mergeLessonVideo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, "../../frontend/public/generated");

export const STUDIO_MOMENTS = 2;
export const STUDIO_IMAGES = 2;
const CLIP_SECONDS = 8;
const JOIN_FADE_SECONDS = 0.4;
const IMAGE_KINDS = ["wide", "detail"];

const STUDIO_STILL_INSTRUCTION = `Visual style: photorealistic cinematic realism.
Generate an exceptionally realistic, high-detail, cinematic image of the requested subject. It should look like a premium real-world photograph or a high-end photorealistic 3D render from an expert visual effects studio, never like a cartoon, illustration, flat graphic, or generic AI artwork.
Reproduce believable proportions, accurate structures, authentic real-world detail, physically realistic materials, fine surface texture, natural imperfections, and convincing depth. The subject should feel tangible and physically present.
Use cinematic, physically believable lighting: natural highlights, soft shadows, realistic reflections, and subtle atmospheric depth. Dramatic but controlled contrast, realistic color, no excessive glow, neon, oversaturation, or fantasy effects.
Match the field: aerospace photography for rockets, realistic medical visualization for anatomy, architectural photography for buildings, industrial product photography for machines, naturalistic photography for landscapes. Keep structures scientifically and physically plausible. Do not invent parts, incorrect anatomy, impossible geometry, or misleading detail.
Make the primary subject immediately recognizable and dominant. Cinematic camera, realistic perspective, clean frame, sharp subject detail, natural depth of field.
Frame every picture as a wide 16:9 shot. Fill the frame edge to edge. Do not leave empty borders or a square picture inside a wider frame.
Add the short part labels named in the prompt. Place each label beside that part with a thin line. Use only those words. No captions, logos, watermarks, or extra text.`;

const STUDIO_VIDEO_STYLE =
  "Photorealistic cinematic picture in a full 16:9 frame. Fill the frame edge to edge, with no black bars and no square image. Same subject, same place, same light as the still. One slow physical motion. No speaking, no narrator, no voice, no lyrics, no on-screen text, no labels, no watermark.";

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
        kind === "detail"
          ? `${title}, a closer view of the same subject in the same place`
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
      .map((label, n) => normalizeLabel(label, n, title))
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
    subject: String(parsed?.subject || parsed?.topic || prompt).slice(0, 240),
    moments,
  };
}

function shortLine(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeLabel(label, index, title) {
  const text = shortLine(label?.text || label?.name, 40);
  const highlights = (Array.isArray(label?.highlights) ? label.highlights : [])
    .map((item) => shortLine(typeof item === "string" ? item : item?.text, 120))
    .filter(Boolean)
    .slice(0, 4);
  const facts = (Array.isArray(label?.facts) ? label.facts : [])
    .map((item) => {
      if (Array.isArray(item)) return [shortLine(item[0], 32), shortLine(item[1], 40)];
      return [shortLine(item?.name || item?.label, 32), shortLine(item?.value, 40)];
    })
    .filter(([name, value]) => name && value)
    .slice(0, 4);
  const steps = (value) =>
    (Array.isArray(value) ? value : [])
      .map((item) => ({
        title: shortLine(item?.title || item?.name, 48),
        text: shortLine(item?.text || item?.detail, 180),
      }))
      .filter((item) => item.title && item.text)
      .slice(0, 5);
  const structure = (Array.isArray(label?.structure) ? label.structure : [])
    .map((item) => ({
      name: shortLine(item?.name || item?.title, 40),
      detail: shortLine(item?.detail || item?.text, 160),
    }))
    .filter((item) => item.name && item.detail)
    .slice(0, 4);
  return {
    id: cleanId(label?.id || text, `part_${index + 1}`),
    text,
    blurb: shortLine(label?.blurb || label?.reason, 240) || `This is one important part of ${title}.`,
    highlights,
    facts,
    panels: {
      function: steps(label?.function || label?.panels?.function),
      structure,
      related: steps(label?.related || label?.panels?.related),
    },
  };
}

function planPrompt(prompt) {
  return `You plan a short classroom lesson from one teacher prompt.
Prompt: "${String(prompt).replace(/"/g, "'")}"

Return JSON only. One continuous story in exactly 2 moments.
Write a subject sentence that names the exact thing and the place. Both moments must use that same subject and place.
Moment 1 opens the scene. Moment 2 continues that same action a few seconds later. Do not start a new topic.
Each moment has exactly 2 image prompts: a wide 16:9 view, then a closer 16:9 view of the same subject. Photorealistic, not a diagram. Never a square frame.
Each moment has 2 or 3 part labels. Every label needs a one-sentence blurb, 3 short overview lines, 3 quick facts, 3 function steps, 3 structure rows, and 2 related parts. Facts must be true for a classroom, not invented numbers. Exactly 3 short summary points.
Captions are 8 words or fewer.
Each video prompt is silent motion in a full 16:9 frame, with the subject filling the picture and no empty borders. Do not write a sentence for someone to read aloud. The second video prompt must continue the first, not repeat it.

{
  "topic": "short topic",
  "subject": "the exact subject and place, used in both moments",
  "moments": [
    {
      "id": "moment_1",
      "title": "short title",
      "caption": "eight words max",
      "videoPrompt": "the opening motion, with no words to speak",
      "images": [
        { "id": "wide", "prompt": "wide view of the subject in that place" },
        { "id": "detail", "prompt": "closer view of the same subject in that place" }
      ],
      "points": [
        "One short fact about this moment.",
        "What the student should notice.",
        "Why that matters."
      ],
      "labels": [
        {
          "id": "part_a",
          "text": "Part name",
          "blurb": "one sentence a student can understand",
          "highlights": ["One thing to notice.", "What it does here.", "Why it matters."],
          "facts": [["Name", "short value"], ["Name", "short value"], ["Name", "short value"]],
          "function": [
            { "title": "First action", "text": "What this part does first." },
            { "title": "Next action", "text": "What happens after that." },
            { "title": "Result", "text": "What the student should remember." }
          ],
          "structure": [
            { "name": "Piece", "detail": "What this piece is." },
            { "name": "Piece", "detail": "How it fits with the others." },
            { "name": "Piece", "detail": "Where it sits in the subject." }
          ],
          "related": [
            { "title": "Other part", "text": "How it connects to this one." },
            { "title": "Other part", "text": "What the student can look at next." }
          ]
        }
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

async function mergeTwoClips(firstPath, secondPath, destPath) {
  const offset = (CLIP_SECONDS - JOIN_FADE_SECONDS).toFixed(2);
  const dir = path.dirname(destPath);
  const normalized = [0, 1].map((index) => path.join(dir, `.studio-join-${index}.${process.pid}.mp4`));
  const tmpPath = path.join(dir, `.studio-lesson.${process.pid}.${Date.now()}.tmp.mp4`);
  try {
    await normalizeClip(firstPath, normalized[0]);
    await normalizeClip(secondPath, normalized[1]);
    await runFfmpeg([
      "-y",
      "-i",
      normalized[0],
      "-i",
      normalized[1],
      "-filter_complex",
      `[0:v][1:v]xfade=transition=fade:duration=${JOIN_FADE_SECONDS}:offset=${offset}[v];[0:a][1:a]acrossfade=d=${JOIN_FADE_SECONDS}[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
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
      "-movflags",
      "+faststart",
      tmpPath,
    ]);
    await fs.rename(tmpPath, destPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  } finally {
    await Promise.all(normalized.map((file) => fs.unlink(file).catch(() => {})));
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
  return `${image.prompt}. Wide 16:9 frame, edge to edge. Same subject as the rest of this lesson.`;
}

async function writeStill(dir, sessionId, momentIndex, image) {
  const dataUrl = await generateDiagram(stillPrompt(image), {
    instruction: STUDIO_STILL_INSTRUCTION,
    aspectRatio: "16:9",
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

  const emit = async (notice, progress) => {
    if (onProgress) await onProgress({ notice, progress, session: publicStudioSession(session) });
  };

  await emit("Planning two connected moments…", 4);
  const raw = await geminiGenerate(planPrompt(text), { json: true, maxOutputTokens: 8192, temperature: 0.4 });
  const plan = normalizeStudioPlan(parseJson(raw), text);
  session.topic = plan.topic;
  session.moments = plan.moments.map((moment) => ({
    ...moment,
    images: moment.images.map((image) => {
      const names = moment.labels.map((label) => label.text).filter(Boolean).join(", ");
      return {
        ...image,
        prompt: `${plan.subject}. ${image.prompt}. Add short labels with thin lines for: ${names}.`.slice(0, 700),
      };
    }),
    labels: moment.labels.map((label) => ({ ...label })),
  }));
  await emit("Plan ready. Creating stills…", 8);

  for (let i = 0; i < session.moments.length; i += 1) {
    const moment = session.moments[i];
    for (let k = 0; k < moment.images.length; k += 1) {
      const image = moment.images[k];
      const n = i * STUDIO_IMAGES + k + 1;
      const stillStart = 8 + ((n - 1) / (STUDIO_MOMENTS * STUDIO_IMAGES)) * 36;
      const stillDone = 8 + (n / (STUDIO_MOMENTS * STUDIO_IMAGES)) * 36;
      await emit(`Creating still ${n} of ${STUDIO_MOMENTS * STUDIO_IMAGES}…`, Math.round(stillStart));
      try {
        const saved = await writeStill(sessionDir, sessionId, i, image);
        image.url = saved.url;
        image.filePath = saved.filePath;
        image.mimeType = saved.mimeType;
        image.base64 = saved.base64;
        await emit(`Still ready: ${moment.title}`, Math.round(stillDone));
      } catch (err) {
        image.error = err.message;
        session.errors.push(`${moment.title}: ${err.message}`);
        await emit(`Still failed: ${moment.title}`, Math.round(stillDone));
      }
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
      await emit(moment.clipError, 44 + i * 26);
      continue;
    }
    await emit(`Generating video ${clipPaths.length + 1} of ${STUDIO_MOMENTS}: ${moment.title}…`, 46 + i * 24);
    const destPath = path.join(videoDir, `clip-${i + 1}.mp4`);
    try {
      const motion = i === 0
        ? `Opening of one continuous scene. ${moment.videoPrompt}`
        : `A few seconds later in that same scene. Continue the motion. Do not start over and do not repeat the opening. ${moment.videoPrompt}`;
      await generateVeoClipFromImage({
        prompt: `${plan.subject}. ${motion} ${STUDIO_VIDEO_STYLE}`,
        imageBase64: still.base64,
        mimeType: still.mimeType,
        destPath,
        durationSeconds: CLIP_SECONDS,
        generateAudio: false,
        aspectRatio: "16:9",
        resolution: "720p",
      });
      clipPaths.push(destPath);
      clipMoments.push(moment);
      await emit(`Video clip ready: ${moment.title}`, 68 + i * 24);
    } catch (err) {
      moment.clipError = err.message;
      session.errors.push(`${moment.title}: ${err.message}`);
      await emit(`Video clip failed: ${moment.title}`, 68 + i * 24);
    }
  }

  if (clipPaths.length > 0) {
    const lessonName = `lesson-${sessionId}.mp4`;
    const posterName = `lesson-${sessionId}-poster.jpg`;
    const destPath = path.join(videoDir, lessonName);
    const posterPath = path.join(videoDir, posterName);
    await emit("Joining the moments into one video…", 96);
    try {
      if (clipPaths.length === 1) await fs.copyFile(clipPaths[0], destPath);
      else if (clipPaths.length === 2) await mergeTwoClips(clipPaths[0], clipPaths[1], destPath);
      else await concatClips(clipPaths, destPath);
      await writeMergedPoster(destPath, posterPath).catch(() => {});
      const joined = clipPaths.length === 2;
      clipMoments.forEach((moment, index) => {
        moment.seekSec = joined ? index * (CLIP_SECONDS - JOIN_FADE_SECONDS) : index * CLIP_SECONDS;
      });
      const stamp = Date.now();
      session.video = {
        id: "studio-lesson",
        merged: true,
        title: session.topic,
        url: `/generated/studio/${sessionId}/video/${lessonName}?t=${stamp}`,
        posterUrl: `/generated/studio/${sessionId}/video/${posterName}?t=${stamp}`,
        durationSeconds: clipPaths.length === 2
          ? CLIP_SECONDS * 2 - JOIN_FADE_SECONDS
          : clipPaths.length * CLIP_SECONDS,
        captions: clipMoments.map((moment) => ({ atSec: moment.seekSec, text: moment.caption })),
      };
      await emit("Lesson video ready", 100);
    } catch (err) {
      session.errors.push(err.message);
      await emit(`Could not join the video: ${err.message}`, 96);
    }
  }

  return publicStudioSession(session);
}
