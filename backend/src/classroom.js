import { buildAnalyticsDigest } from "./analyticsDigest.js";
import { LESSON, matchPlan, fallbackPlan, planningHold, normalizePlan, textOf } from "./lesson.js";
import { engineMode, geminiGenerate, insertAnalytics } from "./gcp.js";

const listeners = new Set();
let seq = 10;
const returnTimers = new Set();
const studentPresence = new Map();
const ROSTER_SIZE = Number(process.env.CLASS_ROSTER_SIZE) || 24;
const DEFAULT_PACK_ID = process.env.PREPARE_PACK_ID || "cell-mvp";

function touchStudent(name) {
  const student = String(name || "").trim();
  if (!student) return;
  studentPresence.set(student, Date.now());
}

function activeStudentNames() {
  const cutoff = Date.now() - 15 * 60 * 1000;
  const names = [];
  for (const [name, ts] of studentPresence) {
    if (ts >= cutoff) names.push(name);
  }
  return names;
}

function seedSelfPacedEvents(baseTime) {
  const topic = "extinction of dinosour";
  const merged = {
    id: "lesson-merged",
    label: `${topic} — full merged lesson (~16s)`,
    fileHint: "lesson-merged.mp4",
  };
  const students = ["Aarav", "Anaya", "Rohan", "Priya", "Dev", "Maya"];
  const rows = [];
  let n = 0;
  for (const student of students) {
    rows.push({
      insert_id: `seed_sp_time_${n++}`,
      event_time: new Date(baseTime - 3600000).toISOString(),
      event_type: "time_spent",
      student_name: student,
      mode: "self_paced",
      value_num: 120 + Math.floor(Math.random() * 480),
      language: "en",
      source: "session",
      item_id: merged.id,
      item_label: merged.label,
      concept: merged.fileHint,
      pack_id: DEFAULT_PACK_ID,
    });
  }
  for (let c = 0; c < 8; c += 1) {
    rows.push({
      insert_id: `seed_sp_click_${n++}`,
      event_time: new Date(baseTime - 120000 - c * 8000).toISOString(),
      event_type: "content_click",
      student_name: students[c % students.length],
      item_id: merged.id,
      item_label: merged.label,
      concept: merged.fileHint,
      mode: "self_paced",
      value_num: 1,
      language: "en",
      source: "prepare",
      pack_id: DEFAULT_PACK_ID,
    });
  }
  rows.push(
    {
      insert_id: `seed_sp_rw_${n++}`,
      event_time: new Date(baseTime - 900000).toISOString(),
      event_type: "rewind",
      student_name: "Aarav",
      item_id: merged.id,
      item_label: merged.label,
      concept: merged.fileHint,
      mode: "self_paced",
      value_num: 12,
      language: "en",
      source: "player",
      pack_id: DEFAULT_PACK_ID,
    },
    {
      insert_id: `seed_sp_rw_${n++}`,
      event_time: new Date(baseTime - 720000).toISOString(),
      event_type: "rewind",
      student_name: "Anaya",
      item_id: merged.id,
      item_label: merged.label,
      concept: merged.fileHint,
      mode: "self_paced",
      value_num: 6,
      language: "en",
      source: "player",
      pack_id: DEFAULT_PACK_ID,
    }
  );
  return rows;
}

function seedVideoLanguagePlays(baseTime) {
  const topic = "extinction of dinosour";
  const video = {
    id: "lesson-merged",
    label: `${topic} — full merged lesson (~16s)`,
    fileHint: "lesson-merged.mp4",
  };
  const langs = [
    ["en", 14],
    ["hi", 9],
    ["es", 6],
  ];
  const rows = [];
  let n = 0;
  for (const [lang, count] of langs) {
    for (let i = 0; i < count; i += 1) {
      rows.push({
        insert_id: `seed_vp_${n++}`,
        event_time: new Date(baseTime - (n % 40) * 90000).toISOString(),
        event_type: "video_play",
        student_name: i % 3 === 0 ? "Teacher desk" : ["Aarav", "Anaya", "Rohan", "Priya"][i % 4],
        item_id: video.id,
        item_label: video.label,
        concept: video.fileHint,
        mode: i % 5 === 0 ? "live" : "self_paced",
        language: lang,
        value_num: 1,
        source: "player",
        pack_id: DEFAULT_PACK_ID,
      });
    }
  }
  return rows;
}

const SEED = [
  { name: "Aarav", text: "What is this rock made of?", source: "voice", color: "#7c5cff", concept: "Minerals" },
  { name: "Anaya", text: "How did the mountain become so tall?", source: "text", color: "#ef5da8", concept: "Mountain height" },
  { name: "Rohan", text: "Why are some rocks black?", source: "text", color: "#1aa37a", concept: "Rock color" },
];

