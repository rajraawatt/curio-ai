import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { bucketName, readObject, uploadObject } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.join(__dirname, "../../frontend/public/generated/studio");

const TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".json": "application/json",
};

export function studioDir(id) {
  return path.join(STUDIO_ROOT, id);
}

function contentType(file) {
  return TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
}

async function filesIn(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

export async function readStudioRecord(id) {
  try {
    const raw = await fs.readFile(path.join(studioDir(id), "session.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    // The lesson may already live in Cloud Storage.
  }
  if (!bucketName()) return null;
  try {
    const asset = await readObject(`studio/${id}/session.json`);
    return JSON.parse(asset.body.toString("utf8"));
  } catch {
    return null;
  }
}

export async function publishStudioSession(id) {
  const dir = studioDir(id);
  let files = [];
  try {
    files = await filesIn(dir);
  } catch {
    files = [];
  }
  if (!files.length) {
    const existing = await readStudioRecord(id);
    if (!existing) {
      const err = new Error("This lesson is not ready to share");
      err.status = 404;
      throw err;
    }
    return { uploaded: false, stored: Boolean(bucketName()) };
  }
  if (!bucketName()) return { uploaded: false, stored: true };
  for (const file of files) {
    const rel = path.relative(dir, file).split(path.sep).join("/");
    const body = await fs.readFile(file);
    await uploadObject(`studio/${id}/${rel}`, body, contentType(file));
  }
  return { uploaded: true, stored: true, count: files.length };
}
