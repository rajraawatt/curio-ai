import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.env");

try {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
} catch {
  // No local .env. Cloud Run uses the service environment.
}

function gcloudValue(args) {
  try {
    const out = execFileSync("gcloud", args, {
      encoding: "utf8",
      timeout: 20000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out || out === "(unset)") return "";
    return out;
  } catch {
    return "";
  }
}

if (!process.env.GOOGLE_CLOUD_PROJECT) {
  const project = gcloudValue(["config", "get-value", "project"]);
  if (project) {
    process.env.GOOGLE_CLOUD_PROJECT = project;
    console.log(`Using gcloud project ${project}`);
  }
}
