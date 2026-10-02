export function textOf(field, lang = "en") {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[lang] || field.en || "";
}

export function stageAt(state) {
  if (!state?.transform) return null;
  return state.transform.stages[state.transform.index] || null;
}

export function visualOf(state) {
  if (!state) return "mountain";
  if (state.phase === "transforming") return stageAt(state)?.visual || "insight";
  return "mountain";
}
