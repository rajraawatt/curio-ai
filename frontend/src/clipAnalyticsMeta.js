/** Human-readable labels for analytics — one row per distinct video file / clip. */
export function clipAnalyticsMeta(clip, pack) {
  const topic = pack?.topic?.trim() || "Prepared lesson";
  const fromUrl = clip?.url?.split("?")[0]?.split("/").filter(Boolean);
  const fileHint = fromUrl?.[fromUrl.length - 1]?.replace(/\.mp4$/i, "") || clip?.id || "lesson-video";

  if (clip?.merged) {
    return {
      ...clip,
      analyticsId: "lesson-merged",
      packId: pack?.packId || "cell-mvp",
      displayLabel: `${topic} — full merged lesson (~${Math.round(clip.durationSeconds || 16)}s)`,
      fileHint: "lesson-merged.mp4",
    };
  }

  const scene = clip?.title && clip.title !== "Lesson video" ? clip.title : fileHint.replace(/-/g, " ");
  return {
    ...clip,
    analyticsId: clip?.id || fileHint,
    displayLabel: `${topic} — ${scene}`,
    fileHint: `${fileHint}.mp4`,
  };
}
