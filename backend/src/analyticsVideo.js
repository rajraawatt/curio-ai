/** Canonical id for the full merged lesson file in analytics + BigQuery. */
export const MERGED_VIDEO_ID = "lesson-merged";

export function isMergedLessonEvent(event) {
  if (!event) return false;
  const id = String(event.item_id || "").toLowerCase();
  if (id === MERGED_VIDEO_ID || id === "lesson_merged") return true;
  const concept = String(event.concept || "").toLowerCase();
  if (concept.includes("lesson-merged")) return true;
  const label = String(event.item_label || "").toLowerCase();
  if (label.includes("full merged lesson")) return true;
  return false;
}

export function mergedVideoEventTypes() {
  return new Set(["video_play", "rewind", "content_click", "item_click", "time_spent"]);
}

export function isMergedLessonMetricEvent(event) {
  if (!mergedVideoEventTypes().has(event.event_type)) return false;
  if (event.event_type === "time_spent") {
    return !event.item_id || isMergedLessonEvent(event);
  }
  return isMergedLessonEvent(event);
}
