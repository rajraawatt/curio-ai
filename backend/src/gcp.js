import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";
import { GoogleAuth } from "google-auth-library";

const execFileAsync = promisify(execFile);
let auth;
let cachedCliToken = "";
let cachedCliTokenAt = 0;
const CLI_TOKEN_TTL_MS = 45 * 60 * 1000;

function adcFile() {
  return process.env.GOOGLE_APPLICATION_CREDENTIALS
    || path.join(homedir(), ".config/gcloud/application_default_credentials.json");
}

export function authSource() {
  if (process.env.K_SERVICE) return "cloud-run";
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || existsSync(adcFile())) return "adc";
  return "gcloud-user";
}

export function projectId() {
  return process.env.GOOGLE_CLOUD_PROJECT || "";
}

export function location() {
  return process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

export function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

export function engineMode() {
  if (projectId()) return "vertex";
  if (apiKey()) return "gemini-api-key";
  return "lesson-scripts";
}

async function gcloudAccessToken() {
  if (cachedCliToken && Date.now() - cachedCliTokenAt < CLI_TOKEN_TTL_MS) return cachedCliToken;
  let stdout = "";
  try {
    const result = await execFileAsync("gcloud", ["auth", "print-access-token"], {
      timeout: 20000,
      encoding: "utf8",
    });
    stdout = result.stdout || "";
  } catch (err) {
    throw new Error(`gcloud auth login is not usable (${err.message}). Run: gcloud auth login`);
  }
  const token = stdout.trim();
  if (!token) throw new Error("gcloud auth print-access-token returned nothing. Run: gcloud auth login");
  cachedCliToken = token;
  cachedCliTokenAt = Date.now();
  return token;
}

async function accessToken() {
  if (authSource() !== "gcloud-user") {
    if (!auth) {
      auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        projectId: projectId() || undefined,
      });
    }
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token?.token) throw new Error("No Google Cloud access token from the runtime service account");
    return token.token;
  }
  return gcloudAccessToken();
}

export async function probeGoogleAuth() {
  const token = await accessToken();
  return { ok: Boolean(token), project: projectId() || null, auth: authSource() };
}

function textFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

