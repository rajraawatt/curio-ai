import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { savedRocketSession, studioMocks } from "../frontend/src/studio/studioMock.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = process.env.GOOGLE_CLOUD_PROJECT || "project-6804402b-5017-4cc9-96c";
const bucket = (process.env.GCS_BUCKET || `curio-assets-${project}`).replace(/^gs:\/\//, "").replace(/\/$/, "");
const mediaDir = path.join(root, "frontend/public/generated/studio");
const run = (args) => execFileSync("gcloud", args, { cwd: root, stdio: "inherit" });

const TOPIC_TERMS = {
  nerve: ["nerve", "neuron", "neurons", "synapse", "action potential", "nerve cell"],
  rocket: ["rocket", "launch", "thrust", "liftoff", "propellant", "combustion chamber"],
  heart: ["heart", "blood", "cardiac", "circulation", "heartbeat", "pump blood"],
  plant: ["plant", "chlorophyll", "photosynthesis", "leaf", "leaves", "chloroplast"],
};

function cleanUrl(url) {
  return String(url || "").split("?")[0];
}

function localPathForUrl(url) {
  const clean = cleanUrl(url);
  const marker = "/generated/studio/";
  const index = clean.indexOf(marker);
  if (index < 0) return null;
  return path.join(mediaDir, clean.slice(index + marker.length));
}

function existsUrl(url) {
  const file = localPathForUrl(url);
  return Boolean(file && existsSync(file));
}

function publicUrl(id, relativePath) {
  return `/generated/studio/${id}/${relativePath.split(path.sep).join("/")}`;
}

function listFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute, relative) : [relative];
  });
}

function readGeneratedSessions() {
  if (!existsSync(mediaDir)) {
    throw new Error(`Generated media directory not found: ${mediaDir}`);
  }

  return readdirSync(mediaDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => {
      const id = entry.name;
      const directory = path.join(mediaDir, id);
      const files = listFiles(directory);
      let snapshot = null;
      const sessionFile = path.join(directory, "session.json");
      if (existsSync(sessionFile)) {
        try {
          const parsed = JSON.parse(readFileSync(sessionFile, "utf8"));
          snapshot = parsed.session || parsed;
        } catch (error) {
          console.warn(`Skipping invalid session metadata in ${id}: ${error.message}`);
        }
      }

      const lesson = files.find((file) => /^video\/lesson-[^/]+\.mp4$/i.test(file));
      const narratedClip = files.find((file) => /^video\/chapter-1-shot-1-narrated\.mp4$/i.test(file));
      const veoClip = files.find((file) => /^video\/(?:chapter-1-shot-1-veo|moment-1-veo)\.mp4$/i.test(file));
      const videoFile = lesson || narratedClip || veoClip;
      const posterFile = files.find((file) => /^video\/lesson-[^/]+-poster\.jpg$/i.test(file));
      const imageFile = files.find((file) => /^moment-1-image-(?:wide|detail|frame-1)\.(?:png|jpe?g)$/i.test(file)) || files.find((file) => /^moment-1-image-[^/]+\.(?:png|jpe?g)$/i.test(file));
      const topicText = [
        snapshot?.topic,
        snapshot?.prompt,
        snapshot?.subject,
        ...(snapshot?.moments || []).flatMap((moment) => [
          moment.title,
          moment.caption,
          ...(moment.labels || []).map((label) => label.text || label.name),
        ]),
      ].filter(Boolean).join(" ").toLowerCase();

      return {
        id,
        directory,
        files,
        snapshot,
        topicText,
        videoUrl: videoFile ? publicUrl(id, videoFile) : null,
        posterUrl: posterFile ? publicUrl(id, posterFile) : null,
        imageUrl: imageFile ? publicUrl(id, imageFile) : null,
        durationSeconds: Number(snapshot?.video?.durationSeconds) || (lesson ? 0 : videoFile ? 8 : 0),
      };
    });
}

function scoreCandidate(template, candidate) {
  const terms = TOPIC_TERMS[template.id] || [];
  if (!candidate.topicText || !terms.length) return 0;
  return terms.reduce((score, term) => score + (candidate.topicText.includes(term) ? (term.includes(" ") ? 2 : 1) : 0), 0);
}

