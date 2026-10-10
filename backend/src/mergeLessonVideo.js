import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import ffmpegPath from "ffmpeg-static";

export const LESSON_CLIP_SECONDS = 8;
export const MAX_LESSON_CLIPS = 2;
export const MERGE_FADE_SECONDS = 0.65;
/** Bump when encode flags change so stale/corrupt merges are rebuilt. */
export const MERGE_REVISION = 5;

const MERGE_WIDTH = 1280;
const MERGE_HEIGHT = 720;
const MERGE_FPS = 24;

function playbackCaptions(captions) {
  const raw = Array.isArray(captions) ? captions : [];
  if (raw.length >= 3) {
    return [
      { ...raw[0], atSec: 0 },
      { ...raw[raw.length - 1], atSec: 4.2 },
    ];
  }
  return raw;
}

export function mergedDurationSeconds(clipCount, clipSec = LESSON_CLIP_SECONDS, fadeSec = MERGE_FADE_SECONDS) {
  if (clipCount <= 0) return 0;
  if (clipCount === 1) return clipSec;
  return clipCount * clipSec - fadeSec * (clipCount - 1);
}

export function buildMergedVideoMeta(videos, packId, fadeSec = MERGE_FADE_SECONDS) {
  const clips = (videos || []).slice(0, MAX_LESSON_CLIPS);
  if (clips.length < 2) return null;

  const cues = [];
  let offset = 0;
  for (let i = 0; i < clips.length; i++) {
    for (const cue of playbackCaptions(clips[i].captions)) {
      cues.push({
        atSec: offset + Number(cue.atSec || 0),
        text: cue.text,
      });
    }
    if (i < clips.length - 1) offset += LESSON_CLIP_SECONDS - fadeSec;
  }

  return {
    id: "lesson_merged",
    merged: true,
    mergeRevision: MERGE_REVISION,
    title: "Lesson video",
    durationSeconds: mergedDurationSeconds(clips.length, LESSON_CLIP_SECONDS, fadeSec),
    fadeSeconds: fadeSec,
    captions: cues,
    sourceClips: clips.map((c) => c.url),
    url: `/generated/${packId}/video/lesson-merged.mp4`,
    posterUrl: `/generated/${packId}/video/lesson-merged-poster.jpg`,
  };
}

async function probeMediaDurationSeconds(filePath) {
  if (!ffmpegPath) return LESSON_CLIP_SECONDS;
  const stderr = await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-i", filePath], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", () => resolve(err));
  });
  const match = stderr.match(/Duration:\s(\d+):(\d+):([\d.]+)/);
  if (!match) return LESSON_CLIP_SECONDS;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("ffmpeg is not available (ffmpeg-static missing)"));
      return;
    }
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(stderr.split("\n").filter(Boolean).slice(-3).join(" ") || `ffmpeg exited ${code}`));
    });
  });
}

function normalizeVideoFilter(labelIn, labelOut) {
  return (
    `[${labelIn}:v]scale=${MERGE_WIDTH}:${MERGE_HEIGHT}:force_original_aspect_ratio=decrease,` +
    `pad=${MERGE_WIDTH}:${MERGE_HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${MERGE_FPS},format=yuv420p[${labelOut}]`
  );
}

/**
 * Crossfade two ~8s clips into one browser-safe MP4.
 * Writes to a temp file then renames so browsers never see a half-written/corrupt file.
 */
