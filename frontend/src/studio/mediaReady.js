/** Poll until newly written /generated media responds OK (first-time generate race). */
export async function ensureMediaReachable(pack, { tries = 10, delayMs = 350 } = {}) {
  if (!pack) return false;
  const urls = [
    pack.mergedVideo?.url,
    ...(Array.isArray(pack.videos) ? pack.videos.map((v) => v?.url) : []),
    ...(Array.isArray(pack.assets)
      ? pack.assets.flatMap((a) => [a?.sourceImageUrl, a?.previewUrl])
      : []),
  ]
    .filter(Boolean)
    .map((url) => String(url).split("?")[0]);

  const unique = [...new Set(urls)];
  if (!unique.length) return false;

  for (let i = 0; i < tries; i += 1) {
    const results = await Promise.all(
      unique.map(async (url) => {
        try {
          const res = await fetch(url, { method: "HEAD", cache: "no-store" });
          if (res.ok) return true;
          // Some static servers dislike HEAD — try a tiny ranged GET.
          const get = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: { Range: "bytes=0-0" },
          });
          return get.ok || get.status === 206;
        } catch {
          return false;
        }
      }),
    );
    if (results.every(Boolean)) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

/** Keep the pack's own ?t= stamp and add a retry token. Dropping the stamp made every lesson share lesson-merged.mp4?v=0, so the browser replayed the previous video. */
export function freshMediaUrl(url, token) {
  if (!url) return "";
  const [base, query] = String(url).split("?");
  const params = new URLSearchParams(query || "");
  if (token !== undefined && token !== null && String(token) !== "") {
    params.set("v", String(token));
  }
  const next = params.toString();
  return next ? `${base}?${next}` : base;
}
