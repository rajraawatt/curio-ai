import { BigQuery } from "@google-cloud/bigquery";

const projectId = () => process.env.GOOGLE_CLOUD_PROJECT || "";
const datasetId = () => process.env.BIGQUERY_DATASET || "curio_analytics";
const tableId = () => process.env.BIGQUERY_EVENTS_TABLE || "product_events";
const location = () => process.env.BIGQUERY_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "US";
const allowedEvents = new Set([
  "page_view", "lesson_started", "lesson_completed", "moment_selected",
  "question_asked", "answer_generated", "answer_feedback_submitted",
]);

let client;
function bigQuery() {
  if (!projectId()) throw new Error("Set GOOGLE_CLOUD_PROJECT to enable BigQuery analytics.");
  if (!client) client = new BigQuery({ projectId: projectId() });
  return client;
}
function tableName() {
  return `${projectId()}.${datasetId()}.${tableId()}`;
}
function safeNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function clean(value, max = 160) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export function analyticsConfig() {
  return {
    enabled: Boolean(projectId()),
    projectId: projectId() || null,
    dataset: datasetId(),
    table: tableId(),
    location: location(),
  };
}

/** Accept only structured, low-sensitivity product events. Never store raw questions or chat text. */
export async function recordAnalyticsEvents(input) {
  const config = analyticsConfig();
  if (!config.enabled) return { accepted: 0, skipped: true, reason: "BigQuery is not configured" };
  const events = (Array.isArray(input) ? input : [input]).slice(0, 50);
  const rows = events.filter((event) => event && allowedEvents.has(event.eventType)).map((event) => {
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
    const validTimestamp = Number.isNaN(timestamp.getTime()) ? new Date() : timestamp;
    return {
      insertId: clean(event.eventId, 128) || undefined,
      json: {
        event_timestamp: validTimestamp.toISOString(),
        event_date: validTimestamp.toISOString().slice(0, 10),
        session_id: clean(event.sessionId, 96) || "anonymous-session",
        lesson_id: clean(event.lessonId, 120) || "unknown",
        lesson_title: clean(event.lessonTitle, 200) || "Untitled lesson",
        chapter_id: clean(event.chapterId, 120) || null,
        chapter_title: clean(event.chapterTitle, 200) || null,
        video_timestamp_sec: safeNumber(event.videoTimestampSec),
        event_type: event.eventType,
        question_category: clean(event.questionCategory, 80) || null,
        answer_status: clean(event.answerStatus, 40) || null,
        ai_model: clean(event.aiModel, 80) || null,
        estimated_ai_cost_usd: safeNumber(event.estimatedAiCostUsd),
        duration_sec: safeNumber(event.durationSec),
        metadata_json: event.metadata && typeof event.metadata === "object"
          ? JSON.stringify(event.metadata).slice(0, 2000) : null,
      },
    };
  });
  if (!rows.length) return { accepted: 0 };
  const table = bigQuery().dataset(datasetId()).table(tableId());
  const [exists] = await table.exists();
  if (!exists) {
    const error = new Error(`BigQuery table ${tableName()} does not exist. Run sql/bigquery_setup.sql first.`);
    error.status = 503;
    throw error;
  }
  await table.insert(rows, { skipInvalidRows: true, ignoreUnknownValues: false });
  return { accepted: rows.length };
}

const queryOptions = { location: location(), maximumBytesBilled: "1000000000" };
async function runQuery(query, params = {}) {
  const [rows] = await bigQuery().query({
    query,
    params,
    ...queryOptions,
  });
  return rows.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = typeof value === "bigint" ? Number(value) : value;
    }
    return out;
  });
}

export async function getAnalyticsDashboard({ days = 14 } = {}) {
  const config = analyticsConfig();
  if (!config.enabled) {
    const error = new Error("BigQuery is not configured. Set GOOGLE_CLOUD_PROJECT and create the analytics dataset/table.");
    error.status = 503;
    throw error;
  }
  const range = Math.max(1, Math.min(90, Math.floor(Number(days) || 14)));
  const table = `\`${tableName()}\``;
  const [kpis, trend, eventBreakdown, topLessons, topChapters] = await Promise.all([
    runQuery(`SELECT
      COUNTIF(event_type = 'lesson_started') AS lessons_started,
      COUNTIF(event_type = 'lesson_completed') AS lessons_completed,
      COUNTIF(event_type = 'question_asked') AS questions_asked,
      COUNTIF(event_type = 'moment_selected') AS moments_explored,
      COUNT(DISTINCT session_id) AS active_sessions,
      SAFE_DIVIDE(COUNTIF(event_type = 'lesson_completed'), COUNTIF(event_type = 'lesson_started')) AS completion_rate,
      SUM(COALESCE(estimated_ai_cost_usd, 0)) AS estimated_ai_cost_usd
      FROM ${table}
      WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)`, { days: range }),
    runQuery(`SELECT CAST(event_date AS STRING) AS date,
      COUNTIF(event_type = 'lesson_started') AS lessons_started,
      COUNTIF(event_type = 'question_asked') AS questions_asked,
      COUNTIF(event_type = 'moment_selected') AS moments_explored
      FROM ${table}
      WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      GROUP BY event_date ORDER BY event_date`, { days: range }),
    runQuery(`SELECT event_type, COUNT(*) AS total FROM ${table}
      WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      GROUP BY event_type ORDER BY total DESC`, { days: range }),
    runQuery(`SELECT lesson_id, ANY_VALUE(lesson_title) AS lesson_title,
      COUNTIF(event_type = 'lesson_started') AS starts,
      COUNTIF(event_type = 'lesson_completed') AS completions,
      COUNTIF(event_type = 'question_asked') AS questions,
      COUNTIF(event_type = 'moment_selected') AS moments_explored
      FROM ${table}
      WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      GROUP BY lesson_id ORDER BY starts DESC LIMIT 8`, { days: range }),
    runQuery(`SELECT chapter_id, ANY_VALUE(chapter_title) AS chapter_title,
      ANY_VALUE(lesson_title) AS lesson_title,
      COUNTIF(event_type = 'moment_selected') AS selections,
      COUNTIF(event_type = 'question_asked') AS questions
      FROM ${table}
      WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        AND chapter_id IS NOT NULL
      GROUP BY chapter_id ORDER BY questions DESC, selections DESC LIMIT 8`, { days: range }),
  ]);
  return {
    config,
    rangeDays: range,
    kpis: kpis[0] || {},
    trend,
    eventBreakdown,
    topLessons,
    topChapters,
    generatedAt: new Date().toISOString(),
  };
}
