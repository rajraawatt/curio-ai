import assert from "node:assert/strict";
import test from "node:test";
import {
  composeTeacherPrompt,
  lessonFromBody,
  normalizeCaptions,
  normalizeNarration,
  withHouseStyle,
} from "./preparePrompt.js";

test("composeTeacherPrompt builds a lesson prompt and appends the immersive style", () => {
  const lesson = composeTeacherPrompt({
    topic: "How a volcano erupts",
    ageGroup: "11-14",
    keywords: "magma, crater, ash cloud",
    language: "hi",
  });

  assert.equal(lesson.topic, "How a volcano erupts");
  assert.equal(lesson.ageGroup, "11-14");
  assert.deepEqual(lesson.keywords, ["magma", "crater", "ash cloud"]);
  assert.equal(lesson.language, "hi");
  assert.match(lesson.prompt, /Topic: How a volcano erupts/);
  assert.match(lesson.prompt, /Student age group: 11-14/);
  assert.match(lesson.prompt, /Keywords: magma, crater, ash cloud/);
  assert.match(lesson.prompt, /Narration language: Hindi/);
  assert.match(lesson.prompt, /English, Hindi, and Spanish/);
  assert.match(lesson.prompt, /HD video that feels immersive/);
  assert.match(lesson.prompt, /Keywords are ingredients of that story/);
  assert.match(lesson.prompt, /Scene 2 shows what caused the change/);
});

test("composeTeacherPrompt rejects a blank topic", () => {
  assert.throws(() => composeTeacherPrompt({ topic: "   " }), /Topic is required/);
});

test("composeTeacherPrompt falls back to a middle age group and English", () => {
  const lesson = composeTeacherPrompt({
    topic: "Photosynthesis",
    ageGroup: "college",
    language: "fr",
    keywords: "",
  });
  assert.equal(lesson.ageGroup, "11-14");
  assert.equal(lesson.language, "en");
  assert.match(lesson.prompt, /Keywords: none/);
  assert.match(lesson.prompt, /Narration language: English/);
});

test("normalizeNarration keeps English, Hindi, and Spanish", () => {
  assert.deepEqual(normalizeNarration({ en: "The crater", hi: "गड्ढा", es: "El cráter" }), {
    en: "The crater",
    hi: "गड्ढा",
    es: "El cráter",
  });
  assert.deepEqual(normalizeNarration("One line"), { en: "One line", hi: "One line", es: "One line" });
});

test("lessonFromBody treats a topic field as the structured teacher form", () => {
  const lesson = lessonFromBody({ topic: "Tides", ageGroup: "8-10", keywords: "moon", language: "es" });
  assert.equal(lesson.language, "es");
  assert.match(lesson.prompt, /Topic: Tides/);
  assert.throws(() => lessonFromBody({ topic: "" }), /Topic is required/);
});

test("lessonFromBody keeps a legacy free-text prompt", () => {
  const lesson = lessonFromBody({ prompt: "Show the nucleus." }, "fallback");
  assert.equal(lesson.prompt, "Show the nucleus.");
  assert.equal(lesson.topic, null);
  assert.equal(lessonFromBody({}, "fallback cell").prompt, "fallback cell");
});

test("normalizeCaptions keeps timed historical points and falls back to narration", () => {
  const cues = normalizeCaptions([
    { atSec: 0, text: { en: "Families lived together.", hi: "परिवार साथ रहते थे।", es: "Las familias vivían juntas." } },
    { atSec: 3, text: "They ate plants." },
    { atSec: 99, text: "The kingdom ended." },
  ]);
  assert.equal(cues[0].atSec, 0);
  assert.equal(cues[0].text.hi, "परिवार साथ रहते थे।");
  assert.equal(cues[1].atSec, 3);
  assert.equal(cues[1].text.en, "They ate plants.");
  assert.equal(cues.length, 2);
  assert.deepEqual(normalizeCaptions(null, "One fact."), [{ atSec: 0, text: { en: "One fact.", hi: "One fact.", es: "One fact." } }]);
});

test("withHouseStyle appends the immersive line once", () => {
  const once = withHouseStyle("Slow orbit around a volcano crater.");
  assert.match(once, /Slow orbit around a volcano crater\./);
  assert.match(once, /HD video that feels immersive/);
  assert.equal(withHouseStyle(once), once);
});
