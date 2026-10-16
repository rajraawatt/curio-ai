import * as THREE from "three";

const SURFACE_PAD = 1.12;

/** Approximate bounding radius for Vertex procedural meshes (world units, pre-Center). */
export function proceduralMeshRadius(mesh) {
  if (!mesh || typeof mesh !== "object") return 1;
  const type = mesh.type || "sphere";
  if (type === "capsule") {
    const r = Number(mesh.radius) || 0.45;
    const l = Number(mesh.length) || 1.2;
    return Math.max(r, l * 0.5 + r);
  }
  if (type === "box") {
    const w = Number(mesh.width) || 1;
    const h = Number(mesh.height) || 1;
    const d = Number(mesh.depth) || 1;
    return Math.sqrt(w * w + h * h + d * d) * 0.5;
  }
  if (type === "ellipsoid") {
    const r = Number(mesh.radius) || 1;
    const sx = (Number(mesh.width) || 1.1) * r;
    const sy = (Number(mesh.height) || 1.25) * r;
    const sz = (Number(mesh.depth) || 0.95) * r;
    return Math.max(sx, sy, sz);
  }
  return Number(mesh.radius) || 1;
}

export function measureObjectRadius(object) {
  if (!object) return 1;
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return 1;
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  return Math.max(sphere.radius, 0.05);
}

/** Pin positions on a still plane (matches video / 2D diagram). */
export function scaleLabelsToStillPlane(labels, planeWidth, planeHeight) {
  const w = Math.max(Number(planeWidth) || 2, 0.1);
  const h = Math.max(Number(planeHeight) || 2, 0.1);
  return labels.map((label) => {
    const img = label.imagePosition || { x: 0.5, y: 0.5 };
    const x = (Number(img.x) - 0.5) * w;
    const y = (0.5 - Number(img.y)) * h;
    return {
      ...label,
      position: { x, y, z: 0.04 },
      revealDistance: Math.max(w, h) * 1.8,
    };
  });
}

export function stillPlaneSize(aspect, heightUnits = 2) {
  const a = Math.max(Number(aspect) || 1, 0.2);
  const height = heightUnits;
  const width = height * a;
  return { width, height, radius: Math.hypot(width, height) * 0.5 };
}

/** Map label positions (roughly unit-scale) onto the model surface. */
export function scaleLabelPositions(labels, modelRadius) {
  const r = Math.max(Number(modelRadius) || 1, 0.05);
  const surface = r * SURFACE_PAD;
  return labels.map((label) => {
    const p = label.position || { x: 0, y: 0, z: surface };
    const vx = Number(p.x) || 0;
    const vy = Number(p.y) || 0;
    const vz = Number(p.z) || 0;
    const len = Math.hypot(vx, vy, vz);
    if (len < 1e-4) {
      return {
        ...label,
        position: { x: 0, y: r * 0.35, z: surface },
        revealDistance: r * 3.2,
      };
    }
    const norm = surface / len;
    const revealBase = Number(label.revealDistance);
    const reveal = Number.isFinite(revealBase) ? revealBase * r : r * 3.2;
    return {
      ...label,
      position: { x: vx * norm, y: vy * norm, z: vz * norm },
      revealDistance: Math.max(r * 1.05, Math.min(reveal, r * 6)),
    };
  });
}

/** Camera / orbit defaults from mesh radius (world units). */
export function diagramPinScale(modelRadius) {
  const r = Math.max(Number(modelRadius) || 1, 0.05);
  return {
    modelRadius: r,
    pinScale: Math.min(1, Math.max(0.42, 0.55 + r * 0.22)),
    cameraZ: r * 3.6,
    cameraY: r * 0.32,
    minDistance: r * 0.85,
    maxDistance: r * 10,
  };
}

const MODEL_CENTER = new THREE.Vector3(0, 0, 0);

/** Apparent model diameter on screen in CSS pixels (perspective camera). */
export function modelDiameterOnScreenPx(camera, viewportSize, modelRadius, center = MODEL_CENTER) {
  const r = Math.max(Number(modelRadius) || 1, 0.05);
  const dist = camera.position.distanceTo(center);
  const vFov = (camera.fov * Math.PI) / 180;
  const worldHeight = 2 * Math.tan(vFov / 2) * Math.max(dist, 0.001);
  const pxPerUnit = viewportSize.height / worldHeight;
  return r * 2 * pxPerUnit;
}

/**
 * Label scale (0–1) tied to how large the model looks on screen — not raw zoom.
 * Capped so zooming in close does not blow up HTML pins.
 */
export function labelScaleForModelScreen(modelDiameterPx, baseLabelPx = 128) {
  const ratio = 0.26;
  const raw = (modelDiameterPx * ratio) / baseLabelPx;
  return Math.min(0.88, Math.max(0.34, raw));
}