function blank() {
  return {
    phase: "live",
    playing: true,
    language: "en",
    lesson: LESSON,
    questions: SEED.map((q, i) => ({
      id: `q${i + 1}`,
      ...q,
      status: "new",
      ts: Date.now() - (SEED.length - i) * 60000,
    })),
    hands: [],
    selectedId: null,
    transform: null,
    diagram: null,
    veo: null,
    notice: null,
    analytics: [
      ...SEED.map((q, i) => ({
        insert_id: `seed_${i}`,
        event_time: new Date(Date.now() - (SEED.length - i) * 60000).toISOString(),
        event_type: "question",
        student_name: q.name,
        question: q.text,
        concept: q.concept,
        language: "en",
        source: q.source,
        mode: "live",
      })),
      ...SEED.map((q, i) => ({
        insert_id: `seed_resp_${i}`,
        event_time: new Date(Date.now() - (SEED.length - i) * 60000 + 45000).toISOString(),
        event_type: "teacher_response",
        student_name: q.name,
        question: q.text,
        concept: q.concept,
        language: "en",
        source: "teacher",
        mode: "live",
        value_num: 38 + i * 14,
      })),
      ...seedSelfPacedEvents(Date.now()),
      ...seedVideoLanguagePlays(Date.now()),
    ],
    bigquery: { status: "idle", error: null },
  };
}

let state = blank();
for (const name of ["Aarav", "Anaya", "Rohan", "Priya", "Dev", "Maya"]) touchStudent(name);

function clearReturns() {
  for (const timer of returnTimers) clearTimeout(timer);
  returnTimers.clear();
}

function broadcast() {
  const snapshot = publicState();
  for (const fn of listeners) fn(snapshot);
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(publicState());
  return () => listeners.delete(fn);
}

export function publicState() {
  return {
    phase: state.phase,
    playing: state.playing,
    language: state.language,
    lesson: {
      id: state.lesson.id,
      title: state.lesson.title,
      subject: state.lesson.subject,
      grade: state.lesson.grade,
      narration: state.lesson.narration,
    },
    questions: state.questions,
    hands: state.hands,
    selectedId: state.selectedId,
    transform: state.transform,
    diagram: state.diagram
      ? { stageIndex: state.diagram.stageIndex, image: state.diagram.image, pending: state.diagram.pending }
      : null,
    veo: state.veo,
    notice: state.notice,
    analytics: state.analytics.slice(-80),
    analyticsDigest: buildAnalyticsDigest({
      events: state.analytics,
      rosterSize: ROSTER_SIZE,
      activeStudentNames: activeStudentNames(),
    }),
    rosterSize: ROSTER_SIZE,
    bigquery: state.bigquery,
    engine: engineMode(),
    room: "CURIO",
  };
}

function log(eventType, extra = {}) {
  if (extra.student_name) touchStudent(extra.student_name);
  const row = {
    insert_id: `curio_${Date.now()}_${seq++}`,
    event_time: new Date().toISOString(),
    event_type: eventType,
    student_name: extra.student_name || "",
    question: extra.question || "",
    concept: extra.concept || "",
    language: extra.language || state.language,
    source: extra.source || "",
    mode: extra.mode || "live",
    item_id: extra.item_id || "",
    item_label: extra.item_label || "",
    value_num: Number.isFinite(extra.value_num) ? extra.value_num : null,
    pack_id: extra.pack_id || DEFAULT_PACK_ID,
  };
  state.analytics.push(row);
  if (state.analytics.length > 200) state.analytics.splice(0, state.analytics.length - 200);
  insertAnalytics([row])
    .then((result) => {
      if (!result?.skipped) state.bigquery = { status: "streaming", error: null };
    })
    .catch((err) => {
      state.bigquery = { status: "error", error: err.message };
      broadcast();
    });
}

export function trackEvent(body = {}) {
  const eventType = String(body.event_type || body.type || "").trim();
  if (!eventType) {
    const error = new Error("event_type is required");
    error.status = 400;
    throw error;
  }
  const student = String(body.name || body.student_name || "Student").trim().slice(0, 40) || "Student";
  touchStudent(student);
  log(eventType, {
    student_name: student,
    item_id: body.item_id,
    item_label: body.item_label,
    value_num: body.value_num ?? body.value,
    mode: body.mode || "self_paced",
    source: body.source || "client",
    concept: body.concept || body.fileHint || "",
    question: body.question || "",
    language: body.language,
    pack_id: body.pack_id,
  });
  broadcast();
  return publicState();
}

