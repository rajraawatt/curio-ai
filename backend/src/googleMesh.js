import fs from "fs/promises";
import path from "path";
import { geminiGenerate, projectId } from "./gcp.js";
import { inferExploreKind } from "./exploreLabels.js";

export function meshProviderMode() {
  const mode = (process.env.MESH_PROVIDER || "").toLowerCase();
  if (mode === "tripo" || mode === "google" || mode === "tripo_then_google") return mode;
  return "tripo_then_google";
}

export function googleMeshAvailable() {
  return Boolean(projectId() || process.env.GEMINI_API_KEY);
}

function defaultProceduralMesh(object) {
  const base = object.mesh && typeof object.mesh === "object" ? object.mesh : {};
  return {
    type: base.type || "sphere",
    radius: Number(base.radius) || 1,
    length: Number(base.length) || 1.2,
    width: Number(base.width) || 1,
    height: Number(base.height) || 1,
    depth: Number(base.depth) || 1,
    color: object.color || "#8ab4f8",
  };
}

async function refineProceduralMeshWithGemini(object) {
  if (!googleMeshAvailable()) return defaultProceduralMesh(object);
  try {
    const prompt = `You are building a simple educational 3D preview mesh (not a full sculpt) for "${object.label}".
Subject: ${object.imagePrompt || object.reason || object.label}
Return JSON only:
{
  "type": "sphere" | "capsule" | "box" | "ellipsoid",
  "radius": number,
  "length": number,
  "width": number,
  "height": number,
  "depth": number
}
Pick proportions that roughly match the subject. sphere/ellipsoid for round objects, capsule for organelles or bodies, box for flat structures.`;
    const raw = await geminiGenerate(prompt, { json: true });
    const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim());
    const fb = defaultProceduralMesh(object);
    return {
      type: ["sphere", "capsule", "box", "ellipsoid"].includes(parsed.type) ? parsed.type : fb.type,
      radius: Number(parsed.radius) || fb.radius,
      length: Number(parsed.length) || fb.length,
      width: Number(parsed.width) || fb.width,
      height: Number(parsed.height) || fb.height,
      depth: Number(parsed.depth) || fb.depth,
      color: object.color || fb.color,
    };
  } catch {
    return defaultProceduralMesh(object);
  }
}

/**
 * Vertex / Gemini procedural mesh: textured in the viewer from the Gemini still (no Tripo credits).
 */
export async function writeGoogleMeshFromStill(assetDir, object, still) {
  await fs.mkdir(assetDir, { recursive: true });
  const procedural = await refineProceduralMeshWithGemini(object);
  const meshRecipe = {
    generator: "vertex-gemini-still+procedural",
    status: "ready",
    procedural: true,
    color: object.color,
    sourceImage: still.sourceImageName,
    pipeline: "Gemini still → interactive 3D explore model (Google Cloud)",
    exploreKind: object.mesh?.exploreKind || inferExploreKind(object),
    ...procedural,
  };
  await fs.writeFile(path.join(assetDir, "mesh.json"), JSON.stringify(meshRecipe, null, 2), "utf8");
  return {
    meshRecipe,
    glbUrl: null,
    previewName: still.sourceImageName,
  };
}

export function shouldRecoverGoogleMesh(asset) {
  if (!googleMeshAvailable()) return false;
  if (!asset?.sourceImageUrl && !asset?.previewUrl) return false;
  if (asset.glbUrl) return false;
  if (asset.mesh?.procedural && asset.mesh?.status === "ready") return false;
  return asset.mesh?.status === "error" || asset.mesh?.generator === "tripo-failed";
}

export function recoverProceduralMesh(asset) {
  if (!asset?.sourceImageUrl && !asset?.previewUrl) return null;
  const failed = asset.mesh?.status === "error" || asset.mesh?.generator === "tripo-failed";
  if (!failed && asset.glbUrl) return null;
  if (asset.mesh?.procedural && asset.mesh?.status === "ready") return asset.mesh;
  const base = asset.mesh && typeof asset.mesh === "object" ? asset.mesh : {};
  const knownTypes = new Set(["sphere", "capsule", "box", "ellipsoid"]);
  const type = knownTypes.has(base.type) ? base.type : "sphere";
  return {
    generator: "vertex-gemini-still+procedural",
    status: "ready",
    procedural: true,
    color: asset.color || base.color || "#8ab4f8",
    sourceImage: base.sourceImage || "source.png",
    pipeline: "Gemini still → interactive 3D explore model (recovered)",
    exploreKind: base.exploreKind || inferExploreKind(asset),
    type,
    radius: base.radius || 1,
    length: base.length || 1.2,
    width: base.width || 1,
    height: base.height || 1,
    depth: base.depth || 1,
  };
}
