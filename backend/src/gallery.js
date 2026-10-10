import fs from "fs/promises";
import path from "path";
import {
  LOCAL_DB_PATH,
  blankLocalDb,
  buildSeedPackFromCodebase,
  CLASSES,
  SUBJECTS_BY_CLASS,
} from "./localDb.js";
import { GENERATED_ROOT } from "./prepareAssets.js";

/** @type {null | (() => void)} */
let onChange = null;

export function setGalleryChangeListener(fn) {
  onChange = typeof fn === "function" ? fn : null;
}

function notify() {
  try {
    onChange?.();
  } catch {
    /* ignore */
  }
}

function slug(value) {
  return (
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "pack"
  );
}

export function sanitizeGalleryPack(pack, { classId, subjectId } = {}) {
  if (!pack || typeof pack !== "object") return null;
  const merged = pack.mergedVideo?.url
    ? {
        id: String(pack.mergedVideo.id || "merged").slice(0, 80),
        merged: Boolean(pack.mergedVideo.merged ?? true),
        url: String(pack.mergedVideo.url).slice(0, 500),
        durationSeconds: Number(pack.mergedVideo.durationSeconds) || null,
        captions: pack.mergedVideo.captions || null,
        posterUrl: pack.mergedVideo.posterUrl || null,
      }
    : null;
  const videos = Array.isArray(pack.videos)
    ? pack.videos
        .filter((v) => v?.url)
        .slice(0, 4)
        .map((v) => ({
          id: String(v.id || "clip").slice(0, 80),
          title: String(v.title || "").slice(0, 120),
          url: String(v.url).slice(0, 500),
          durationSeconds: Number(v.durationSeconds) || null,
          captions: v.captions || null,
        }))
    : [];
  const assets = Array.isArray(pack.assets)
    ? pack.assets.slice(0, 8).map((asset) => ({
        id: String(asset.id || "asset").slice(0, 80),
        label: String(asset.label || asset.id || "Asset").slice(0, 80),
        reason: String(asset.reason || "").slice(0, 200),
        color: asset.color || null,
        labels: Array.isArray(asset.labels) ? asset.labels.slice(0, 6) : [],
        previewUrl: asset.previewUrl || null,
        sourceImageUrl: asset.sourceImageUrl || asset.previewUrl || null,
        meshUrl: asset.meshUrl || null,
        glbUrl: asset.glbUrl || null,
        mesh: asset.mesh || null,
      }))
    : [];
  if (!merged && !videos.length && !assets.length) return null;

  const topic = String(pack.topic || pack.title || "Prepared lesson").slice(0, 120);
  const id = String(pack.id || pack.packId || slug(topic)).slice(0, 80);
  return {
    id,
    packId: pack.packId || id,
    classId: String(classId || pack.classId || "6a").slice(0, 20),
    subjectId: String(subjectId || pack.subjectId || "science").slice(0, 40),
    topic,
    ageGroup: String(pack.ageGroup || "11-14").slice(0, 20),
    language: ["en", "hi", "es"].includes(pack.language) ? pack.language : "en",
    status: pack.status === "done" || merged || assets.length ? "done" : pack.status || "done",
    videoDurationSec: Number(pack.videoDurationSec) || merged?.durationSeconds || null,
    mergedVideo: merged,
    videos,
    assets,
    savedAt: pack.savedAt || new Date().toISOString(),
  };
}

let library = null;
let loaded = false;