function chooseCandidate(template, candidates) {
  const ranked = candidates
    .filter((candidate) => candidate.videoUrl || candidate.imageUrl)
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(template, candidate),
      completeness: (candidate.videoUrl?.includes("/lesson-") ? 4 : candidate.videoUrl ? 2 : 0) + (candidate.posterUrl ? 1 : 0) + (candidate.imageUrl ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.completeness - a.completeness || b.candidate.id.localeCompare(a.candidate.id));
  if (!ranked.length) return null;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score && ranked[0].completeness === ranked[1].completeness) {
    console.warn(`Ambiguous media match for "${template.id}"; leaving its original media rather than assigning an unrelated lesson.`);
    return null;
  }
  return ranked[0].candidate;
}

function patchSessionMedia(session, candidate) {
  const patched = structuredClone(session);
  const sourceMoments = candidate.snapshot?.moments || [];
  patched.moments = (patched.moments || []).map((moment, index) => {
    const source = sourceMoments[index];
    const sourceImages = (source?.images || [])
      .map((image) => image.url)
      .filter((url) => url && existsUrl(url));
    const fallbackImages = candidate.files
      .filter((file) => new RegExp(`^moment-${index + 1}-image-(?:wide|detail)\\.(?:png|jpe?g)$`, "i").test(file))
      .map((file) => publicUrl(candidate.id, file));
    const urls = sourceImages.length ? sourceImages : fallbackImages;
    if (!urls.length) return { ...moment, images: (moment.images || []).filter((image) => existsUrl(image.url)) };
    const existing = moment.images?.length ? moment.images : urls.map((url, imageIndex) => ({ id: `generated-${imageIndex + 1}`, kind: "wide" }));
    return {
      ...moment,
      images: existing.map((image, imageIndex) => ({ ...image, url: urls[imageIndex % urls.length], error: null })),
      exploded: moment.exploded && existsUrl(moment.exploded.url) ? moment.exploded : null,
      inside: moment.inside && existsUrl(moment.inside.url) ? moment.inside : null,
    };
  });

  if (candidate.videoUrl) {
    patched.video = {
      ...(patched.video || {}),
      id: patched.video?.id || `generated-${candidate.id}`,
      merged: candidate.videoUrl.includes("/lesson-"),
      title: patched.topic || patched.prompt || "Generated lesson",
      url: candidate.videoUrl,
      posterUrl: candidate.posterUrl || candidate.imageUrl || null,
      durationSeconds: candidate.durationSeconds || patched.video?.durationSeconds || 8,
      captions: patched.video?.captions || [],
    };
  } else if (!existsUrl(patched.video?.url)) {
    patched.video = null;
  }
  return patched;
}

function patchTemplate(template, candidates) {
  const candidate = chooseCandidate(template, candidates);
  const patched = structuredClone(template);
  if (candidate) {
    patched.image = candidate.imageUrl || candidate.posterUrl || "/curio-logo.png";
    if (patched.session) patched.session = patchSessionMedia(patched.session, candidate);
    console.log(`Mapped mock "${template.id}" to generated media ${candidate.id}${candidate.videoUrl ? ` (${candidate.videoUrl})` : " (image only)"}`);
  } else {
    if (!existsUrl(patched.image)) patched.image = "/curio-logo.png";
    if (patched.session) {
      patched.session.moments = (patched.session.moments || []).map((moment) => ({
        ...moment,
        images: (moment.images || []).filter((image) => existsUrl(image.url)),
        exploded: moment.exploded && existsUrl(moment.exploded.url) ? moment.exploded : null,
        inside: moment.inside && existsUrl(moment.inside.url) ? moment.inside : null,
      }));
      if (!existsUrl(patched.session.video?.url)) patched.session.video = null;
    }
    console.warn(`No topic-matched generated media found for "${template.id}". Broken local URLs were removed; add a generated session with matching topic metadata to attach its video.`);
  }
  return patched;
}

const generated = readGeneratedSessions();
const templates = studioMocks.map((template) => patchTemplate(template, generated));
const rocketCandidate = chooseCandidate({ id: "rocket" }, generated);
let saved = savedRocketSession();
if (rocketCandidate) saved = patchSessionMedia(saved, rocketCandidate);
else if (!existsUrl(saved.video?.url)) saved.video = null;

const catalog = { version: 2, templates, savedRocketSession: saved };
const tempDir = mkdtempSync(path.join(tmpdir(), "curio-template-upload-"));
try {
  // Upload media first so the catalog never points to files that have not arrived yet.
  run(["storage", "rsync", "--recursive", mediaDir, `gs://${bucket}/studio/`]);
  const manifest = path.join(tempDir, "templates.json");
  writeFileSync(manifest, JSON.stringify(catalog));
  run(["storage", "cp", manifest, `gs://${bucket}/studio/templates.json`, "--content-type=application/json"]);
  console.log(`Template catalog uploaded to gs://${bucket}/studio/templates.json`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
