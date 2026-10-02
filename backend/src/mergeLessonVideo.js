import { spawn } from "child_process";
import fs from "fs/promises";
import ffmpegPath from "ffmpeg-static";

export const LESSON_CLIP_SECONDS = 8;
export const MAX_LESSON_CLIPS = 2;
export const MERGE_FADE_SECONDS = 0.65;
export const MERGE_REVISION = 2;

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
    if (i < clips.length - 1) offset += LESSON_CLIP_SECONDS;
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

/** Crossfade two 8s clips into one ~15.4s MP4 (video + embedded Veo audio). */
export async function mergeLessonClips(inputPaths, destPath, { fadeSec = MERGE_FADE_SECONDS } = {}) {
  if (inputPaths.length !== 2) {
    throw new Error("Lesson merge expects exactly 2 clips (~16s total)");
  }
  for (const file of inputPaths) {
    await fs.access(file);
  }
  const dur0 = await probeMediaDurationSeconds(inputPaths[0]);
  const dur1 = await probeMediaDurationSeconds(inputPaths[1]);
  const offset = Math.max(0, dur0 - fadeSec);
  const delayMs = Math.round(offset * 1000);
  const durationSeconds = dur0 + dur1 - fadeSec;
  const filter = [
    `[0:v][1:v]xfade=transition=fade:duration=${fadeSec}:offset=${offset}[v]`,
    `[0:a]afade=t=out:st=${offset}:d=${fadeSec}[a0]`,
    `[1:a]afade=t=in:st=0:d=${fadeSec},adelay=${delayMs}|${delayMs}[a1]`,
    `[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0[a]`,
  ].join(";");
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
    "-preset",
    "fast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    destPath,
  ]);
  return {
    durationSeconds,
    fadeSeconds: fadeSec,
    crossfadeOffsetSec: offset,
  };
}

export async function ensureMergedLessonVideo(pack, { packId, generatedRoot }) {
  if (!pack?.videos || pack.videos.length < 2) return pack;

  const videoDir = `${generatedRoot}/${packId}/video`;
  const destPath = `${videoDir}/lesson-merged.mp4`;
  let meta = buildMergedVideoMeta(pack.videos, packId);
  if (!meta) return pack;

  const needsRemerge =
    pack.mergedVideo?.mergeRevision !== MERGE_REVISION || pack.mergedVideo?.mergeRevision == null;
  if (!needsRemerge) {
    try {
      await fs.access(destPath);
      meta.url = `/generated/${packId}/video/lesson-merged.mp4?t=${Date.now()}`;
      return { ...pack, mergedVideo: meta, videoDurationSec: meta.durationSeconds };
    } catch {
      /* build below */
    }
  }

  const clipPaths = pack.videos.slice(0, MAX_LESSON_CLIPS).map((clip) => {
    const name = clip.url.split("/").pop().split("?")[0];
    return `${videoDir}/${name}`;
  });

  try {
    const info = await mergeLessonClips(clipPaths, destPath);
    meta = {
      ...meta,
      durationSeconds: info.durationSeconds,
      url: `/generated/${packId}/video/lesson-merged.mp4?t=${Date.now()}`,
    };
    return { ...pack, mergedVideo: meta, videoDurationSec: meta.durationSeconds };
  } catch (err) {
    return { ...pack, mergedVideo: null, mergeError: err.message };
  }
}