async function postGemini(body) {
  const model = geminiModel();
  let res;
  if (projectId()) {
    const url = `https://${location()}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${location()}/publishers/google/models/${model}:generateContent`;
    const token = await accessToken();
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } else if (apiKey()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey()}`;
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } else {
    throw new Error("Gemini is not configured");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || JSON.stringify(data).slice(0, 400);
    throw new Error(message || `Gemini request failed (${res.status})`);
  }
  const text = textFromGemini(data);
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason || data?.candidates?.[0]?.finish_reason || "";
    throw new Error(reason ? `Gemini returned an empty response (${reason})` : "Gemini returned an empty response");
  }
  return text;
}

export async function geminiGenerate(
  prompt,
  { json = false, maxOutputTokens = 4096, temperature = 0.6 } = {},
) {
  return postGemini({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  });
}

export async function geminiGenerateFromImage(
  prompt,
  { base64, mimeType = "image/png", json = false, maxOutputTokens = 1024, temperature = 0.2 } = {},
) {
  if (!base64) throw new Error("Image is required");
  return postGemini({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  });
}

function imageModel() {
  const configured = String(process.env.IMAGEN_MODEL || "").trim();
  if (!configured || configured.startsWith("imagen-") || configured === "gemini-2.5-flash") {
    return "gemini-2.5-flash-image";
  }
  return configured;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function busyWaitMs(attempt) {
  const base = Math.min(60000, 1000 * 2 ** attempt);
  return Math.min(60000, base + Math.floor(Math.random() * 1000));
}

function inlineImage(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      return { mime: inline.mimeType || inline.mime_type || "image/png", data: inline.data };
    }
  }
  return null;
}

export async function generateDiagram(prompt, { instruction, aspectRatio, onStatus } = {}) {
  if (!projectId()) {
    throw new Error("Image generation needs GOOGLE_CLOUD_PROJECT and Application Default Credentials");
  }
  const model = imageModel();
  const lead =
    instruction ||
    "Generate one classroom still. A student should be able to name the single subject. Plain light background, centered, uncluttered, no text, no watermark, no labels.";
  const text = `${lead} ${prompt}`.slice(0, 2000);
  const url = `https://aiplatform.googleapis.com/v1/projects/${projectId()}/locations/global/publishers/google/models/${model}:generateContent`;
  let lastError = "The image model returned no image";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const passes = aspectRatio ? [true, false] : [false];
    for (const useAspect of passes) {
      const generationConfig = {
        responseModalities: ["TEXT", "IMAGE"],
        candidateCount: 1,
      };
      if (useAspect && aspectRatio) generationConfig.imageConfig = { aspectRatio };
      const token = await accessToken();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastError = data?.error?.message || `Image generation failed (${res.status})`;
        const busy = res.status === 429 || /exhausted|quota|resource/i.test(lastError);
        if (busy) {
          onStatus?.({ attempt: attempt + 1, status: res.status, message: lastError });
          if (attempt < 4) await sleep(busyWaitMs(attempt));
          break;
        }
        if (useAspect && /aspect|imageConfig|unknown name/i.test(lastError)) continue;
        throw new Error(lastError);
      }
      const image = inlineImage(data);
      if (image) {
        onStatus?.({ attempt: attempt + 1, status: 200, message: "image" });
        return `data:${image.mime};base64,${image.data}`;
      }
      const finish = data?.candidates?.[0]?.finishReason || data?.candidates?.[0]?.finish_reason;
      const block = data?.promptFeedback?.blockReason || data?.promptFeedback?.block_reason;
      throw new Error(`The image model returned no image${finish ? ` (finish=${finish})` : ""}${block ? ` (blocked=${block})` : ""}`);
    }
  }
  throw new Error(lastError);
}

const LECTURE_VOICE = {
  "8-10": { persona: "Leda", speakingRate: 0.96 },
  "11-14": { persona: "Sulafat", speakingRate: 1 },
  "15-18": { persona: "Callirrhoe", speakingRate: 1 },
};

function lectureVoice(lang = "en", ageGroup = "11-14") {
  const languageCode = lang === "hi" ? "hi-IN" : lang === "es" ? "es-ES" : "en-US";
  const lecture = LECTURE_VOICE[ageGroup] || LECTURE_VOICE["11-14"];
  const fallback = `${languageCode}-Chirp3-HD-${lecture.persona}`;
  const name = lang === "en" && process.env.TTS_VOICE ? process.env.TTS_VOICE : fallback;
  return { languageCode, name, speakingRate: lecture.speakingRate };
}

