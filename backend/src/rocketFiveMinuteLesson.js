import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";
import { generateDiagram, synthesizeSpeech } from "./gcp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, "../../frontend/public/generated");
const SOURCE_VIDEO = path.join(GENERATED_ROOT, "studio/1791914535838/video/lesson-1791914535838.mp4");
const TARGET_SECONDS = 300;
const INTRO_SECONDS = 16;
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;
const INTRO_NARRATION = "Here is our starting point: a launch vehicle ready to leave Earth. Over the next five minutes, we will trace the forces and systems that make that possible, from the propellant tanks to the engine nozzle, liftoff, and the path toward orbit.";

const CHAPTERS = [
  {
    id: "rocket-basics",
    title: "1. What makes a rocket move?",
    caption: "A rocket moves by throwing mass backward.",
    visual: "Photorealistic full-scale launch vehicle on a launchpad before ignition, dawn light, wide aerospace documentary shot.",
    narration: "A rocket does not push against the launchpad or against the air to move forward. It carries propellant with it. Inside the engine, that propellant becomes hot gas and rushes out of the nozzle. The gas moves downward and backward, while the rocket gains forward momentum. This is the central idea behind rocket propulsion. In this lesson, we will follow the propellant from its tanks to the engine, see how thrust is created, and understand why a rocket can keep accelerating even after it leaves the atmosphere."
  },
  {
    id: "propellant-feed",
    title: "2. Fuel and oxidizer",
    caption: "The engine needs fuel and an oxidizer.",
    visual: "Photorealistic cutaway of a modern liquid rocket with separate fuel and liquid oxygen tanks and feed pipes, scientifically plausible aerospace engineering visualization.",
    narration: "Many large rockets use liquid fuel and a separate oxidizer, often liquid oxygen. Fuel stores chemical energy, while the oxidizer supplies the oxygen needed for combustion. Pumps and pipes move both liquids from their tanks toward the engine. The propellants must arrive in the right amounts and at high pressure. A steady feed matters because the engine needs a continuous supply to keep producing hot gas. Other rockets use solid propellant, where fuel and oxidizer are mixed into a solid grain before launch. The design differs, but both systems carry the material needed for combustion."
  },
  {
    id: "combustion-chamber",
    title: "3. Inside the combustion chamber",
    caption: "Combustion turns propellant into hot, high-pressure gas.",
    visual: "Photorealistic detailed cutaway of a rocket engine combustion chamber and injector, hot gas contained by a heat-resistant metal chamber, no labels or text.",
    narration: "Inside a liquid rocket engine, injectors spray fuel and oxidizer into the combustion chamber. They react and release chemical energy, producing extremely hot gas at high pressure. The chamber has to contain that pressure and survive intense heat. Its job is not simply to make a flame; it creates the conditions that allow gas to expand through the nozzle. Engine designers carefully manage cooling, pressure, and the flow of propellants. If the flow becomes unstable, thrust can change or the engine can be damaged. A stable chamber gives the nozzle a dependable stream of energetic gas."
  },
  {
    id: "nozzle",
    title: "4. How the nozzle creates thrust",
    caption: "The nozzle accelerates exhaust out of the engine.",
    visual: "Photorealistic close-up of a bell-shaped rocket engine nozzle with a bright exhaust plume, realistic metal texture and aerospace photography.",
    narration: "The nozzle guides hot gas out of the engine and converts some of its pressure and thermal energy into directed motion. The narrow throat is followed by a widening bell. Under the right conditions, the gas accelerates to very high speed as it expands. The exhaust leaves mostly backward, carrying momentum with it. The rocket experiences an equal and opposite force. Nozzle shape and the surrounding air pressure affect how efficiently the engine works. This is why rocket engines are designed for particular operating conditions, from the dense air near the ground to the thin atmosphere at high altitude."
  },
  {
    id: "newtons-third-law",
    title: "5. Thrust and Newton’s third law",
    caption: "Backward exhaust produces a forward force.",
    visual: "Photorealistic rocket engine firing on a test stand, plume directed downward, industrial test facility, physically realistic scale.",
    narration: "Newton’s third law says that forces come in equal and opposite pairs. The engine pushes exhaust backward, and the exhaust pushes the rocket forward. More precisely, thrust depends on how much mass leaves each second, how fast it leaves, and the pressure difference at the nozzle exit. You do not need to calculate those values to understand the idea. Watch the direction of the exhaust: it travels away from the rocket, while the rocket accelerates the other way. This also explains why a rocket works in space. It does not need air to push on; it carries and expels its own reaction mass."
  },
  {
    id: "liftoff",
    title: "6. From launchpad to the sky",
    caption: "The rocket lifts when thrust exceeds its weight.",
    visual: "Photorealistic heavy launch rocket just clearing the launch tower, bright engine plume and realistic smoke, cinematic aerospace documentary shot.",
    narration: "Before liftoff, the launchpad supports the rocket against gravity. When the engines ignite, thrust rises. The rocket begins to lift when the upward thrust is greater than its weight, with the launch structure no longer holding it down. As it rises, the vehicle becomes lighter because it is burning propellant, so the same thrust can produce greater acceleration. The rocket must also steer and control its attitude while passing through the thick lower atmosphere. Liftoff is only the first part of the journey. The vehicle still needs enough speed and the correct direction to reach its intended destination."
  },
  {
    id: "gravity-drag",
    title: "7. Gravity, drag and acceleration",
    caption: "Thrust must overcome gravity and atmospheric drag.",
    visual: "Photorealistic rocket climbing through the atmosphere with a visible exhaust plume, Earth curvature faintly visible, scientifically plausible flight photography.",
    narration: "A rocket's engine does not spend all its thrust increasing forward speed. Near the ground, gravity pulls it downward, and the atmosphere creates drag that resists motion. The rocket's path and speed are planned to manage these forces while limiting structural loads. As it climbs, the air becomes thinner and drag usually decreases. Gravity remains, but the rocket can continue accelerating when its thrust exceeds the forces opposing its motion. Engineers monitor the vehicle's speed, angle, pressure, temperature, and vibration. A successful flight is not just about making a powerful engine; it is about guiding the entire vehicle through changing conditions."
  },
  {
    id: "staging-orbit",
    title: "8. Staging and reaching orbit",
    caption: "Stages discard empty mass; speed makes orbit possible.",
    visual: "Photorealistic multistage launch vehicle separating its spent lower stage above Earth, upper stage continuing toward space, accurate aerospace documentary image.",
    narration: "Many launch vehicles use multiple stages. When a lower stage has used most of its propellant, it separates so the upper stage no longer has to carry its empty tanks and engines. The upper stage then continues accelerating the payload. Reaching orbit is not simply reaching a high altitude. A spacecraft needs enough horizontal speed to keep falling around Earth rather than back to the surface. The launch vehicle follows a curved trajectory to build that speed. Remember the full chain: propellant feeds the chamber, combustion creates hot gas, the nozzle accelerates the exhaust, and the reaction force accelerates the rocket. That is how a launch becomes a journey into orbit."
  }
];

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg-static is unavailable"));
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve()
      : reject(new Error(stderr.split("\n").filter(Boolean).slice(-5).join(" ") || `ffmpeg exited ${code}`)));
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Image generation returned no image data");
  return { mimeType: match[1], base64: match[2] };
}

