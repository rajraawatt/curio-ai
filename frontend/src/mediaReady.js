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

/** Cache-bust a media URL so the browser does not reuse a failed HTML/404 response. */
export function freshMediaUrl(url, token = Date.now()) {
  if (!url) return "";
  const base = String(url).split("?")[0];
  return `${base}?v=${token}`;
}
