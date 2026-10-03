const KEY = "curio-gallery-cache";

let memory = null;
let inflight = null;

export function readGalleryCache() {
  if (memory?.tree) return memory;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.tree && !data?.classes) return null;
    memory = data;
    return data;
  } catch {
    return null;
  }
}

export function writeGalleryCache(data) {
  if (!data?.tree && !data?.classes) return;
  memory = data;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota
  }
}

/** Warm the gallery so the tab can paint from cache. */
export function prefetchGallery() {
  if (inflight) return inflight;
  inflight = fetch("/api/gallery")
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load Gallery.");
      writeGalleryCache(data);
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