async function makeImage(chapter, index, sessionDir) {
  // Reuse visuals already generated during an interrupted run, so retries do not
  // spend image quota again for completed chapters.
  for (const ext of ["png", "jpg"]) {
    const cachedPath = path.join(sessionDir, `chapter-${index + 1}.${ext}`);
    const cached = await fs.access(cachedPath).then(() => true).catch(() => false);
    if (cached) {
      return { imagePath: cachedPath, url: `/generated/studio/rocket-five-minute/chapter-${index + 1}.${ext}` };
    }
  }

  const dataUrl = await generateDiagram(
    `${chapter.visual} Lesson topic: rocket launch mechanics. Chapter focus: ${chapter.title}. Wide 16:9, photorealistic, no words, no labels, no watermark.`,
    {
      aspectRatio: "16:9",
      instruction: "Create a premium aerospace documentary still. Scientifically plausible, realistic materials and lighting, edge-to-edge wide frame, clear visual subject, no text, no labels, no logos, no watermark."
    }
  );
  const { mimeType, base64 } = parseDataUrl(dataUrl);
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const imagePath = path.join(sessionDir, `chapter-${index + 1}.${ext}`);
  await fs.writeFile(imagePath, Buffer.from(base64, "base64"));
  return { imagePath, url: `/generated/studio/rocket-five-minute/chapter-${index + 1}.${ext}` };
}

async function normalizeIntro(source, output, narrationPath) {
  await runFfmpeg([
    "-y", "-i", source,
    "-i", narrationPath,
    "-filter_complex",
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1,fps=${FPS},format=yuv420p,trim=duration=${INTRO_SECONDS},setpts=PTS-STARTPTS[v];[1:a]aresample=48000,apad[a]`,
    "-map", "[v]", "-map", "[a]", "-t", String(INTRO_SECONDS),
    "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", output
  ]);
}

async function renderChapter(imagePath, audioPath, output, durationSeconds) {
  await runFfmpeg([
    "-y", "-loop", "1", "-framerate", String(FPS), "-i", imagePath, "-i", audioPath,
    "-filter_complex",
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},zoompan=z='min(zoom+0.00018,1.07)':d=1:s=${WIDTH}x${HEIGHT}:fps=${FPS},setsar=1,format=yuv420p[v];[1:a]atempo=1.1,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad[a]`,
    "-map", "[v]", "-map", "[a]", "-t", String(durationSeconds),
    "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", output
  ]);
}