export async function mergeLessonClips(inputPaths, destPath, { fadeSec = MERGE_FADE_SECONDS } = {}) {
  if (inputPaths.length !== 2) {
    throw new Error("Lesson merge expects exactly 2 clips (~16s total)");
  }
  for (const file of inputPaths) {
    await fs.access(file);
  }
  const dur0 = await probeMediaDurationSeconds(inputPaths[0]);
  const dur1 = await probeMediaDurationSeconds(inputPaths[1]);
  const offset = Math.max(0, Math.min(dur0 - 0.05, dur0 - fadeSec));
  const durationSeconds = dur0 + dur1 - fadeSec;
  const filter = [
    normalizeVideoFilter(0, "v0"),
    normalizeVideoFilter(1, "v1"),
    `[v0][v1]xfade=transition=fade:duration=${fadeSec}:offset=${offset}[v]`,
    `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=0:${offset},asetpts=PTS-STARTPTS[a0]`,
    `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=0:${dur1},asetpts=PTS-STARTPTS[a1]`,
    `[a0][a1]concat=n=2:v=0:a=1[a]`,
  ].join(";");

  const dir = path.dirname(destPath);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = path.join(dir, `.lesson-merged.${process.pid}.${Date.now()}.tmp.mp4`);

  try {
    await runFfmpeg([
      "-y",
      "-i",
      inputPaths[0],
      "-i",
      inputPaths[1],
      "-filter_complex",
      filter,
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
      "-level",
      "4.0",
      "-preset",
      "fast",
      "-crf",
      "20",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ac",
      "2",
      "-ar",
      "48000",
      "-movflags",
      "+faststart",
      tmpPath,
    ]);
    await fs.rename(tmpPath, destPath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }

  return {
    durationSeconds,
    fadeSeconds: fadeSec,
    crossfadeOffsetSec: offset,
  };
}

export async function writeMergedPoster(videoPath, posterPath) {
  const tmpPoster = `${posterPath}.tmp.jpg`;
  try {
    await runFfmpeg([
      "-y",
      "-ss",
      "0.8",
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-update",
      "1",
      "-q:v",
      "3",
      tmpPoster,
    ]);
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
  const slug = String(pack.topic || "lesson")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "lesson";
  const mergedBase = previousName.endsWith(".mp4")
    ? previousName.replace(/\.mp4$/, "")
    : `lesson-${slug}-${Date.now()}`;
  const destPath = `${videoDir}/${mergedBase}.mp4`;
  const posterPath = `${videoDir}/${mergedBase}-poster.jpg`;
  let meta = buildMergedVideoMeta(pack.videos, packId);
  if (!meta) return pack;

  const fileExists = await fs.access(destPath).then(() => true).catch(() => false);
  const needsRemerge =
    !fileExists ||
    previous?.mergeRevision !== MERGE_REVISION ||
    previous?.mergeRevision == null;

  // Fast path: good file already on disk — never remux on ordinary page loads.
  if (fileExists && !needsRemerge) {
    try {
      await fs.access(posterPath);
    } catch {
      await writeMergedPoster(destPath, posterPath).catch(() => {});
    }
    const stamp = Date.now();
    return {
      ...pack,
      mergedVideo: {
        ...previous,
        ...meta,
        url: `/generated/${packId}/video/${mergedBase}.mp4?t=${stamp}`,
        posterUrl: `/generated/${packId}/video/${mergedBase}-poster.jpg?t=${stamp}`,
      },
      videoDurationSec: previous?.durationSeconds || meta.durationSeconds,
      mergeError: undefined,
    };
  }

  const clipPaths = pack.videos.slice(0, MAX_LESSON_CLIPS).map((clip) => {
    const name = String(clip.url || "").split("/").pop().split("?")[0];
    return `${videoDir}/${name}`;
  });

  try {
    const info = await mergeLessonClips(clipPaths, destPath);
    await writeMergedPoster(destPath, posterPath).catch(() => {});
    const stamp = Date.now();
    meta = {
      ...meta,
      durationSeconds: info.durationSeconds,
      url: `/generated/${packId}/video/${mergedBase}.mp4?t=${stamp}`,
      posterUrl: `/generated/${packId}/video/${mergedBase}-poster.jpg?t=${stamp}`,
    };
    return { ...pack, mergedVideo: meta, videoDurationSec: meta.durationSeconds, mergeError: undefined };
  } catch (err) {
    // Never wipe a previously good mergedVideo — page refresh must keep content.
    return {
      ...pack,
      mergedVideo: previous?.url ? previous : pack.mergedVideo,
      mergeError: err.message,
    };
  }
}