function logTeacherResponse(question) {
  if (!question?.ts || question.respondedAt) return;
  question.respondedAt = Date.now();
  const sec = Math.round(((question.respondedAt - question.ts) / 1000) * 10) / 10;
  log("teacher_response", {
    student_name: question.name,
    question: question.text,
    concept: question.concept,
    source: "teacher",
    mode: "live",
    value_num: sec,
  });
}

export function addQuestion({ name, text, source, region }) {
  const clean = String(text || "").trim().slice(0, 280);
  const student = String(name || "Student").trim().slice(0, 40) || "Student";
  touchStudent(student);
  if (!clean) {
    const error = new Error("Question is empty");
    error.status = 400;
    throw error;
  }

  const safeRegion = normalizeRegion(region);

  const existing = state.questions.find((q) => q.text.toLowerCase() === clean.toLowerCase());
  if (existing) {
    existing.status = "new";
    existing.ts = Date.now();
    existing.source = source || existing.source;
    if (safeRegion) existing.region = safeRegion;
    log("question_repeat", { student_name: student, question: clean, concept: existing.concept, source });
    broadcast();
    return existing;
  }
  const plan = matchPlan(clean);
  const question = {
    id: `q${seq++}`,
    name: student,
    text: clean,
    source: source || "text",
    color: ["#7c5cff", "#ef5da8", "#1aa37a", "#3b82f6", "#f59e0b"][state.questions.length % 5],
    concept: plan?.concept || "Open curiosity",
    status: "new",
    ts: Date.now(),
    region: safeRegion,
  };
  state.questions.unshift(question);
  if (state.questions.length > 40) state.questions.pop();
  state.hands = state.hands.filter((h) => h.name !== student);
  log("question", { student_name: student, question: clean, concept: question.concept, source: question.source });
  broadcast();
  return question;
}

function normalizeRegion(region) {
  if (!region || typeof region !== "object") return null;
  const x = Number(region.x);
  const y = Number(region.y);
  const w = Number(region.w);
  const h = Number(region.h);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  if (w <= 0 || h <= 0) return null;
  const thumbnail = typeof region.thumbnail === "string" && region.thumbnail.startsWith("data:image/")
    ? region.thumbnail.slice(0, 350000)
    : null;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    w: Math.min(1, Math.max(0, w)),
    h: Math.min(1, Math.max(0, h)),
    label: String(region.label || "Marked region").slice(0, 80),
    frame: String(region.frame || "").slice(0, 200),
    thumbnail,
  };
}

export function raiseHand(name, up = true) {
  const student = String(name || "Student").trim().slice(0, 40) || "Student";
  state.hands = state.hands.filter((h) => h.name !== student);
  if (up) state.hands.push({ name: student, ts: Date.now() });
  log(up ? "raise_hand" : "lower_hand", { student_name: student });
  broadcast();
}

function selectedQuestion() {
  return state.questions.find((q) => q.id === state.selectedId) || null;
}

function applyPlan(question, plan, source) {
  state.phase = "transforming";
  state.playing = true;
  state.diagram = null;
  state.notice = null;
  state.transform = {
    questionId: question.id,
    title: plan.title,
    concept: plan.concept,
    stages: plan.stages,
    index: 0,
    source,
    planning: false,
  };
  question.status = "exploring";
  log("explore", {
    student_name: question.name,
    question: question.text,
    concept: plan.concept,
    source,
  });
}

async function explore(questionId) {
  const question = state.questions.find((q) => q.id === questionId) || state.questions[0];
  if (!question) return;
  state.selectedId = question.id;
  question.status = "selected";
  logTeacherResponse(question);
  const script = matchPlan(question.text);
  if (script) {
    applyPlan(question, script, "script");
    broadcast();
    return;
  }

  if (engineMode() === "lesson-scripts") {
    applyPlan(question, fallbackPlan(question.text), "fallback");
    state.notice =
      "This question is not in the lesson script. Add GOOGLE_CLOUD_PROJECT or GEMINI_API_KEY and CURIO will ask Gemini to plan the scenes. The class still gets a world transformation.";
    broadcast();
    return;
  }

  const hold = planningHold(question.text);
  state.phase = "transforming";
  state.playing = true;
  state.diagram = null;
  state.transform = {
    questionId: question.id,
    title: question.text,
    concept: "Planning",
    stages: hold.stages,
    index: 0,
    source: "gemini",
    planning: true,
  };
  broadcast();

  try {
    const prompt = `You are CURIO, a pedagogy planner for a shared classroom.
The class is inside a cinematic lesson: "How mountains are formed". Students are 11 to 14.
A student asked: "${question.text.replace(/"/g, "'")}"
Plan a world transformation that visually answers the question for the whole class.
The teacher stays in control. Do not write a chat reply.
Return JSON only:
{
  "title": "short title",
  "concept": "2 word concept",
  "stages": [
    {
      "visual": "mountain" | "rock" | "cross-section" | "minerals" | "crystals" | "atoms" | "tectonics" | "volcano" | "time" | "compare" | "insight",
      "label": {"en":"","hi":"","es":""},
      "caption": {"en":"","hi":"","es":""},
      "narration": {"en":"","hi":"","es":""}
    }
  ]
}
Use 4 to 6 stages. Start from the mountain world and move toward the idea. Narration is spoken aloud: two short sentences, vivid, no jargon pile-up. Hindi and Spanish must be real translations.`;
    const raw = await geminiGenerate(prompt, { json: true });
    const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim());
    const plan = normalizePlan(parsed, question.text);
    if (!plan) throw new Error("Gemini plan did not include usable scenes");
    applyPlan(question, plan, "gemini");
  } catch (err) {
    const plan = fallbackPlan(question.text);
    applyPlan(question, plan, "fallback");
    state.notice = `Gemini could not plan this scene (${err.message}). CURIO used its classroom fallback.`;
  }
  broadcast();
}