export async function buildRocketFiveMinuteLesson({ onProgress } = {}) {
  const sessionDir = path.join(GENERATED_ROOT, "studio", "rocket-five-minute");
  const videoDir = path.join(sessionDir, "video");
  await fs.mkdir(videoDir, { recursive: true });
  const finalPath = path.join(videoDir, "lesson-rocket-launch-mechanics-five-minute.mp4");
  const posterPath = path.join(videoDir, "lesson-rocket-launch-mechanics-five-minute-poster.jpg");
  const sourceExists = await fs.access(SOURCE_VIDEO).then(() => true).catch(() => false);
  const introSeconds = sourceExists ? INTRO_SECONDS : 0;
  const chapterSeconds = (TARGET_SECONDS - introSeconds) / CHAPTERS.length;
  const clips = [];
  const moments = [];
  const chapters = [];

  const emit = async (notice, progress) => {
    if (onProgress) await onProgress({ notice, progress });
  };

  if (projectIdMissing()) {
    throw new Error("A Google Cloud project is required for narrated Studio lessons. Set GOOGLE_CLOUD_PROJECT and run gcloud auth application-default login.");
  }

  if (sourceExists) {
    await emit("Preparing the existing Rocket Launch Mechanics footage…", 4);
    const introPath = path.join(videoDir, "rocket-intro-normalized.mp4");
    const introAudioPath = path.join(sessionDir, "rocket-intro-narration.mp3");
    const introAudio = await synthesizeSpeech(INTRO_NARRATION, "en", "11-14", 1.1);
    if (!introAudio?.length) throw new Error("Text-to-Speech returned no intro narration.");
    await fs.writeFile(introAudioPath, introAudio);
    await normalizeIntro(SOURCE_VIDEO, introPath, introAudioPath);
    clips.push(introPath);
    moments.push({
      id: "original-rocket-footage",
      title: "Original launch footage",
      summary: "Start with the saved Rocket Launch Mechanics video.",
      caption: "We will trace how a rocket leaves Earth.",
      seekSec: 0,
      points: [INTRO_NARRATION],
      labels: [],
      images: [{ id: "wide", kind: "wide", url: "/generated/studio/1791914535838/moment-1-image-detail.png", error: null, positions: {} }],
      narration: INTRO_NARRATION,
      durationSeconds: INTRO_SECONDS
    });
    chapters.push({
      id: "original-rocket-footage",
      title: "Original launch footage",
      startSeconds: 0,
      endSeconds: INTRO_SECONDS,
      concepts: ["The launch is the starting point for the lesson"]
    });
  }

  for (let i = 0; i < CHAPTERS.length; i += 1) {
    const chapter = CHAPTERS[i];
    await emit(`Generating visual for chapter ${i + 1} of ${CHAPTERS.length}: ${chapter.title}`, 8 + i * 10);
    const image = await makeImage(chapter, i, sessionDir);
    await emit(`Narrating chapter ${i + 1} of ${CHAPTERS.length}…`, 12 + i * 10);
    const audio = await synthesizeSpeech(chapter.narration, "en", "11-14", 1.2);
    if (!audio?.length) throw new Error("Text-to-Speech returned no audio. Check Google Cloud Text-to-Speech access.");
    const audioPath = path.join(sessionDir, `chapter-${i + 1}.mp3`);
    await fs.writeFile(audioPath, audio);
    const clipPath = path.join(videoDir, `chapter-${i + 1}.mp4`);
    await renderChapter(image.imagePath, audioPath, clipPath, chapterSeconds);
    clips.push(clipPath);
    const startSeconds = introSeconds + i * chapterSeconds;
    const moment = {
      id: chapter.id,
      title: chapter.title,
      summary: chapter.caption,
      caption: chapter.caption,
      seekSec: startSeconds,
      points: [chapter.caption, chapter.narration.slice(0, 150)],
      labels: [],
      images: [{ id: "wide", kind: "wide", url: image.url, error: null, positions: {} }],
      narration: chapter.narration,
      durationSeconds: chapterSeconds
    };
    moments.push(moment);
    chapters.push({
      id: chapter.id,
      title: chapter.title,
      startSeconds,
      endSeconds: startSeconds + chapterSeconds,
      concepts: [chapter.caption]
    });
  }

  await emit("Assembling the narrated five-minute lesson…", 92);
  const listPath = path.join(videoDir, "rocket-five-minute-concat.txt");
  const list = clips.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, list, "utf8");
  const tmpPath = path.join(videoDir, ".rocket-five-minute.tmp.mp4");
  try {
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", tmpPath]);
    await fs.rename(tmpPath, finalPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  } finally {
    await fs.unlink(listPath).catch(() => {});
  }

  await runFfmpeg(["-y", "-ss", "2", "-i", finalPath, "-frames:v", "1", "-update", "1", "-q:v", "3", posterPath]).catch(() => {});
  const video = {
    id: "studio-lesson-five-minute",
    merged: true,
    isFiveMinute: true,
    title: "Rocket Launch Mechanics — 5-minute lesson",
    url: "/generated/studio/rocket-five-minute/video/lesson-rocket-launch-mechanics-five-minute.mp4",
    posterUrl: "/generated/studio/rocket-five-minute/video/lesson-rocket-launch-mechanics-five-minute-poster.jpg",
    durationSeconds: TARGET_SECONDS,
    chapters,
    captions: []
  };
  await emit("Five-minute lesson ready", 100);
  return { video, moments, introSeconds };
}

function projectIdMissing() {
  return !process.env.GOOGLE_CLOUD_PROJECT;
}