export async function synthesizeSpeech(text, lang = "en", ageGroup = "11-14", speakingRate) {
  if (!projectId()) return null;
  const token = await accessToken();
  const voice = lectureVoice(lang, ageGroup);
  const rate =
    Number(speakingRate) > 0
      ? Math.min(1.2, Math.max(0.85, Number(speakingRate)))
      : voice.speakingRate;
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(projectId() ? { "x-goog-user-project": projectId() } : {}),
    },
    body: JSON.stringify({
      input: { text: text.slice(0, 1200) },
      voice: { languageCode: voice.languageCode, name: voice.name, ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3", speakingRate: rate },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.audioContent) {
    throw new Error(data?.error?.message || "Text-to-Speech failed");
  }
  return Buffer.from(data.audioContent, "base64");
}

/**
 * Start Veo text or image→video. Returns operation name string.
 * Image: { imageBase64, mimeType } — uses the still as first frame.
 */
export async function startVeoGeneration({
  prompt,
  imageBase64 = null,
  mimeType = "image/png",
  lastImageBase64 = null,
  lastMimeType = "image/png",
  durationSeconds = 8,
  aspectRatio = "16:9",
  resolution = null,
  storageUri = null,
  generateAudio = true,
} = {}) {
  if (!projectId()) throw new Error("Veo needs GOOGLE_CLOUD_PROJECT and Application Default Credentials");
  const model = process.env.VEO_MODEL || "veo-3.1-fast-generate-001";
  const url = `https://${location()}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${location()}/publishers/google/models/${model}:predictLongRunning`;

  const instance = { prompt: String(prompt || "").slice(0, 2000) };
  if (imageBase64) {
    instance.image = {
      bytesBase64Encoded: imageBase64,
      mimeType: mimeType || "image/png",
    };
  }
  if (lastImageBase64) {
    instance.lastFrame = {
      bytesBase64Encoded: lastImageBase64,
      mimeType: lastMimeType || mimeType || "image/png",
    };
  }

  const parameters = {
    aspectRatio,
    durationSeconds: Number(durationSeconds) || 8,
    sampleCount: 1,
    generateAudio: Boolean(generateAudio),
  };
  if (resolution) parameters.resolution = resolution;
  const bucket = storageUri || (process.env.GCS_BUCKET ? `gs://${process.env.GCS_BUCKET.replace(/^gs:\/\//, "")}/curio-veo/` : null);
  if (bucket) parameters.storageUri = bucket.endsWith("/") ? bucket : `${bucket}/`;

  const token = await accessToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ instances: [instance], parameters }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Veo request failed (${res.status})`);
  const name = data.name;
  if (!name) throw new Error("Veo did not return an operation name");
  return name;
}

export async function fetchVeoOperation(operationName) {
  if (!projectId()) throw new Error("Veo needs GOOGLE_CLOUD_PROJECT");
  const model = process.env.VEO_MODEL || "veo-3.1-fast-generate-001";
  const url = `https://${location()}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${location()}/publishers/google/models/${model}:fetchPredictOperation`;
  let lastError = "Veo poll failed";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = await accessToken();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operationName }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    lastError = data?.error?.message || `Veo poll failed (${res.status})`;
    const busy = res.status === 429 || /exhausted|quota|resource/i.test(lastError);
    if (!busy || attempt >= 4) throw new Error(lastError);
    await sleep(busyWaitMs(attempt));
  }
  throw new Error(lastError);
}

async function downloadGcsObject(gsUri, destPath) {
  const m = String(gsUri).match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) throw new Error(`Invalid GCS URI: ${gsUri}`);
  const token = await accessToken();
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(m[1])}/o/${encodeURIComponent(m[2])}?alt=media`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GCS download failed (${res.status}) for ${gsUri}`);
  const fs = await import("fs/promises");
  await fs.writeFile(destPath, Buffer.from(await res.arrayBuffer()));
  return destPath;
}