export async function control(action, payload = {}) {
  if (action === "select" || action === "explore" || action === "return" || action === "reset") clearReturns();
  switch (action) {
    case "select": {
      const question = state.questions.find((q) => q.id === payload.questionId);
      if (!question) return publicState();
      state.selectedId = question.id;
      state.phase = "selected";
      state.playing = false;
      question.status = "selected";
      state.diagram = null;
      log("select", { student_name: question.name, question: question.text, concept: question.concept });
      logTeacherResponse(question);
      break;
    }
    case "explore": {
      await explore(payload.questionId || state.selectedId);
      return publicState();
    }
    case "advance": {
      if (state.phase !== "transforming" || !state.transform || state.transform.planning) break;
      const last = state.transform.stages.length - 1;
      if (state.transform.index < last) state.transform.index += 1;
      state.diagram = null;
      break;
    }
    case "jump": {
      if (state.phase !== "transforming" || !state.transform || state.transform.planning) break;
      const index = Number(payload.index);
      if (Number.isInteger(index) && index >= 0 && index < state.transform.stages.length) {
        state.transform.index = index;
        state.diagram = null;
      }
      break;
    }
    case "pause": {
      state.playing = false;
      break;
    }
    case "play": {
      state.playing = true;
      break;
    }
    case "return": {
      const question = selectedQuestion();
      if (state.phase === "selected" && !state.transform) {
        if (question && question.status === "selected") question.status = "new";
        state.phase = "live";
        state.playing = true;
        state.selectedId = null;
        break;
      }
      if (question && question.status === "exploring") question.status = "explored";
      state.phase = "returning";
      state.playing = true;
      state.diagram = null;
      log("return", {
        student_name: question?.name || "",
        question: question?.text || "",
        concept: state.transform?.concept || "",
      });
      broadcast();
      const timer = setTimeout(() => {
        returnTimers.delete(timer);
        state.phase = "live";
        state.playing = true;
        state.transform = null;
        state.selectedId = null;
        broadcast();
      }, 1600);
      returnTimers.add(timer);
      return publicState();
    }
    case "language": {
      const lang = ["en", "hi", "es"].includes(payload.language) ? payload.language : "en";
      state.language = lang;
      log("language", { source: lang });
      break;
    }
    case "raise": {
      raiseHand(payload.name, payload.up !== false);
      return publicState();
    }
    case "diagram": {
      state.diagram = { stageIndex: state.transform?.index ?? 0, image: payload.image || null, pending: Boolean(payload.pending) };
      if (payload.notice) state.notice = payload.notice;
      break;
    }
    case "notice": {
      state.notice = payload.notice || null;
      break;
    }
    case "veo": {
      state.veo = payload.veo || null;
      if (payload.notice) state.notice = payload.notice;
      break;
    }
    case "reset": {
      const language = state.language;
      state = blank();
      state.language = language;
      log("reset");
      break;
    }
    default: {
      const error = new Error(`Unknown action: ${action}`);
      error.status = 400;
      throw error;
    }
  }
  broadcast();
  return publicState();
}

export function currentNarration() {
  if (state.phase === "transforming" && state.transform) {
    const stage = state.transform.stages[state.transform.index];
    return textOf(stage?.narration, state.language);
  }
  if (state.phase === "returning") {
    return textOf(
      {
        en: "Back to the mountain. The lesson continues.",
        hi: "पहाड़ पर वापस। पाठ जारी है।",
        es: "De vuelta a la montaña. La lección continúa.",
      },
      state.language
    );
  }
  return textOf(state.lesson.narration, state.language);
}
