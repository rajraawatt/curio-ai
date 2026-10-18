import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { savedRocketSession, studioMocks } from "../frontend/src/studio/studioMock.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = process.env.GOOGLE_CLOUD_PROJECT || "project-6804402b-5017-4cc9-96c";
const bucket = (process.env.GCS_BUCKET || `curio-assets-${project}`).replace(/^gs:\/\//, "").replace(/\/$/, "");
const run = (args) => execFileSync("gcloud", args, { cwd: root, stdio: "inherit" });
const catalog = { version: 1, templates: studioMocks, savedRocketSession: savedRocketSession() };
const tempDir = mkdtempSync(path.join(tmpdir(), "curio-template-upload-"));
try {
  const manifest = path.join(tempDir, "templates.json");
  writeFileSync(manifest, JSON.stringify(catalog));
  run(["storage", "cp", manifest, `gs://${bucket}/studio/templates.json`, "--content-type=application/json"]);
  const mediaDir = path.join(root, "frontend/public/generated/studio");
  if (existsSync(mediaDir)) {
    run(["storage", "cp", "--recursive", mediaDir, `gs://${bucket}/studio/`]);
    console.log("Uploaded generated template media.");
  } else {
    console.warn("No frontend/public/generated/studio directory found. Template metadata uploaded, but actual MP4/PNG/JPG assets must be present locally or already in the bucket.");
  }
  console.log(`Template catalog uploaded to gs://${bucket}/studio/templates.json`);
} finally { rmSync(tempDir, { recursive: true, force: true }); }
