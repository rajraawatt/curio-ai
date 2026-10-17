import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";
import { generateDiagram, geminiGenerate, generateVeoClipFromImage, synthesizeSpeech } from "./gcp.js";
import { writeMergedPoster } from "./mergeLessonVideo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, "../../frontend/public/generated");

// Test runs stop after chapter 3. Restore [40, 32, 24, 16, 16] for a full lesson.
export const CHAPTER_SECONDS = [24, 24, 16];
export const STUDIO_MOMENTS = CHAPTER_SECONDS.length;
const CLIP_SECONDS = 8;
const JOIN_FADE_SECONDS = 0.8;

const STUDIO_STILL_INSTRUCTION = `Visual style: photorealistic cinematic realism.
Generate an exceptionally realistic, high-detail, cinematic image of the requested subject. It should look like a premium real-world photograph or a high-end photorealistic 3D render from an expert visual effects studio, never like a cartoon, illustration, flat graphic, or generic AI artwork.
Reproduce believable proportions, accurate structures, authentic real-world detail, physically realistic materials, fine surface texture, natural imperfections, and convincing depth. The subject should feel tangible and physically present.
Use cinematic, physically believable lighting: natural highlights, soft shadows, realistic reflections, and subtle atmospheric depth. Dramatic but controlled contrast, realistic color, no excessive glow, neon, oversaturation, or fantasy effects.
Match the field: aerospace photography for rockets, realistic medical visualization for anatomy, architectural photography for buildings, industrial product photography for machines, naturalistic photography for landscapes. Keep structures scientifically and physically plausible. Do not invent parts, incorrect anatomy, impossible geometry, or misleading detail.
Make the primary subject immediately recognizable and dominant. Cinematic camera, realistic perspective, clean frame, sharp subject detail, natural depth of field.
Frame every picture as a wide 16:9 shot. Fill the frame edge to edge. Do not leave empty borders or a square picture inside a wider frame.
Add the short part labels named in the prompt. Place each label beside that part with a thin line. Use only those words. No captions, logos, watermarks, or extra text.`;

const STUDIO_VIDEO_STYLE =
  "Photorealistic cinematic picture in a full 16:9 frame. Fill the frame edge to edge, with no black bars and no square image. Same subject, same place, same light as the still. One slow physical motion. The reference frames contain short part labels and thin lines. Those words and lines are not part of the scene. Do not reproduce any text, labels, leader lines, or captions. No speaking, no narrator, no voice, no lyrics, no on-screen text, no watermark.";

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

function clipCount(seconds) {
  return Math.round(seconds / CLIP_SECONDS);
}