function extractVeoVideos(operation) {
  const response = operation?.response || {};
  const out = [];

  const pushVideo = (v) => {
    if (!v || typeof v !== "object") return;
    if (v.bytesBase64Encoded || v.bytes_base64_encoded) {
      out.push({
        base64: v.bytesBase64Encoded || v.bytes_base64_encoded,
        mime: v.mimeType || v.mime_type || "video/mp4",
      });
    }
    if (v.gcsUri || v.gcs_uri || v.uri) {
      out.push({ gcsUri: v.gcsUri || v.gcs_uri || v.uri });
    }
  };

  const walk = (node, depth = 0) => {
    if (!node || depth > 6) return;
    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, depth + 1));
      return;
    }
    if (typeof node !== "object") return;
    // Direct video payload shapes from Veo
    if (node.bytesBase64Encoded || node.bytes_base64_encoded || node.gcsUri || node.gcs_uri) {
      pushVideo(node);
    }
    if (node.video) pushVideo(node.video);
    if (node.videos) walk(node.videos, depth + 1);
    if (node.generatedSamples) walk(node.generatedSamples, depth + 1);
    if (node.generatedVideos) walk(node.generatedVideos, depth + 1);
    if (node.predictions) walk(node.predictions, depth + 1);
    if (node.generateVideoResponse) walk(node.generateVideoResponse, depth + 1);
  };

  walk(response);

  // Prefer entries that look like full videos (gcs first, then largest base64)
  out.sort((a, b) => {
    if (a.gcsUri && !b.gcsUri) return -1;
    if (!a.gcsUri && b.gcsUri) return 1;
    return (b.base64?.length || 0) - (a.base64?.length || 0);
  });

  // Dedupe by gcsUri / base64 prefix
  const seen = new Set();
  return out.filter((v) => {
    const key = v.gcsUri || v.base64?.slice(0, 64);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Poll Veo until done, then write the first MP4 to destPath.
 */
export async function waitForVeoAndSave(operationName, destPath, { intervalMs = 8000, timeoutMs = 10 * 60 * 1000 } = {}) {
  const started = Date.now();
  let operation;
  while (Date.now() - started < timeoutMs) {
    operation = await fetchVeoOperation(operationName);
    if (operation.done) break;
    if (operation.error) throw new Error(operation.error.message || JSON.stringify(operation.error));
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  if (!operation?.done) throw new Error(`Veo timed out after ${timeoutMs}ms`);
  if (operation.error) throw new Error(operation.error.message || JSON.stringify(operation.error));

  const videos = extractVeoVideos(operation);
  if (!videos.length) {
    const fs = await import("fs/promises");
    const path = await import("path");
    try {
      await fs.writeFile(
        path.join(path.dirname(destPath), "veo-debug.json"),
        JSON.stringify(
          {
            keys: Object.keys(operation.response || {}),
            responsePreview: JSON.stringify(operation.response || {}).slice(0, 4000),
          },
          null,
          2
        )
      );
    } catch {
      // ignore debug write failures
    }
    throw new Error(
      `Veo finished but no video payload found. Set GCS_BUCKET in .env if inline bytes are empty. Raw keys: ${Object.keys(operation.response || {}).join(",")}`
    );
  }

  const fs = await import("fs/promises");
  const path = await import("path");
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  // Prefer GCS URI when present (more reliable than inline bytes).
  const first = videos.find((v) => v.gcsUri) || videos[0];
  if (first.gcsUri) {
    await downloadGcsObject(first.gcsUri, destPath);
  } else if (first.base64) {
    await fs.writeFile(destPath, Buffer.from(first.base64, "base64"));
  } else {
    throw new Error("Veo video entry had neither base64 nor gcsUri");
  }

  return { destPath, operationName, gcsUri: first.gcsUri || null };
}

/**
 * Image→video convenience: still bytes + prompt → local mp4.
 */
export async function generateVeoClipFromImage({
  prompt,
  imageBase64,
  mimeType = "image/png",
  lastImageBase64 = null,
  lastMimeType = "image/png",
  destPath,
  durationSeconds = 8,
  generateAudio = true,
  aspectRatio = "16:9",
  resolution = null,
}) {
  let lastError = "Veo clip failed";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const operationName = await startVeoGeneration({
        prompt,
        imageBase64,
        mimeType,
        lastImageBase64,
        lastMimeType,
        durationSeconds,
        generateAudio,
        aspectRatio,
        resolution,
      });
      return await waitForVeoAndSave(operationName, destPath);
    } catch (err) {
      lastError = err?.message || String(err);
      const busy = /exhausted|quota|resource/i.test(lastError);
      if (!busy || attempt >= 4) throw err;
      await sleep(busyWaitMs(attempt));
    }
  }
  throw new Error(lastError);
}

export function healthInfo(extra = {}) {
  return {
    ok: true,
    engine: engineMode(),
    project: projectId() || null,
    auth: authSource(),
    location: location(),
    model: geminiModel(),
    imagen: imageModel(),
    veo: process.env.VEO_MODEL || "veo-3.1-fast-generate-001",
    tts: Boolean(projectId()),
    bucket: process.env.GCS_BUCKET || null,
    ...extra,
  };
}
