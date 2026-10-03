import { isMergedLessonEvent, isMergedLessonMetricEvent, MERGED_VIDEO_ID } from "./analyticsVideo.js";

const LIVE_WINDOW_MS = 15 * 60 * 1000;
const TIMELINE_BUCKETS = 24;
const LANG_CODES = ["en", "hi", "es"];

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function bucketTimeline(events, now = Date.now()) {
  const start = now - TIMELINE_BUCKETS * 5 * 60 * 1000;
  const buckets = Array.from({ length: TIMELINE_BUCKETS }, (_, i) => ({
    t: start + i * 5 * 60 * 1000,
    count: 0,
  }));
  for (const event of events) {
    const ts = new Date(event.event_time).getTime();
    if (ts < start) continue;
    const index = Math.min(TIMELINE_BUCKETS - 1, Math.floor((ts - start) / (5 * 60 * 1000)));
    buckets[index].count += 1;
  }
  return buckets;
}

export function buildAnalyticsDigest({ events, rosterSize, activeStudentNames }) {
  const now = Date.now();
  const liveEvents = events.filter((e) => (e.mode || "live") === "live" || !e.mode);
  const selfEvents = events.filter((e) => e.mode === "self_paced");
  const mergedEvents = events.filter((e) => isMergedLessonMetricEvent(e) || isMergedLessonEvent(e));

  const conceptCounts = {};
  const questionsByStudent = {};
  const exploredConcepts = new Set();
  let questionTotal = 0;
  let exploredTotal = 0;
  let handsUp = 0;

  for (const event of events) {
    if (event.concept && !String(event.concept).includes(".mp4")) {
      conceptCounts[event.concept] = (conceptCounts[event.concept] || 0) + 1;
    }
    if (event.event_type === "question" || event.event_type === "question_repeat") {
      questionTotal += 1;
      const name = event.student_name || "Unknown";
      questionsByStudent[name] = (questionsByStudent[name] || 0) + 1;
    }
    if (event.event_type === "explore") exploredTotal += 1;
    if (event.event_type === "explore" && event.concept) exploredConcepts.add(event.concept);
    if (event.event_type === "raise_hand") handsUp += 1;
  }

  const responseTimes = liveEvents
    .filter((e) => e.event_type === "teacher_response" && Number.isFinite(e.value_num))
    .map((e) => e.value_num);

  const itemClicks = {};
  for (const event of selfEvents) {
    if (event.event_type !== "content_click" && event.event_type !== "item_click") continue;
    if (!isMergedLessonEvent(event)) continue;
    const key = event.item_label || MERGED_VIDEO_ID;
    itemClicks[key] = (itemClicks[key] || 0) + (event.value_num || 1);
  }

  const timeByStudent = {};
  for (const event of selfEvents) {
    if (event.event_type !== "time_spent" || !event.student_name) continue;
    if (event.item_id && !isMergedLessonEvent(event)) continue;
    timeByStudent[event.student_name] = (timeByStudent[event.student_name] || 0) + (event.value_num || 0);
  }

  const rewindsByStudent = {};
  let rewindTotal = 0;
  for (const event of selfEvents) {
    if (event.event_type !== "rewind") continue;
    if (!isMergedLessonEvent(event)) continue;
    rewindTotal += 1;
    const name = event.student_name || "Unknown";
    rewindsByStudent[name] = (rewindsByStudent[name] || 0) + 1;
  }

  const activeRecent = events.filter((e) => {
    const ts = new Date(e.event_time).getTime();
    return now - ts <= LIVE_WINDOW_MS && e.student_name;
  });
  const activeFromEvents = new Set(activeRecent.map((e) => e.student_name));
  for (const name of activeStudentNames || []) activeFromEvents.add(name);

  const roster = Math.max(1, rosterSize || 24);
  const activeCount = activeFromEvents.size;
  const activeRatio = Math.min(1, activeCount / roster);

  const topItems = Object.entries(itemClicks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  const studentTime = Object.entries(timeByStudent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, seconds]) => ({ name, seconds }));

  const studentQuestions = Object.entries(questionsByStudent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  let lessonLabel = "Merged lesson video";
  let fileHint = "lesson-merged.mp4";
  let packId = "cell-mvp";
  const langTotals = { en: 0, hi: 0, es: 0 };
  let playTotal = 0;

  for (const event of mergedEvents) {
    if (event.pack_id) packId = event.pack_id;
    if (event.event_type !== "video_play" || !isMergedLessonEvent(event)) continue;
    const label = (event.item_label || "").trim();
    if (label.length > lessonLabel.length) lessonLabel = label;
    if (event.concept && String(event.concept).includes(".")) fileHint = event.concept;
    const lang = LANG_CODES.includes(event.language) ? event.language : "en";
    const weight = event.value_num || 1;
    langTotals[lang] = (langTotals[lang] || 0) + weight;
    playTotal += weight;
  }

  const lessonVideo = {
    id: MERGED_VIDEO_ID,
    label: lessonLabel,
    fileHint,
    packId,
    total: playTotal,
    byLang: langTotals,
    rewindsTotal: rewindTotal,
    opensTotal: topItems.reduce((s, i) => s + i.count, 0),
    bigQueryFilter: `event_type IN ('video_play','rewind','time_spent','content_click') AND item_id = '${MERGED_VIDEO_ID}'`,
  };

  const videoLanguages = playTotal > 0 ? [{ ...lessonVideo }] : [];

  return {
    overview: {
      questionTotal,
      exploredTotal,
      conceptsExplored: exploredConcepts.size,
      handsUp,
      eventTotal: events.length,
      mergedEventTotal: mergedEvents.length,
    },
    lessonVideo,
    live: {
      rosterSize: roster,
      activeCount,
      activeRatio,
      activeStudents: [...activeFromEvents].sort(),
      avgResponseSec: responseTimes.length
        ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
        : null,
      medianResponseSec: median(responseTimes) != null ? Math.round(median(responseTimes) * 10) / 10 : null,
      responseSamples: responseTimes.length,
      responseTimes: responseTimes.slice(-12),
      questionsByStudent: studentQuestions,
      maxQuestions: Math.max(1, ...studentQuestions.map((s) => s.count)),
    },
    selfPaced: {
      topItems,
      maxItemClicks: Math.max(1, ...topItems.map((i) => i.count)),
      studentTime,
      maxTimeSec: Math.max(1, ...studentTime.map((s) => s.seconds)),
      rewindsByStudent: Object.entries(rewindsByStudent)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      rewindTotal,
    },
    curiosity: {
      concepts: Object.entries(conceptCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([concept, count]) => ({ concept, count })),
      maxConcept: Math.max(1, ...Object.values(conceptCounts)),
    },
    timeline: bucketTimeline(events, now),
    timelineMax: Math.max(1, ...bucketTimeline(events, now).map((b) => b.count)),
    videoLanguages,
    langTotals,
  };
}