export function normalizeStudioPlan(parsed, prompt) {
  const momentsIn = Array.isArray(parsed?.chapters) ? parsed.chapters : Array.isArray(parsed?.moments) ? parsed.moments : [];
  const moments = [];
  let seek = 0;
  for (let i = 0; i < CHAPTER_SECONDS.length; i += 1) {
    const seconds = CHAPTER_SECONDS[i];
    const clips = clipCount(seconds);
    const src = momentsIn[i] || {};
    const title = String(src.title || `Chapter ${i + 1}`).slice(0, 80);
    const framesIn = Array.isArray(src.frames) ? src.frames : Array.isArray(src.images) ? src.images : [];
    const images = Array.from({ length: clips + 1 }, (_, k) => {
      const item = framesIn[k] || {};
      const fallback = `${title}, the same subject ${k * CLIP_SECONDS} seconds later`;
      return {
        id: cleanId(item.id, `frame_${k + 1}`),
        kind: `frame-${k + 1}`,
        prompt: String(item.prompt || item.imagePrompt || fallback).slice(0, 500),
        url: null,
        error: null,
        positions: {},
      };
    });
    const linesIn = Array.isArray(src.narration) ? src.narration : [];
    const narration = Array.from({ length: clips }, (_, k) =>
      String(linesIn[k]?.text || linesIn[k] || src.caption || title).replace(/\s+/g, " ").trim().slice(0, 220)
    );
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
      id: cleanId(src.id, `chapter_${i + 1}`),
      title,
      caption: String(src.caption || title).slice(0, 80),
      seconds,
      narration,
      images,
      labels,
      points,
      exploded: { url: null, error: null },
      inside: { url: null, error: null },
      seekSec: seek,
      clipError: null,
      clipPaths: [],
    });
    seek += seconds;
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
  const shape = CHAPTER_SECONDS.map((seconds, index) => {
    const clips = clipCount(seconds);
    return `Chapter ${index + 1} is ${seconds} seconds: ${clips + 1} frames and ${clips} narration lines.`;
  }).join(" ");
  return `You plan one classroom lesson from one teacher prompt.
Prompt: "${String(prompt).replace(/"/g, "'")}"

Return JSON only. One continuous story in exactly ${CHAPTER_SECONDS.length} chapters. ${shape}
Write a subject sentence that names the exact thing and the place. Every chapter stays with that same subject and place.
Chapter 1 opens the scene. Each later chapter continues that same action. Do not start a new topic.
A frame is one photorealistic 16:9 still. The frames in a chapter are a storyboard: frame 1 is second 0, and each next frame is 8 seconds later. Describe the same subject moving forward. No diagrams, no square frames, no text in the picture.
Each narration line is about 20 words a teacher would say during that 8-second step. One line per step, in order.
Each chapter has exactly 2 part labels. Every label needs a one-sentence blurb, 3 short overview lines, and 3 quick facts. Facts must be true for a classroom, not invented numbers. Exactly 3 short summary points.
Captions are 8 words or fewer.

{
  "topic": "short topic",
  "subject": "the exact subject and place",
  "chapters": [
    {
      "id": "chapter_1",
      "title": "short title",
      "caption": "eight words max",
      "frames": [{ "id": "frame_1", "prompt": "the subject at this moment, wide 16:9" }],
      "narration": ["About twenty words spoken during this eight second step."],
      "points": ["One short fact.", "What to notice.", "Why it matters."],
      "labels": [
        {
          "id": "part_a",
          "text": "Part name",
          "blurb": "one sentence a student can understand",
          "highlights": ["One thing to notice.", "What it does here.", "Why it matters."],
          "facts": [["Name", "short value"], ["Name", "short value"], ["Name", "short value"]]
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
      seconds: moment.seconds || null,
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
      clip: moment.clip
        ? {
            url: moment.clip.url,
            posterUrl: moment.clip.posterUrl || null,
            durationSeconds: moment.clip.durationSeconds,
            stepSeconds: moment.clip.stepSeconds || null,
            captions: moment.clip.captions || [],
          }
        : null,
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

async function concatReady(inputPaths, destPath) {
  if (inputPaths.length === 1) {
    await fs.copyFile(inputPaths[0], destPath);
    return;
  }
  const dir = path.dirname(destPath);
  const listPath = path.join(dir, `.studio-ready-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
  const list = inputPaths.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n");
  const tmpPath = path.join(dir, `.studio-ready.${process.pid}.${Date.now()}.tmp.mp4`);
  try {
    await fs.writeFile(listPath, list);
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", tmpPath]);
    await fs.rename(tmpPath, destPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  } finally {
    await fs.unlink(listPath).catch(() => {});
  }
}

