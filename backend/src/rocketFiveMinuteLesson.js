import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";
import { generateDiagram, generateVeoClipFromImage, synthesizeSpeech } from "./gcp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, "../../frontend/public/generated");
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 24;

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

function runFfmpeg(args, { timeoutMs = 120_000, onHeartbeat } = {}) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg-static is unavailable"));
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    const heartbeat = onHeartbeat ? setInterval(() => {
      Promise.resolve(onHeartbeat()).catch(() => {});
    }, 10_000) : null;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error(`FFmpeg timed out after ${Math.round(timeoutMs / 1000)} seconds${stderr.trim() ? `: ${stderr.split(/\r?\n/).filter(Boolean).slice(-3).join(" ")}` : ""}`));
    }, timeoutMs);
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (heartbeat) clearInterval(heartbeat);
      if (error) reject(error);
      else resolve();
    };
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-12_000); });
    child.on("error", finish);
    child.on("close", (code) => code === 0
      ? finish()
      : finish(new Error(stderr.split(/\r?\n/).filter(Boolean).slice(-5).join(" ") || `ffmpeg exited ${code}`)));
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Image generation returned no image data");
  return { mimeType: match[1], base64: match[2] };
}

async function fileExistsWithContent(filePath, minBytes = 1024) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size >= minBytes;
  } catch {
    return false;
  }
}

async function mediaDurationSeconds(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-i", filePath, "-frames:v", "1", "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (code !== 0 || !match) return reject(new Error("Could not read media duration for " + path.basename(filePath)));
      resolve(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
    });
  });
}

