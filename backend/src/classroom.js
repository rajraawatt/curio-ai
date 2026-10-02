import { LESSON, matchPlan, fallbackPlan, planningHold, normalizePlan, textOf } from "./lesson.js";
import { engineMode, geminiGenerate, insertAnalytics } from "./gcp.js";

const listeners = new Set();
let seq = 10;
const returnTimers = new Set();

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
    analytics: SEED.map((q, i) => ({
      insert_id: `seed_${i}`,
      event_time: new Date(Date.now() - (SEED.length - i) * 60000).toISOString(),
      event_type: "question",
      student_name: q.name,
      question: q.text,
      concept: q.concept,
      language: "en",
      source: q.source,
    })),
    bigquery: { status: "idle", error: null },
  };
}

let state = blank();

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
    analytics: state.analytics.slice(-40),
    bigquery: state.bigquery,
    engine: engineMode(),
    room: "CURIO",
  };
}

function log(eventType, extra = {}) {
  const row = {
    insert_id: `curio_${Date.now()}_${seq}`,
    event_time: new Date().toISOString(),
    event_type: eventType,
    student_name: extra.student_name || "",
    question: extra.question || "",
    concept: extra.concept || "",
    language: state.language,
    source: extra.source || "",
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

export function addQuestion({ name, text, source, region }) {
  const clean = String(text || "").trim().slice(0, 280);
  const student = String(name || "Student").trim().slice(0, 40) || "Student";
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
