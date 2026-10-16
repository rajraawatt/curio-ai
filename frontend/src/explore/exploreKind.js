export function inferExploreKind({ id, label, imagePrompt, mesh } = {}) {
  if (mesh?.exploreKind && mesh.exploreKind !== "generic") return mesh.exploreKind;
  const blob = `${id || ""} ${label || ""} ${imagePrompt || ""}`.toLowerCase();
  if (/asteroid|meteor|impact|comet|chicxulub/.test(blob)) return "asteroid";
  if (/dino|sauropod|brachio|trex|tricerat|herbivore|kingdom/.test(blob)) return "sauropod";
  return "generic";
}
