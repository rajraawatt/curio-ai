function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Normalize Gemini labels into interactive diagram pins (3D + still image).
 */
export function enrichDiagramLabels(rawLabels, objectLabel = "this model") {
  const list = Array.isArray(rawLabels) ? rawLabels : [];
  const count = Math.max(list.length, 1);

  return list.slice(0, 10).map((entry, i) => {
    const text = String(entry.text || entry.name || "").slice(0, 80);
    if (!text) return null;
    const id = slug(entry.id || text) || `part_${i}`;
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const ring = 0.92 + (i % 3) * 0.06;
    const pos = entry.position && typeof entry.position === "object"
      ? {
          x: clamp(Number(entry.position.x) || 0, -1, 1),
          y: clamp(Number(entry.position.y) || 0, -1, 1),
          z: clamp(Number(entry.position.z) || 0, -1, 1),
        }
      : {
          x: Math.cos(angle) * ring,
          y: 0.28 + (i % 2) * 0.18,
          z: Math.sin(angle) * ring,
        };

    const img = entry.imagePosition && typeof entry.imagePosition === "object"
      ? {
          x: clamp(Number(entry.imagePosition.x) ?? 0.5, 0.05, 0.95),
          y: clamp(Number(entry.imagePosition.y) ?? 0.5, 0.05, 0.95),
        }
      : {
          x: clamp(0.18 + (i * 0.64) / Math.max(count - 1, 1), 0.08, 0.92),
          y: clamp(0.22 + (i % 3) * 0.24, 0.1, 0.88),
        };

    const summary = String(entry.summary || text).slice(0, 120);
    const detail = String(
      entry.detail
        || entry.description
        || `${text} is a key part of ${objectLabel}. Zoom in or tap the pin to read more.`
    ).slice(0, 420);

    return {
      id,
      text,
      summary,
      detail,
      position: pos,
      imagePosition: img,
      /** Camera distance at which detail text is shown (3D). */
      revealDistance: clamp(Number(entry.revealDistance) || 4.2 - i * 0.25, 1.2, 6),
    };
  }).filter(Boolean);
}

export function normalizePlanLabels(object) {
  const base = Array.isArray(object.labels) ? object.labels : [];
  return enrichDiagramLabels(base, object.label || "this model");
}