async function muxSpeech(videoPath, speech, destPath) {
  const audioPath = destPath.replace(/\.mp4$/, ".mp3");
  await fs.writeFile(audioPath, speech);
  try {
    await runFfmpeg([
      "-y",
      "-i",
      videoPath,
      "-i",
      audioPath,
      "-filter_complex",
      `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,apad,atrim=0:${CLIP_SECONDS},asetpts=PTS-STARTPTS[a]`,
      "-map",
      "0:v",
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
      "-t",
      String(CLIP_SECONDS),
      "-movflags",
      "+faststart",
      destPath,
    ]);
  } finally {
    await fs.unlink(audioPath).catch(() => {});
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
  const blends = [];
  try {
    let current = normalized[0];
    let duration = CLIP_SECONDS;
    for (let i = 1; i < normalized.length; i += 1) {
      const output = path.join(dir, `.studio-blend-${i}.${process.pid}.mp4`);
      blends.push(output);
      const offset = Math.max(0, duration - JOIN_FADE_SECONDS).toFixed(3);
      await runFfmpeg([
        "-y",
        "-i",
        current,
        "-i",
        normalized[i],
        "-filter_complex",
        `[0:v]setpts=PTS-STARTPTS,fps=24,format=yuv420p[v0];[1:v]setpts=PTS-STARTPTS,fps=24,format=yuv420p[v1];[v0][v1]xfade=transition=fade:duration=${JOIN_FADE_SECONDS}:offset=${offset}[v];[0:a]asetpts=PTS-STARTPTS[a0];[1:a]asetpts=PTS-STARTPTS[a1];[a0][a1]acrossfade=d=${JOIN_FADE_SECONDS}[a]`,
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
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        output,
      ]);
      duration += CLIP_SECONDS - JOIN_FADE_SECONDS;
      current = output;
    }
    await fs.copyFile(current, destPath);
  } finally {
    await Promise.all(normalized.map((file) => fs.unlink(file).catch(() => {})));
    await Promise.all(blends.map((file) => fs.unlink(file).catch(() => {})));
  }
}

function blendedSeconds(clipCount) {
  if (clipCount <= 1) return clipCount * CLIP_SECONDS;
  return clipCount * CLIP_SECONDS - (clipCount - 1) * JOIN_FADE_SECONDS;
}

function stillPrompt(image) {
  return `${image.prompt}. Wide 16:9 frame, edge to edge. Same subject as the rest of this lesson.`;
}

const ROCKET_TOPIC = "Rocket Launch Mechanics";
const ROCKET_VIDEO = {
  url: "/generated/studio/1791914535838/video/lesson-1791914535838.mp4",
  posterUrl: "/generated/studio/1791914535838/video/lesson-1791914535838-poster.jpg",
};

function isRocketPrompt(text) {
  return /rocket/i.test(String(text || ""));
}

async function writeStill(dir, sessionId, momentIndex, image, onStatus) {
  const dataUrl = await generateDiagram(stillPrompt(image), {
    instruction: STUDIO_STILL_INSTRUCTION,
    aspectRatio: "16:9",
    onStatus,
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

function savedRocketSession() {
  const base = "/generated/studio/1791914535838";
  const still = (moment) => ({
    id: "detail",
    kind: "detail",
    url: `${base}/moment-${moment}-image-detail.png`,
    error: null,
  });
  const moments = [
    {
      id: "moment_1",
      title: "Ignition and Liftoff",
      caption: "The engines push against the pad",
      seekSec: 0,
      points: [
        "Fuel and oxidizer meet in the combustion chamber.",
        "Hot gas leaves through the nozzle at high speed.",
        "That downward push lifts the rocket.",
      ],
      labels: [
        {
          id: "combustion_chamber",
          text: "Combustion Chamber",
          blurb: "The combustion chamber is where fuel and oxidizer burn and turn into hot, high-pressure gas.",
          facts: [
            ["Function", "Burns the propellant"],
            ["Material", "Strong metal chamber"],
            ["Purpose", "Builds the pressure that becomes thrust"],
          ],
        },
        {
          id: "nozzle",
          text: "Nozzle",
          blurb: "The nozzle speeds the exhaust up and points the push downward.",
          facts: [
            ["Function", "Speeds up the exhaust"],
            ["Material", "Heat-resistant bell"],
            ["Purpose", "Turns chamber pressure into lift"],
          ],
        },
      ],
      images: [still(1)],
    },
    {
      id: "moment_2",
      title: "Thrust builds",
      caption: "The plume drives the rocket up",
      seekSec: 8,
      points: [
        "The propellant feed system keeps the engine supplied.",
        "The exhaust plume is the visible result of the burn.",
        "As the plume stays strong, the rocket climbs.",
      ],
      labels: [
        {
          id: "feed_system",
          text: "Propellant Feed",
          blurb: "Pumps and pipes deliver fuel and oxidizer to the engine.",
          facts: [
            ["Function", "Feeds the chamber"],
            ["Material", "Pumps and pipes"],
            ["Purpose", "Keeps the burn going"],
          ],
        },
        {
          id: "exhaust_plume",
          text: "Exhaust Plume",
          blurb: "The bright stream of gas shooting out of the nozzle.",
          facts: [
            ["Function", "Leaves the nozzle at high speed"],
            ["Material", "Burned propellant"],
            ["Purpose", "Pushes the rocket upward"],
          ],
        },
      ],
      images: [still(2)],
    },
  ];
  return {
    id: "rocket-saved",
    topic: ROCKET_TOPIC,
    subtitle: "Watch the engines light and the exhaust push the rocket up.",
    prompt: ROCKET_TOPIC,
    moments,
    errors: [],
    video: {
      id: "studio-lesson",
      merged: true,
      title: ROCKET_TOPIC,
      url: ROCKET_VIDEO.url,
      posterUrl: ROCKET_VIDEO.posterUrl,
      durationSeconds: 16,
      captions: moments.map((moment) => ({ atSec: moment.seekSec, text: moment.caption })),
    },
  };
}

export async function generateStudioLesson({ prompt, onProgress }) {
  const text = String(prompt || "").trim();
  if (!text) {
    const err = new Error("Prompt is required");
    err.status = 400;
    throw err;
  }

  if (isRocketPrompt(text)) {
    const session = savedRocketSession();
    if (onProgress) {
      await onProgress({ notice: "Opening the saved Rocket Launch Mechanics lesson…", progress: 40, session });
      await onProgress({ notice: "Lesson video ready", progress: 100, session });
    }
    return publicStudioSession(session);
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

  const statusLog = [];
  let emitChain = Promise.resolve();
  const note = (line) => {
    statusLog.push(String(line).slice(0, 90));
    if (statusLog.length > 6) statusLog.shift();
  };
  const emit = (notice, progress, done = false) => {
    emitChain = emitChain.then(async () => {
      const payload = {
        notice,
        progress,
        done,
        log: statusLog.slice(),
        updatedAt: Date.now(),
        session: publicStudioSession(session),
      };
      await fs.writeFile(path.join(sessionDir, "session.json"), JSON.stringify(payload));
      if (onProgress) await onProgress(payload);
    }).catch(() => {});
    return emitChain;
  };

  async function runPool(jobs, limit, onDone) {
    if (!jobs.length) return;
    let cursor = 0;
    let finished = 0;
    const workers = Array.from({ length: Math.min(limit, jobs.length) }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor];
        cursor += 1;
        await job();
        finished += 1;
        await onDone(finished, jobs.length);
      }
    });
    await Promise.all(workers);
  }

  await emit("Planning", 4);
  const raw = await geminiGenerate(planPrompt(text), { json: true, maxOutputTokens: 16384, temperature: 0.4 });
  const plan = normalizeStudioPlan(parseJson(raw), text);
  session.topic = plan.topic;
  session.moments = plan.moments.map((moment) => ({
    ...moment,
    images: moment.images.map((image) => {
      const names = moment.labels.map((label) => label.text).filter(Boolean).join(", ");
      const ending = names ? ` Add short labels with thin lines for: ${names}.` : "";
      return {
        ...image,
        prompt: `${plan.subject}. ${image.prompt}.${ending}`.slice(0, 700),
      };
    }),
    labels: moment.labels.map((label) => ({ ...label })),
  }));
  await emit("Stills", 8);

  let banner = "Stills";
  let bannerProgress = 8;
  const emitAt = async (notice, progress, done = false) => {
    banner = notice;
    bannerProgress = Math.max(bannerProgress, progress);
    await emit(banner, bannerProgress, done);
  };

  const stillTotal = session.moments.reduce((sum, moment) => sum + moment.images.length, 0);
  const clipTotal = session.moments.reduce((sum, moment) => sum + Math.max(0, moment.images.length - 1), 0);
  let stillsFinished = 0;
  let clipsFinished = 0;
  const clipWait = [];
  const clipStarted = new Set();
  let veoRunning = 0;

  const makeClip = async (moment, momentIndex, clipIndex) => {
    const start = moment.images[clipIndex];
    const end = moment.images[clipIndex + 1];
    if (!start?.base64 || !end?.base64) {
      session.errors.push(`${moment.title} clip ${clipIndex + 1}: missing still`);
      return;
    }
    const rawPath = path.join(videoDir, `raw-${momentIndex + 1}-${clipIndex + 1}.mp4`);
    const destPath = path.join(videoDir, `clip-${momentIndex + 1}-${clipIndex + 1}.mp4`);
    note(`Ch${momentIndex + 1} clip ${clipIndex + 1} · Veo`);
    try {
      await generateVeoClipFromImage({
        prompt: `${moment.caption || moment.title}. Move from this frame toward the next. ${STUDIO_VIDEO_STYLE}`,
        imageBase64: start.base64,
        mimeType: start.mimeType || "image/png",
        lastImageBase64: end.base64,
        lastMimeType: end.mimeType || "image/png",
        destPath: rawPath,
        durationSeconds: CLIP_SECONDS,
        generateAudio: false,
        resolution: "720p",
      });
      const line = moment.narration?.[clipIndex] || moment.caption || moment.title;
      try {
        const speech = await synthesizeSpeech(line);
        if (!speech) throw new Error("Text-to-Speech returned no audio");
        await muxSpeech(rawPath, speech, destPath);
      } catch (err) {
        session.errors.push(`${moment.title} voice ${clipIndex + 1}: ${err.message}`);
        await fs.copyFile(rawPath, destPath);
      }
      moment.clipPaths[clipIndex] = destPath;
    } catch (err) {
      session.errors.push(`${moment.title} video ${clipIndex + 1}: ${err.message}`);
      moment.clipError = err.message;
    }
  };

  const enqueueClips = () => {
    for (let index = 0; index < session.moments.length; index += 1) {
      const moment = session.moments[index];
      for (let clip = 0; clip < moment.images.length - 1; clip += 1) {
        if (veoRunning >= 4) return;
        const key = `${index}:${clip}`;
        if (clipStarted.has(key)) continue;
        const start = moment.images[clip];
        const end = moment.images[clip + 1];
        if (start?.error || end?.error) {
          clipStarted.add(key);
          clipsFinished += 1;
          continue;
        }
        if (!start?.base64 || !end?.base64) continue;
        clipStarted.add(key);
        veoRunning += 1;
        const job = makeClip(moment, index, clip).finally(() => {
          veoRunning -= 1;
          clipsFinished += 1;
          enqueueClips();
          const pct = 8 + Math.round((clipsFinished / Math.max(1, clipTotal)) * 72);
          emitAt(`Clips ${clipsFinished}/${clipTotal}`, Math.min(88, pct));
        });
        clipWait.push(job);
      }
    }
  };

  const paintStills = async (indexes) => {
    const jobs = [];
    for (const index of indexes) {
      const moment = session.moments[index];
      moment.images.forEach((image) => {
        jobs.push(async () => {
          const frame = String(image.kind || "frame").replace("frame-", "F");
          try {
            const saved = await writeStill(sessionDir, sessionId, index, image, async (info) => {
              const line = info.status === 200
                ? `Ch${index + 1} ${frame} · 200`
                : `Ch${index + 1} ${frame} · retry ${info.attempt} · ${info.status}`;
              note(line);
              await emitAt(banner, bannerProgress);
            });
            image.url = saved.url;
            image.filePath = saved.filePath;
            image.mimeType = saved.mimeType;
            image.base64 = saved.base64;
          } catch (err) {
            image.error = err.message;
            session.errors.push(`${moment.title}: ${err.message}`);
            note(`Ch${index + 1} ${frame} · ${String(err.message).slice(0, 48)}`);
          }
          stillsFinished += 1;
          enqueueClips();
          const pct = 8 + Math.round((stillsFinished / Math.max(1, stillTotal)) * 40);
          await emitAt(`Stills ${stillsFinished}/${stillTotal}`, pct);
        });
      });
    }
    await runPool(jobs, 1, async () => {});
  };

  await paintStills(session.moments.map((_, index) => index));
  enqueueClips();
  while (clipWait.length) {
    const batch = clipWait.splice(0, clipWait.length);
    await Promise.all(batch);
  }

  const chapterPaths = [];
  const lessonCaptions = [];
  let clock = 0;
  const stamp = Date.now();
  for (let i = 0; i < session.moments.length; i += 1) {
    const moment = session.moments[i];
    const ready = [];
    (moment.clipPaths || []).forEach((file, index) => {
      if (file) ready.push({ file, index });
    });
    moment.seekSec = clock;
    if (!ready.length) {
      moment.clip = null;
      moment.seconds = 0;
      continue;
    }
    const chapterPath = path.join(videoDir, `chapter-${i + 1}.mp4`);
    if (ready.length === 1) await fs.copyFile(ready[0].file, chapterPath);
    else await concatClips(ready.map((item) => item.file), chapterPath);
    chapterPaths.push(chapterPath);
    const played = blendedSeconds(ready.length);
    const stepSeconds = ready.length > 1 ? CLIP_SECONDS - JOIN_FADE_SECONDS : CLIP_SECONDS;
    const chapterCaptions = [];
    ready.forEach((item, step) => {
      const text = moment.narration?.[item.index] || moment.caption;
      const atSec = step * stepSeconds;
      chapterCaptions.push({ atSec, text });
      lessonCaptions.push({ atSec: clock + atSec, text });
    });
    moment.seconds = played;
    moment.clip = {
      url: `/generated/studio/${sessionId}/video/chapter-${i + 1}.mp4?t=${stamp}`,
      posterUrl: moment.images.find((image) => image.url)?.url || null,
      durationSeconds: played,
      stepSeconds,
      captions: chapterCaptions,
    };
    clock += played;
  }

  const lessonName = `lesson-${sessionId}.mp4`;
  const lessonPath = path.join(videoDir, lessonName);
  if (chapterPaths.length >= 2) {
    await emit("Joining", 94);
    await concatReady(chapterPaths, lessonPath);
  } else if (chapterPaths.length === 1) {
    await fs.copyFile(chapterPaths[0], lessonPath);
  }
  if (chapterPaths.length) {
    const posterName = `lesson-${sessionId}-poster.jpg`;
    const posterPath = path.join(videoDir, posterName);
    await writeMergedPoster(lessonPath, posterPath).catch(() => {});
    session.video = {
      id: "studio-lesson",
      merged: chapterPaths.length > 1,
      title: session.topic,
      url: `/generated/studio/${sessionId}/video/${lessonName}?t=${Date.now()}`,
      posterUrl: `/generated/studio/${sessionId}/video/${posterName}?t=${Date.now()}`,
      durationSeconds: clock,
      voiced: true,
      captions: lessonCaptions,
    };
    await emit("Ready", 100, true);
  } else {
    await emit("No video", 100, true);
  }

  return publicStudioSession(session);
}
