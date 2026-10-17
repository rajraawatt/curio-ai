import { spawn } from "child_process";
import fs from "fs/promises";
import ffmpegPath from "ffmpeg-static";

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
