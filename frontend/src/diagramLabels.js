/** Client-side fallback when manifest labels are minimal (matches backend enrich). */
export function normalizeDiagramLabels(raw, objectLabel = "this model") {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((entry, i) => {
    const text = entry.text || entry.name || "Part";
    const count = raw.length;
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const ring = 0.92 + (i % 3) * 0.06;
    return {
      id: entry.id || `part_${i}`,
      text,
      summary: entry.summary || text,
      detail:
        entry.detail
        || `${text} is an important part of ${objectLabel}. Zoom in or tap the pin to explore.`,
      position: entry.position || {
        x: Math.cos(angle) * ring,
        y: 0.28 + (i % 2) * 0.18,
        z: Math.sin(angle) * ring,
      },
      imagePosition: entry.imagePosition || {
        x: 0.18 + (i * 0.64) / Math.max(count - 1, 1),
        y: 0.22 + (i % 3) * 0.24,
      },
      revealDistance: entry.revealDistance ?? 3.4 - i * 0.2,
    };
  });
}
