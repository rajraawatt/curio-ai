import { geminiGenerate } from "./gcp.js";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

/**
 * Short classroom tutor reply grounded in the clicked 3D part / model.
 * Returns { answer, followUp, partHint } or throws.
 */
export async function askModelTutor({
  question,
  modelLabel,
  modelId,
  partId,
  partLabel,
  topic,
  ageGroup = "11-14",
  language = "en",
  reason,
  history = [],
} = {}) {
  const ask = cleanText(question);
  if (!ask) {
    const err = new Error("Ask a question about the model.");
    err.status = 400;
    throw err;
  }

  const modelName = cleanText(modelLabel) || cleanText(modelId) || "this 3D model";
  const partName = cleanText(partLabel) || cleanText(partId) || "the area the student clicked";
  const lessonTopic = cleanText(topic) || modelName;
  const prior = (Array.isArray(history) ? history : [])
    .slice(-4)
    .map((turn) => `${turn.role === "assistant" ? "Tutor" : "Student"}: ${cleanText(turn.text)}`)
    .filter((line) => line.length > 10)
    .join("\n");

  const prompt = `You are CURIO, a friendly science tutor inside an interactive 3D lesson.
The student is exploring a 3D model while studying: "${lessonTopic}".
Model: ${modelName}${reason ? ` (${cleanText(reason)})` : ""}.
They clicked / selected this part: ${partName}.
Age group: ${ageGroup}. Reply language: ${language === "hi" ? "Hindi" : language === "es" ? "Spanish" : "English"}.

Rules:
- Answer the student's question in 2–4 short spoken sentences (easy to read aloud).
- Ground the answer in the selected part when relevant. If the question is about something else on the same model, still stay accurate.
- No markdown, no bullet lists, no emojis.
- End with one short follow-up challenge question the student can ask next (or answer by clicking another part).
${prior ? `\nRecent chat:\n${prior}\n` : ""}
Student question: "${ask.replace(/"/g, "'")}"

Return JSON only:
{
  "answer": "spoken explanation",
  "followUp": "one short follow-up question",
  "partHint": "optional short name of the part you focused on"
}`;

  try {
    const raw = await geminiGenerate(prompt, { json: true });
    const parsed = JSON.parse(String(raw).replace(/^```json\s*|```$/g, "").trim());
    const answer = cleanText(parsed.answer || parsed.reply || parsed.text);
    if (!answer) throw new Error("empty tutor answer");
    return {
      answer,
      followUp: cleanText(parsed.followUp || parsed.followup) || null,
      partHint: cleanText(parsed.partHint || partName) || partName,
      source: "gemini",
    };
  } catch (err) {
    // Offline / quota fallback so the UI still demonstrates the loop.
    const fallback = `${partName} is an important part of the ${modelName}. ${ask.includes("?") ? "In class we look at how this part works with the rest of the structure." : "Try asking what this part does, or what happens if it stops working."}`;
    return {
      answer: fallback,
      followUp: `What would happen to the ${modelName} if ${partName} stopped working?`,
      partHint: partName,
      source: "fallback",
      notice: err?.message || "Gemini unavailable",
    };
  }
}
