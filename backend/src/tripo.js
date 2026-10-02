import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";

const execFileAsync = promisify(execFile);
const TRIPO_BASE = "https://openapi.tripo3d.ai/v3";

export function tripoApiKey() {
  return process.env.TRIPO_API_KEY || "";
}

export function tripoEnabled() {
  return Boolean(tripoApiKey()) && process.env.TRIPO_ENABLED !== "false";
}

function authHeaders(json = true) {
  const key = tripoApiKey();
  if (!key) throw new Error("TRIPO_API_KEY is missing in .env");
  const headers = { Authorization: `Bearer ${key}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function networkError(prefix, err) {
  const cause = err?.cause;
  const detail = cause?.code || cause?.message || err?.message || String(err);
  return new Error(`${prefix}: ${detail}`);
}

async function fetchWithRetry(url, options, { retries = 3, label = "Tripo request" } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw networkError(`${label} failed after ${retries} tries`, lastErr);
}

async function tripoFetch(pathname, { method = "GET", body } = {}) {
  const res = await fetchWithRetry(
    `${TRIPO_BASE}${pathname}`,
    {
      method,
      headers: authHeaders(true),
      body: body ? JSON.stringify(body) : undefined,
    },
    { label: `Tripo ${pathname}` }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code !== 0) {
    const msg = data.message || data.msg || JSON.stringify(data) || res.statusText;
    throw new Error(`Tripo ${pathname} failed: ${msg}`);
  }
  return data.data;
}

/**
 * Tripo official image limits (developers.tripo3d.ai):
 * - Formats: JPEG, PNG, WebP
 * - Max file size: 20 MB
 * - Recommended resolution: at least 256×256 (no max resolution documented)
 *
 * We only re-encode when over a soft network threshold — not because Tripo requires 1024px.
 * Gemini stills (~1MB / 1024²) are already within documented limits.
 */
async function prepareUploadImage(filePath) {
  const stat = await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
        ? "image/webp"
        : "image/png";

  if (stat.size > 20 * 1024 * 1024) {
    throw new Error(`Tripo image max is 20 MB; file is ${(stat.size / (1024 * 1024)).toFixed(1)} MB`);
  }

  // Soft cap only to avoid Node TLS resets on some large multipart uploads.
  // Not an API requirement — docs allow up to 20 MB.
  const SOFT_UPLOAD_BYTES = 2 * 1024 * 1024;
  if (stat.size <= SOFT_UPLOAD_BYTES) {
    return { filePath, mime, cleanup: null };
  }

  try {
    const outPath = path.join(os.tmpdir(), `tripo-upload-${Date.now()}.jpg`);
    // Keep quality; only shrink longest edge if the file is heavy.
    await execFileAsync("sips", ["-Z", "2048", "-s", "format", "jpeg", filePath, "--out", outPath]);
    return { filePath: outPath, mime: "image/jpeg", cleanup: outPath };
  } catch {
    return { filePath, mime, cleanup: null };
  }
}

export async function createTextToModel({
  prompt,
  textureQuality = "detailed",
  negativePrompt = "text, labels, watermark, logo, blurry, low quality, multiple objects",
} = {}) {
  return tripoFetch("/generation/text-to-model", {
    method: "POST",
    body: {
      prompt: String(prompt).slice(0, 1024),
      model: process.env.TRIPO_MODEL || "v3.1-20260211",
      texture: true,
      pbr: true,
      texture_quality: textureQuality,
      negative_prompt: String(negativePrompt).slice(0, 255),
    },
  });
}

export async function createTextToImage({
  prompt,
  model = process.env.TRIPO_IMAGE_MODEL || "seedream_v5",
  size = "2K",
} = {}) {
  return tripoFetch("/generation/text-to-image", {
    method: "POST",
    body: {
      prompt: String(prompt).slice(0, 2000),
      model,
      size,
      output_format: "png",
      watermark: false,
    },
  });
}

export async function createImageToModel({ input, textureQuality = "detailed" } = {}) {
  if (!input) throw new Error("image-to-model needs input (file_token, url, or image task_id)");
  return tripoFetch("/generation/image-to-model", {
    method: "POST",
    body: {
      input,
      model: process.env.TRIPO_MODEL || "v3.1-20260211",
      texture: true,
      pbr: true,
      texture_quality: textureQuality,
      enable_image_autofix: true,
    },
  });
}

/** Upload a local image; returns file_token. */
export async function uploadFile(filePath) {
  const prepared = await prepareUploadImage(filePath);
  try {
    const buf = await fs.readFile(prepared.filePath);
    const form = new FormData();
    const name = path.basename(prepared.filePath);
    // Blob + Uint8Array is reliable in Node; File() often ECONNRESET to Tripo.
    form.append("file", new Blob([new Uint8Array(buf)], { type: prepared.mime }), name);

    const res = await fetchWithRetry(
      `${TRIPO_BASE}/files`,
      {
        method: "POST",
        headers: authHeaders(false),
        body: form,
      },
      { label: "Tripo upload", retries: 4 }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.code !== 0) {
      const msg = data.message || data.msg || JSON.stringify(data) || res.statusText;
      throw new Error(`Tripo upload failed: ${msg}`);
    }
    const token = data.data?.file_token;
    if (!token) throw new Error("Tripo upload returned no file_token");
    return token;
  } finally {
    if (prepared.cleanup) {
      await fs.unlink(prepared.cleanup).catch(() => {});
    }
  }
}

export async function getTask(taskId) {
  return tripoFetch(`/tasks/${taskId}`);
}

export async function waitForTask(taskId, { intervalMs = 2500, timeoutMs = 5 * 60 * 1000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const task = await getTask(taskId);
    const status = task.status;
    if (status === "success") return task;
    if (["failed", "cancelled", "banned"].includes(status)) {
      throw new Error(`Tripo task ${taskId} ${status}: ${task.error_msg || task.message || ""}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Tripo task ${taskId} timed out after ${timeoutMs}ms`);
}

export async function downloadUrl(url, destPath) {
  const res = await fetchWithRetry(url, {}, { label: "Tripo download", retries: 3 });
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return destPath;
}

async function saveGlbFromTask(task, destDir, basename) {
  const modelUrl = task.output?.model_url;
  const previewUrl = task.output?.rendered_image_url;
  if (!modelUrl) throw new Error(`Tripo task ${task.task_id} has no model_url`);

  await fs.mkdir(destDir, { recursive: true });
  const glbName = `${basename}.glb`;
  await downloadUrl(modelUrl, path.join(destDir, glbName));

  let previewName = null;
  if (previewUrl) {
    previewName = `${basename}-preview.png`;
    try {
      await downloadUrl(previewUrl, path.join(destDir, previewName));
    } catch {
      previewName = null;
    }
  }

  return {
    taskId: task.task_id,
    credits: task.credits_consumed,
    glbName,
    previewName,
    status: task.status,
  };
}

/** Text → detailed textured GLB. */
export async function generateTexturedGlb({ prompt, destDir, basename = "model" }) {
  const created = await createTextToModel({ prompt, textureQuality: "detailed" });
  const taskId = created.task_id;
  if (!taskId) throw new Error("Tripo did not return task_id");
  const task = await waitForTask(taskId);
  return saveGlbFromTask(task, destDir, basename);
}

/** Local image file → upload → image-to-model (detailed). */
export async function generateGlbFromLocalImage({ filePath, destDir, basename = "model" }) {
  await fs.mkdir(destDir, { recursive: true });
  const token = await uploadFile(filePath);
  const created = await createImageToModel({ input: token, textureQuality: "detailed" });
  const taskId = created.task_id;
  if (!taskId) throw new Error("Tripo image-to-model returned no task_id");
  const task = await waitForTask(taskId);
  const saved = await saveGlbFromTask(task, destDir, basename);
  return { ...saved, fileToken: token, pipeline: "upload → image-to-model" };
}

/**
 * Save a data:image/...;base64,... URL then run image→3D.
 */
export async function generateGlbFromDataUrl({ dataUrl, destDir, basename = "model" }) {
  await fs.mkdir(destDir, { recursive: true });
  const match = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Expected a data:image/...;base64 image from Gemini");
  const mime = match[1];
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
  const sourceImageName = `${basename}-source.${ext}`;
  const outPath = path.join(destDir, sourceImageName);
  await fs.writeFile(outPath, Buffer.from(match[2], "base64"));

  const saved = await generateGlbFromLocalImage({ filePath: outPath, destDir, basename });
  return {
    ...saved,
    sourceImageName,
    pipeline: "gemini-image → upload → image-to-model",
  };
}
