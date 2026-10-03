import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { GENERATED_ROOT, PACK_ID } from "./prepareAssets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Local mock DB — outside frontend/public so Vite never reloads on writes. */
export const LOCAL_DB_PATH = path.join(__dirname, "../data/local-db.json");

const CLASSES = [
  { id: "6a", label: "Class 6A" },
  { id: "7b", label: "Class 7B" },
  { id: "8c", label: "Class 8C" },
];

const SUBJECTS_BY_CLASS = {
  "6a": [
    { id: "science", label: "Science" },
    { id: "math", label: "Math" },
    { id: "english", label: "English" },
  ],
  "7b": [
    { id: "science", label: "Science" },
    { id: "history", label: "History" },
  ],
  "8c": [
    { id: "science", label: "Science" },
    { id: "geography", label: "Geography" },
  ],
};

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Build Animal Cell pack from files already in the repo under public/generated. */
export async function buildSeedPackFromCodebase() {
  const packDir = path.join(GENERATED_ROOT, PACK_ID);
  const videoPath = path.join(packDir, "video/lesson-merged.mp4");
  const posterPath = path.join(packDir, "video/lesson-merged-poster.jpg");
  const nucleusGlb = path.join(packDir, "nucleus/model.glb");
  const mitoGlb = path.join(packDir, "mitochondria/model.glb");

  const hasVideo = await fileExists(videoPath);
  const hasPoster = await fileExists(posterPath);
  const hasNucleus = await fileExists(nucleusGlb);
  const hasMito = await fileExists(mitoGlb);

  if (!hasVideo && !hasNucleus && !hasMito) return null;

  const stamp = Date.now();
  return {
    id: "animal-cell",
    packId: PACK_ID,
    classId: "6a",
    subjectId: "science",
    topic: "Animal Cell",
    ageGroup: "11-14",
    language: "en",
    status: "done",
    videoDurationSec: 15.35,
    mergedVideo: hasVideo
      ? {
          id: "lesson_merged",
          merged: true,
          url: `/generated/${PACK_ID}/video/lesson-merged.mp4?t=${stamp}`,
          posterUrl: hasPoster
            ? `/generated/${PACK_ID}/video/lesson-merged-poster.jpg?t=${stamp}`
            : null,
          durationSeconds: 15.35,
        }
      : null,
    videos: [],
    assets: [
      hasNucleus && {
        id: "nucleus",
        label: "Nucleus",
        reason: "Control center of the cell; holds DNA",
        color: "#5c6bc0",
        labels: [
          { id: "nuclear_envelope", text: "Nuclear envelope" },
          { id: "nucleolus", text: "Nucleolus" },
        ],
        previewUrl: `/generated/${PACK_ID}/nucleus/source.png`,
        sourceImageUrl: `/generated/${PACK_ID}/nucleus/source.png`,
        meshUrl: `/generated/${PACK_ID}/nucleus/mesh.json`,
        glbUrl: `/generated/${PACK_ID}/nucleus/model.glb`,
        mesh: { status: "ready", glb: "model.glb" },
      },
      hasMito && {
        id: "mitochondria",
        label: "Mitochondria",
        reason: "Energy-producing organelles",
        color: "#ef6c00",
        labels: [
          { id: "outer", text: "Outer membrane" },
          { id: "cristae", text: "Cristae" },
        ],
        previewUrl: `/generated/${PACK_ID}/mitochondria/source.png`,
        sourceImageUrl: `/generated/${PACK_ID}/mitochondria/source.png`,
        meshUrl: `/generated/${PACK_ID}/mitochondria/mesh.json`,
        glbUrl: `/generated/${PACK_ID}/mitochondria/model.glb`,
        mesh: { status: "ready", glb: "model.glb" },
      },
    ].filter(Boolean),
    savedAt: new Date().toISOString(),
  };
}

export function blankLocalDb(seedPack = null) {
  return {
    version: 1,
    classes: CLASSES,
    subjectsByClass: SUBJECTS_BY_CLASS,
    packs: seedPack ? [seedPack] : [],
    sharedToLearning: {
      "6a": seedPack ? [seedPack.id] : [],
      "7b": [],
      "8c": [],
    },
    /** Last Prepare studio pack id / path pointer (media still under public/generated). */
    lastPrepare: null,
    revision: 1,
    updatedAt: new Date().toISOString(),
  };
}

export { CLASSES, SUBJECTS_BY_CLASS };