async function migrateLegacyLibrary() {
  const legacyPath = path.join(GENERATED_ROOT, "gallery/library.json");
  try {
    const text = await fs.readFile(legacyPath, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function ensureLoaded() {
  if (loaded && library) return library;

  const seed = await buildSeedPackFromCodebase();
  try {
    const text = await fs.readFile(LOCAL_DB_PATH, "utf8");
    const parsed = JSON.parse(text);
    library = {
      version: Number(parsed.version) || 1,
      classes: Array.isArray(parsed.classes) && parsed.classes.length ? parsed.classes : CLASSES,
      subjectsByClass: parsed.subjectsByClass || SUBJECTS_BY_CLASS,
      packs: Array.isArray(parsed.packs)
        ? parsed.packs.map((p) => sanitizeGalleryPack(p)).filter(Boolean)
        : [],
      sharedToLearning: parsed.sharedToLearning || { "6a": [], "7b": [], "8c": [] },
      lastPrepare: parsed.lastPrepare || null,
      revision: Number(parsed.revision) || 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    const legacy = await migrateLegacyLibrary();
    if (legacy) {
      library = {
        version: 1,
        classes: Array.isArray(legacy.classes) && legacy.classes.length ? legacy.classes : CLASSES,
        subjectsByClass: legacy.subjectsByClass || SUBJECTS_BY_CLASS,
        packs: Array.isArray(legacy.packs)
          ? legacy.packs.map((p) => sanitizeGalleryPack(p)).filter(Boolean)
          : [],
        sharedToLearning: legacy.sharedToLearning || { "6a": [], "7b": [], "8c": [] },
        lastPrepare: null,
        revision: Number(legacy.revision) || 1,
        updatedAt: new Date().toISOString(),
      };
    } else {
      library = blankLocalDb(seed ? sanitizeGalleryPack(seed) : null);
    }
  }

  if (!library.packs.length && seed) {
    const clean = sanitizeGalleryPack(seed);
    if (clean) {
      library.packs.push(clean);
    }
  }

  // Keep the Animal Cell seed in the gallery. Do not auto-share it:
  // its old video path was the shared lesson file, so students saw a new video with old stills.
  if (seed) {
    const clean = sanitizeGalleryPack(seed);
    if (clean && !library.packs.some((p) => p.id === clean.id)) {
      library.packs.unshift(clean);
    }
  }

  loaded = true;
  await persist().catch(() => {});
  return library;
}

async function persist() {
  library.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(library, null, 2), "utf8");
}

export async function getGalleryLibrary() {
  await ensureLoaded();
  return {
    classes: library.classes,
    subjectsByClass: library.subjectsByClass,
    packs: library.packs,
    sharedToLearning: library.sharedToLearning,
    revision: library.revision,
    tree: buildTree(library),
    storage: "local-db",
    path: "backend/data/local-db.json",
  };
}

function buildTree(lib) {
  return lib.classes.map((klass) => {
    const subjects = lib.subjectsByClass[klass.id] || [];
    return {
      ...klass,
      subjects: subjects.map((subject) => {
        const packs = lib.packs.filter((p) => p.classId === klass.id && p.subjectId === subject.id);
        const sharedIds = new Set(lib.sharedToLearning[klass.id] || []);
        return {
          ...subject,
          packs: packs.map((pack) => ({
            ...pack,
            shared: sharedIds.has(pack.id),
          })),
        };
      }),
    };
  });
}

export async function savePackToGallery({ classId, subjectId, pack }) {
  await ensureLoaded();
  const cid = String(classId || "6a");
  const sid = String(subjectId || "science");
  if (!library.classes.some((c) => c.id === cid)) {
    const err = new Error(`Unknown class: ${cid}`);
    err.status = 400;
    throw err;
  }
  if (!(library.subjectsByClass[cid] || []).some((s) => s.id === sid)) {
    const err = new Error(`Unknown subject: ${sid} for class ${cid}`);
    err.status = 400;
    throw err;
  }
  const next = sanitizeGalleryPack(pack, { classId: cid, subjectId: sid });
  if (!next) {
    const err = new Error("Pack needs a video or 3D assets to save.");
    err.status = 400;
    throw err;
  }
  next.savedAt = new Date().toISOString();
  const idx = library.packs.findIndex((p) => p.id === next.id && p.classId === cid && p.subjectId === sid);
  if (idx >= 0) library.packs[idx] = next;
  else library.packs.push(next);
  library.revision += 1;
  await persist();
  notify();
  return next;
}

export async function sharePackToLearning({ classId, subjectId, packId, pack }) {
  await ensureLoaded();
  const cid = String(classId || pack?.classId || "6a");
  let saved = null;
  if (pack) {
    saved = await savePackToGallery({ classId: cid, subjectId: subjectId || pack.subjectId, pack });
  } else {
    saved =
      library.packs.find((p) => p.id === packId && p.classId === cid) ||
      library.packs.find((p) => p.id === packId);
    if (!saved) {
      const err = new Error("Pack not found in Gallery.");
      err.status = 404;
      throw err;
    }
  }
  if (!library.sharedToLearning[cid]) library.sharedToLearning[cid] = [];
  if (!library.sharedToLearning[cid].includes(saved.id)) {
    library.sharedToLearning[cid].push(saved.id);
  }
  library.revision += 1;
  await persist();
  notify();
  return { pack: saved, classId: cid, learning: await getLearningForClass(cid) };
}

export async function getLearningForClass(classId) {
  await ensureLoaded();
  const cid = String(classId || "6a");
  const sharedIds = new Set(library.sharedToLearning[cid] || []);
  const packs = library.packs.filter((p) => p.classId === cid && sharedIds.has(p.id));
  const subjects = (library.subjectsByClass[cid] || []).map((subject) => ({
    ...subject,
    packs: packs.filter((p) => p.subjectId === subject.id),
  }));
  const klass = library.classes.find((c) => c.id === cid) || { id: cid, label: cid };
  return {
    classId: cid,
    classLabel: klass.label,
    subjects,
    packs,
    revision: library.revision,
  };
}

/** Snapshot merged into classroom SSE for live Learning updates. */
export function getLearningPublicState() {
  if (!loaded || !library) return { learningByClass: {}, galleryRevision: 0 };
  const learningByClass = {};
  for (const klass of library.classes) {
    const sharedIds = new Set(library.sharedToLearning[klass.id] || []);
    learningByClass[klass.id] = library.packs.filter((p) => p.classId === klass.id && sharedIds.has(p.id));
  }
  return {
    learningByClass,
    galleryRevision: library.revision,
  };
}

export async function rememberLastPrepare(pack) {
  await ensureLoaded();
  library.lastPrepare = pack
    ? {
        packId: pack.packId || pack.id || null,
        topic: pack.topic || null,
        status: pack.status || "done",
        classId: pack.classId || null,
        subjectId: pack.subjectId || null,
        updatedAt: new Date().toISOString(),
      }
    : null;
  library.revision += 1;
  await persist();
}

export async function initGallery() {
  await ensureLoaded();
  return library;
}
