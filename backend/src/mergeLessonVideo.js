import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import ffmpegPath from "ffmpeg-static";

export const LESSON_CLIP_SECONDS = 8;
export const MAX_LESSON_CLIPS = 40;
export const MERGE_FADE_SECONDS = 0.45;
export const TARGET_LESSON_SECONDS = 300;
/** Bump when merge/manifest behavior changes so old outputs rebuild. */
export const MERGE_REVISION = 6;

const MERGE_WIDTH = 1280;
const MERGE_HEIGHT = 720;
const MERGE_FPS = 24;

function playbackCaptions(captions) {
  const raw = Array.isArray(captions) ? captions : [];
  if (raw.length >= 3) return [{ ...raw[0], atSec: 0 }, { ...raw[raw.length - 1], atSec: 4.2 }];
  return raw;
}

export function mergedDurationSeconds(clipCount, clipSec = LESSON_CLIP_SECONDS, fadeSec = MERGE_FADE_SECONDS) {
  if (clipCount <= 0) return 0;
  return clipCount * clipSec - fadeSec * Math.max(0, clipCount - 1);
}

export function buildMergedVideoMeta(videos, packId, fadeSec = MERGE_FADE_SECONDS) {
  const clips = (videos || []).slice(0, MAX_LESSON_CLIPS);
  if (clips.length < 2) return null;
  const cues = [];
  const chapters = [];
  let offset = 0;
  clips.forEach((clip, index) => {
    const duration = Math.max(0, Number(clip.durationSeconds) || LESSON_CLIP_SECONDS);
    const chapter = clip.chapter || {};
    chapters.push({
      id: chapter.id || clip.id || `chapter-${index + 1}`,
      title: chapter.title || clip.title || `Chapter ${index + 1}`,
      startSeconds: Math.round(offset * 100) / 100,
      endSeconds: Math.round((offset + duration) * 100) / 100,
      concepts: chapter.concepts || clip.concepts || [],
    });
    for (const cue of playbackCaptions(clip.captions)) {
      cues.push({ atSec: offset + Number(cue.atSec || 0), text: cue.text });
    }
    offset += Math.max(0, duration - (index < clips.length - 1 ? fadeSec : 0));
  });
  return {
    id: "lesson_merged",
    merged: true,
    mergeRevision: MERGE_REVISION,
    title: "Lesson video",
    durationSeconds: offset,
    fadeSeconds: fadeSec,
    captions: cues,
    chapters,
    sourceClips: clips.map((clip) => clip.url),
    url: `/generated/${packId}/video/lesson-merged.mp4`,
    posterUrl: `/generated/${packId}/video/lesson-merged-poster.jpg`,
  };
}

async function probeMediaDurationSeconds(filePath) {
  if (!ffmpegPath) return LESSON_CLIP_SECONDS;
  const stderr = await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-i", filePath], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk) => { err += chunk.toString(); });
    child.on("error", reject);
    child.on("close", () => resolve(err));
  });
  const match = stderr.match(/Duration:\\s(\\d+):(\\d+):([\\d.]+)/);
  if (!match) return LESSON_CLIP_SECONDS;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg is not available (ffmpeg-static missing)"));
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stderr)
      : reject(new Error(stderr.split("\\n").filter(Boolean).slice(-3).join(" ") || `ffmpeg exited ${code}`)));
  });
}

function normalizeVideoFilter(inputIndex, outputLabel) {
  return `[${inputIndex}:v]scale=${MERGE_WIDTH}:${MERGE_HEIGHT}:force_original_aspect_ratio=decrease,pad=${MERGE_WIDTH}:${MERGE_HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${MERGE_FPS},format=yuv420p[${outputLabel}]`;
}

