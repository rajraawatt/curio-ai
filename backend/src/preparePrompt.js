export const AGE_GROUPS = ["8-10", "11-14", "15-18"];

export const LANGUAGES = {
  en: "English",
  hi: "Hindi",
  es: "Spanish",
};

export const STORY_LINE =
  "The teacher may write only a few words. Turn those words into one idea a student can say back in a single sentence. Tell that idea across two 8-second scenes, played in order. Keywords are ingredients of that story, not separate unrelated objects. Scene 1 shows the world before. Scene 2 shows what caused the change and how it ended. Use everyday words for the age group.";

export const VIDEO_STYLE =
  "HD video that feels immersive. One slow, obvious motion so a student can see what changed. Gentle camera move. No on-screen text, no labels, no watermark. No dialogue, no narration, no voiceover, and no people talking.";

export const HOUSE_STYLE = `${STORY_LINE} ${VIDEO_STYLE}`;

export function composeTeacherPrompt({ topic, ageGroup, keywords, language } = {}) {
  const cleanTopic = String(topic || "").trim();
  if (!cleanTopic) {
    const err = new Error("Topic is required");
    err.status = 400;
    throw err;
  }

  const age = AGE_GROUPS.includes(ageGroup) ? ageGroup : "11-14";
  const lang = LANGUAGES[language] ? language : "en";
  const words = String(keywords || "")
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);

  const prompt = [
    `Topic: ${cleanTopic}`,
    `Student age group: ${age}`,
    `Keywords: ${words.length ? words.join(", ") : "none. Use the topic words as the whole lesson."}`,
    `Narration language: ${LANGUAGES[lang]}. Also write narration in English, Hindi, and Spanish.`,
    HOUSE_STYLE,
  ].join("\n");

  return {
    prompt,
    topic: cleanTopic,
    ageGroup: age,
    keywords: words,
    language: lang,
  };
}

export function withHouseStyle(videoPrompt) {
  const base = String(videoPrompt || "").trim();
  if (!base) return VIDEO_STYLE;
  if (base.includes("HD video that feels immersive")) return base;
  return `${base} ${VIDEO_STYLE}`;
}

const CAPTION_SLOTS = [0, 4];

export function normalizeCaptions(value, narration = "", durationSec = 8) {
  const limit = Math.max(durationSec - 1, 0);
  const raw = Array.isArray(value) ? value : [];
  const cues = raw
    .map((item, index) => {
      const atSec = Number(item?.atSec);
      const slot = Number.isFinite(atSec) ? Math.min(Math.max(atSec, 0), limit) : (CAPTION_SLOTS[index] ?? 0);
      return { atSec: slot, text: normalizeNarration(item?.text ?? item, "") };
    })
    .filter((cue) => cue.text.en)
    .slice(0, 2);
  if (cues.length) return cues;
  const line = normalizeNarration(narration);
  if (!line.en) return [];
  return [{ atSec: 0, text: line }];
}

export function normalizeNarration(value, fallback = "") {
  const fb = String(fallback || "").slice(0, 240);
  if (value && typeof value === "object") {
    const en = String(value.en || fb).slice(0, 240);
    return {
      en,
      hi: String(value.hi || en).slice(0, 240),
      es: String(value.es || en).slice(0, 240),
    };
  }
  const text = String(value || fb).slice(0, 240);
  return { en: text, hi: text, es: text };
}

export function lessonFromBody(body, fallbackPrompt = "") {
  if (body && Object.prototype.hasOwnProperty.call(body, "topic")) {
    return composeTeacherPrompt(body);
  }
  const prompt =
    typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : typeof body?.summary === "string" && body.summary.trim()
        ? body.summary.trim()
        : String(fallbackPrompt || "").trim();
  return {
    prompt,
    topic: null,
    ageGroup: null,
    keywords: [],
    language: "en",
  };
}