async function makeImage(chapter, index, sessionDir, emit) {
  // Reuse visuals already generated during an interrupted run, so retries do not
  // spend image quota again for completed chapters.
  for (const ext of ["png", "jpg"]) {
    const cachedPath = path.join(sessionDir, `chapter-${index + 1}.${ext}`);
    const cached = await fs.access(cachedPath).then(() => true).catch(() => false);
    if (cached) {
      await emit?.("Cache hit: reusing chapter " + (index + 1) + " image — no image API call", null);
      return { imagePath: cachedPath, url: `/generated/studio/rocket-five-minute/chapter-${index + 1}.${ext}` };
    }
  }

  await emit?.("API call: generating chapter " + (index + 1) + " image with " + (process.env.IMAGEN_MODEL || "gemini-2.5-flash-image"), null);
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


const MOTION_SHOT_SECONDS = 8;
const GENERATION_REVISION = 3;

function splitNarrationIntoShots(narration, shotCount) {
  const words = String(narration || "").trim().split(/\s+/).filter(Boolean);
  const chunkSize = Math.ceil(words.length / shotCount);
  return Array.from({ length: shotCount }, (_, index) => {
    const chunk = words.slice(index * chunkSize, (index + 1) * chunkSize);
    return chunk.join(" ") || words.slice(-Math.max(1, chunkSize)).join(" ") || String(narration || "");
  });
}

async function assembleMotionShots(shotPaths, destPath) {
  if (!shotPaths.length) throw new Error("No generated video shots were available");
  const dir = path.dirname(destPath);
  const listPath = path.join(dir, ".motion-shots-" + process.pid + "-" + Date.now() + ".txt");
  const tmpPath = destPath + ".tmp.mp4";
  await fs.writeFile(listPath, shotPaths.map((file) => "file '" + file.replace(/'/g, "'\\''") + "'").join("\n"), "utf8");
  try {
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-an", "-vf",
      "scale=" + WIDTH + ":" + HEIGHT + ":force_original_aspect_ratio=increase,crop=" + WIDTH + ":" + HEIGHT + ",fps=" + FPS + ",setsar=1,format=yuv420p",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmpPath], { timeoutMs: 180_000 });
    await fs.rename(tmpPath, destPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  } finally {
    await fs.unlink(listPath).catch(() => {});
  }
}

let activeBuildPromise = null;

// Coalesce repeated clicks/requests while a lesson is being generated.
export function buildRocketFiveMinuteLesson(options = {}) {
  if (activeBuildPromise) return activeBuildPromise;
  activeBuildPromise = buildRocketFiveMinuteLessonOnce(options).finally(() => {
    activeBuildPromise = null;
  });
  return activeBuildPromise;
}

async function buildRocketFiveMinuteLessonOnce({ onProgress } = {}) {
  const sessionDir = path.join(GENERATED_ROOT, "studio", "rocket-five-minute");
  const videoDir = path.join(sessionDir, "video");
  await fs.mkdir(videoDir, { recursive: true });
  const finalPath = path.join(videoDir, "lesson-rocket-launch-mechanics-five-minute-v3.mp4");
  const posterPath = path.join(videoDir, "lesson-rocket-launch-mechanics-five-minute-v3-poster.jpg");
  const metadataPath = path.join(videoDir, "lesson-rocket-launch-mechanics-five-minute.json");
  const cachedFinalIsUsable = await fileExistsWithContent(finalPath, 100_000);
  if (cachedFinalIsUsable) {
    try {
      const cachedResult = JSON.parse(await fs.readFile(metadataPath, "utf8"));
      if (cachedResult?.video?.chapterMode === true && cachedResult?.video?.generationRevision === 2 && cachedResult?.video?.url && Array.isArray(cachedResult?.moments) && cachedResult.moments.every((moment) => moment.videoUrl && moment.durationSeconds > 0)) {
        await onProgress?.({ notice: "Cache hit: complete lesson found — no generation APIs called", progress: 100 });
        return cachedResult;
      }
    } catch {
      // Older or incomplete cache: rebuild once, reusing any existing image/audio assets below.
    }
  }
  const clips = [];
  const moments = [];
  const chapters = [];
  let timelineSeconds = 0;

  const emit = async (notice, progress) => {
    if (onProgress) await onProgress({ notice, progress });
  };

  if (projectIdMissing()) {
    throw new Error("A Google Cloud project is required for narrated Studio lessons. Set GOOGLE_CLOUD_PROJECT and run gcloud auth application-default login.");
  }

  for (let i = 0; i < CHAPTERS.length; i += 1) {
    const chapter = CHAPTERS[i];
    const number = i + 1;
    await emit("Preparing the visual for chapter " + number + " of " + CHAPTERS.length + "…", 3 + i * 10);
    const image = await makeImage(chapter, i, sessionDir, emit);
    const audioPath = path.join(sessionDir, "chapter-" + number + ".mp3");
    if (!(await fileExistsWithContent(audioPath))) {
      await emit("API call: generating chapter " + number + " narration with Google Cloud Text-to-Speech", 5 + i * 10);
      const audio = await synthesizeSpeech(chapter.narration, "en", "11-14", 1.08);
      if (!audio?.length) throw new Error("Text-to-Speech returned no audio. Check Google Cloud Text-to-Speech access.");
      await fs.writeFile(audioPath, audio);
    } else {
      await emit("Cache hit: reusing chapter " + number + " narration audio — no TTS API call", null);
    }
    const audioDuration = await mediaDurationSeconds(audioPath);
    const shotCount = Math.max(1, Math.ceil(audioDuration / MOTION_SHOT_SECONDS));
    const shotNarrations = splitNarrationIntoShots(chapter.narration, shotCount);
    const shotPaths = [];
    for (let shotIndex = 0; shotIndex < shotCount; shotIndex += 1) {
      const shotNumber = shotIndex + 1;
      const motionShotPath = path.join(videoDir, "chapter-" + number + "-shot-" + shotNumber + "-v3.mp4");
      if (!(await fileExistsWithContent(motionShotPath, 100_000))) {
        await emit("API call: generating unique video shot " + shotNumber + " of " + shotCount + " for chapter " + number + " — visuals are aligned to this narration segment", 8 + i * 9 + Math.round((shotIndex / shotCount) * 7));
        const imageBytes = await fs.readFile(image.imagePath);
        const mimeType = image.imagePath.endsWith(".jpg") ? "image/jpeg" : "image/png";
        await generateVeoClipFromImage({
          prompt: "Create a distinct 8-second educational aerospace documentary shot that visually illustrates this specific narration segment: \"" + shotNarrations[shotIndex] + "\". Overall chapter: " + chapter.title + ". Scene direction: " + chapter.visual + " Make this shot visually different from a generic repeated loop: use meaningful continuous action, a clear camera move, realistic physics, and a composition that supports the narration segment. The provided image is a visual reference, not a request to repeat the same motion. No text, labels, logos, or watermark. Voice-over will be added separately.",
          imageBase64: imageBytes.toString("base64"), mimeType, destPath: motionShotPath,
          durationSeconds: MOTION_SHOT_SECONDS, aspectRatio: "16:9", generateAudio: false
        });
        if (!(await fileExistsWithContent(motionShotPath, 100_000))) throw new Error("Veo did not produce a usable shot " + shotNumber + " for chapter " + number + ".");
      } else {
        await emit("Cache hit: reusing chapter " + number + " shot " + shotNumber + " — no video generation API call", null);
      }
      shotPaths.push(motionShotPath);
    }
    const motionPath = path.join(videoDir, "chapter-" + number + "-motion-v3.mp4");
    if (!(await fileExistsWithContent(motionPath, 100_000)) || (await fs.stat(motionPath)).mtimeMs < Math.max(...(await Promise.all(shotPaths.map((p) => fs.stat(p)))).map((st) => st.mtimeMs))) {
      await emit("Local processing: joining " + shotCount + " unique visual shots for chapter " + number, 10 + i * 9);
      await assembleMotionShots(shotPaths, motionPath);
    }
    const clipPath = path.join(videoDir, "chapter-" + number + "-narrated-v3.mp4");
    if (!(await fileExistsWithContent(clipPath, 100_000)) || (await fs.stat(clipPath)).mtimeMs < Math.max((await fs.stat(motionPath)).mtimeMs, (await fs.stat(audioPath)).mtimeMs)) {
      await emit("Local processing: combining the complete chapter visuals with narration (no looping)", 12 + i * 9);
      await runFfmpeg(["-y", "-i", motionPath, "-i", audioPath, "-filter_complex",
        "[0:v]scale=" + WIDTH + ":" + HEIGHT + ":force_original_aspect_ratio=increase,crop=" + WIDTH + ":" + HEIGHT + ",fps=" + FPS + ",setsar=1,format=yuv420p[v];[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a]",
        "-map", "[v]", "-map", "[a]", "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", clipPath], {
          timeoutMs: 180_000,
          onHeartbeat: () => emit("Still processing chapter " + number + " video locally with FFmpeg…", null)
        });
    } else {
      await emit("Cache hit: reusing completed chapter " + number + " video — no generation API call", null);
    }
    const durationSeconds = await mediaDurationSeconds(clipPath);
    const startSeconds = timelineSeconds;
    const endSeconds = startSeconds + durationSeconds;
    timelineSeconds = endSeconds;
    clips.push(clipPath);
    const moment = { id: chapter.id, title: chapter.title, summary: chapter.caption, caption: chapter.caption, seekSec: startSeconds,
      points: [chapter.caption, chapter.narration.slice(0, 150)], labels: [],
      images: [{ id: "wide", kind: "wide", url: image.url, error: null, positions: {} }], narration: chapter.narration,
      videoUrl: "/generated/studio/rocket-five-minute/video/chapter-" + number + "-narrated-v3.mp4", posterUrl: image.url, durationSeconds };
    moments.push(moment);
    chapters.push({ id: chapter.id, title: chapter.title, startSeconds, endSeconds, durationSeconds, videoUrl: moment.videoUrl, concepts: [chapter.caption] });
    const partialVideo = {
      id: "studio-lesson-five-minute",
      generationRevision: GENERATION_REVISION,
      merged: true,
      chapterMode: true,
      title: "Rocket Launch Mechanics — narrated video lesson",
      url: "/generated/studio/rocket-five-minute/video/lesson-rocket-launch-mechanics-five-minute-v3.mp4",
      posterUrl: moments[0]?.posterUrl || null,
      durationSeconds: timelineSeconds,
      chapters: [...chapters],
      captions: []
    };
    await onProgress?.({
      notice: "Chapter " + number + " is ready to watch",
      progress: Math.min(90, 12 + number * 9),
      partialResult: { video: partialVideo, moments: [...moments] }
    });
  }
  await emit("All chapters are ready. Assembling the combined lesson for download…", 94);
  const listPath = path.join(videoDir, "rocket-five-minute-concat.txt");
  const list = clips.map((file) => "file '" + file.replace(/'/g, "'\\''") + "'").join("\n");
  await fs.writeFile(listPath, list, "utf8");
  const tmpPath = path.join(videoDir, ".rocket-five-minute.tmp.mp4");
  try {
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", String(FPS), "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", tmpPath], { timeoutMs: 180_000, onHeartbeat: () => emit("The chapter videos are ready. Still assembling the downloadable full lesson…", null) });
    if (!(await fileExistsWithContent(tmpPath, 100_000))) throw new Error("FFmpeg created an empty combined lesson video.");
    await fs.rename(tmpPath, finalPath);
  } catch (err) { await fs.unlink(tmpPath).catch(() => {}); throw err; }
  finally { await fs.unlink(listPath).catch(() => {}); }
  await runFfmpeg(["-y", "-ss", "2", "-i", finalPath, "-frames:v", "1", "-update", "1", "-q:v", "3", posterPath]).catch(() => {});
  const video = { id: "studio-lesson-five-minute", merged: true, chapterMode: true, generationRevision: GENERATION_REVISION, title: "Rocket Launch Mechanics — narrated video lesson",
    url: "/generated/studio/rocket-five-minute/video/lesson-rocket-launch-mechanics-five-minute-v3.mp4", posterUrl: moments[0]?.posterUrl || null, durationSeconds: timelineSeconds, chapters, captions: [] };
  await emit("Lesson ready", 100);
  const result = { video, moments };
  await fs.writeFile(metadataPath, JSON.stringify(result, null, 2), "utf8");
  return result;
}

function projectIdMissing() {
  return !process.env.GOOGLE_CLOUD_PROJECT;
}