/** Merge any number of short clips with sequential video crossfades and continuous audio. */
export async function mergeLessonClips(inputPaths, destPath, { fadeSec = MERGE_FADE_SECONDS } = {}) {
  if (!Array.isArray(inputPaths) || inputPaths.length < 2 || inputPaths.length > MAX_LESSON_CLIPS) {
    throw new Error(`Lesson merge expects 2–${MAX_LESSON_CLIPS} clips`);
  }
  for (const file of inputPaths) await fs.access(file);
  const durations = await Promise.all(inputPaths.map(probeMediaDurationSeconds));
  const filters = inputPaths.map((_, index) => normalizeVideoFilter(index, `v${index}`));
  let current = "v0";
  let elapsed = durations[0];
  for (let i = 1; i < inputPaths.length; i += 1) {
    const next = `vx${i}`;
    const fade = Math.max(0, Math.min(fadeSec, durations[i] - 0.05, elapsed - 0.05));
    const offset = Math.max(0, elapsed - fade);
    filters.push(`[${current}][v${i}]xfade=transition=fade:duration=${fade}:offset=${offset}[${next}]`);
    current = next;
    elapsed += durations[i] - fade;
  }
  const audioInputs = inputPaths.map((_, index) =>
    `[${index}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[a${index}]`).join(";");
  const audioLabels = inputPaths.map((_, index) => `[a${index}]`).join("");
  filters.push(audioInputs);
  filters.push(`${audioLabels}concat=n=${inputPaths.length}:v=0:a=1[a]`);

  const dir = path.dirname(destPath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = path.join(dir, `.lesson-merged.${process.pid}.${Date.now()}.tmp.mp4`);
  try {
    const args = ["-y"];
    for (const file of inputPaths) args.push("-i", file);
    args.push(
      "-filter_complex", filters.join(";"),
      "-map", `[${current}]`, "-map", "[a]",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "main",
      "-level", "4.0", "-preset", "fast", "-crf", "20",
      "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-ar", "48000",
      "-movflags", "+faststart", tmpPath,
    );
    await runFfmpeg(args);
    await fs.rename(tmpPath, destPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }
  return { durationSeconds: elapsed, fadeSeconds: fadeSec };
}

export async function writeMergedPoster(videoPath, posterPath) {
  const tmpPoster = `${posterPath}.tmp.jpg`;
  try {
    await runFfmpeg(["-y", "-ss", "0.8", "-i", videoPath, "-frames:v", "1", "-update", "1", "-q:v", "3", tmpPoster]);
    await fs.rename(tmpPoster, posterPath);
  } catch (err) {
    await fs.unlink(tmpPoster).catch(() => {});
    throw err;
  }
}

export async function ensureMergedLessonVideo(pack, { packId, generatedRoot }) {
  if (!pack?.videos || pack.videos.length < 2) return pack;
  const videoDir = `${generatedRoot}/${packId}/video`;
  const previous = pack.mergedVideo || null;
  const previousName = String(previous?.url || "").split("/").pop().split("?")[0];
  const slug = String(pack.topic || "lesson").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "lesson";
  const mergedBase = previousName.endsWith(".mp4") ? previousName.replace(/\\.mp4$/, "") : `lesson-${slug}-${Date.now()}`;
  const destPath = `${videoDir}/${mergedBase}.mp4`;
  const posterPath = `${videoDir}/${mergedBase}-poster.jpg`;
  let meta = buildMergedVideoMeta(pack.videos, packId);
  if (!meta) return pack;
  const fileExists = await fs.access(destPath).then(() => true).catch(() => false);
  const needsRemerge = !fileExists || previous?.mergeRevision !== MERGE_REVISION;
  if (fileExists && !needsRemerge) {
    try { await fs.access(posterPath); } catch { await writeMergedPoster(destPath, posterPath).catch(() => {}); }
    const stamp = Date.now();
    return { ...pack, mergedVideo: { ...previous, ...meta, url: `/generated/${packId}/video/${mergedBase}.mp4?t=${stamp}`, posterUrl: `/generated/${packId}/video/${mergedBase}-poster.jpg?t=${stamp}` }, videoDurationSec: previous?.durationSeconds || meta.durationSeconds, mergeError: undefined };
  }
  const clipPaths = pack.videos.slice(0, MAX_LESSON_CLIPS).map((clip) => `${videoDir}/${String(clip.url || "").split("/").pop().split("?")[0]}`);
  try {
    const info = await mergeLessonClips(clipPaths, destPath);
    await writeMergedPoster(destPath, posterPath).catch(() => {});
    const stamp = Date.now();
    meta = { ...meta, durationSeconds: info.durationSeconds, url: `/generated/${packId}/video/${mergedBase}.mp4?t=${stamp}`, posterUrl: `/generated/${packId}/video/${mergedBase}-poster.jpg?t=${stamp}` };
    return { ...pack, mergedVideo: meta, videoDurationSec: meta.durationSeconds, mergeError: undefined };
  } catch (err) {
    return { ...pack, mergedVideo: previous?.url ? previous : pack.mergedVideo, mergeError: err.message };
  }
}
