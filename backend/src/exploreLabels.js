import { enrichDiagramLabels } from "./diagramLabels.js";

export function inferExploreKind(object = {}) {
  const id = String(object.id || "").toLowerCase();
  const label = String(object.label || "").toLowerCase();
  const prompt = String(object.imagePrompt || "").toLowerCase();
  const blob = `${id} ${label} ${prompt}`;
  if (/asteroid|meteor|impact|comet|chicxulub/.test(blob)) return "asteroid";
  if (/dino|sauropod|brachio|trex|tricerat|herbivore|kingdom/.test(blob)) return "sauropod";
  return "generic";
}

export function labelsLookGeneric(labels) {
  if (!Array.isArray(labels) || labels.length < 2) return true;
  const generic = labels.filter(
    (l) =>
      !l?.detail
      || /key part of|zoom in or tap|important part of/i.test(String(l.detail))
      || String(l.summary || l.text) === String(l.text)
  );
  return generic.length >= Math.ceil(labels.length * 0.5);
}

const PRESETS = {
  asteroid: [
    {
      id: "iron_core",
      text: "Iron–nickel core",
      summary: "Dense metal heart of the rock",
      detail:
        "Many asteroids hold an iron–nickel core like a tiny planet. That heavy core is why some space rocks are so massive for their size—and why impacts release enormous energy.",
      position: { x: 0, y: 0, z: 0 },
    },
    {
      id: "rocky_mantle",
      text: "Rocky mantle",
      summary: "Mixed stone wrapped around the core",
      detail:
        "Between the core and the surface is a mantle of silicate rock. When an asteroid slams into Earth, this layer shatters and blasts dust and gas into the sky.",
      position: { x: 0.55, y: 0.12, z: 0.35 },
    },
    {
      id: "crust_surface",
      text: "Crust & regolith",
      summary: "Battered outer shell",
      detail:
        "The crust is covered in regolith—loose dust and pebbles from billions of years of micro-impacts. It is the first layer to vaporize in a fiery atmospheric entry.",
      position: { x: 0.82, y: 0.35, z: 0.55 },
    },
    {
      id: "impact_fractures",
      text: "Impact fractures",
      summary: "Cracks from ancient collisions",
      detail:
        "Older smash-ups left fracture networks inside the asteroid. Those weak zones can break the body apart—or help it survive until one final, world-changing hit.",
      position: { x: -0.72, y: -0.2, z: 0.62 },
    },
    {
      id: "fire_entry",
      text: "Atmospheric entry",
      summary: "Super-heated shock wave",
      detail:
        "Plunging through air, the front of the rock compresses gas to thousands of degrees. That fireball is what many dinosaurs’ skies would have turned into in minutes.",
      position: { x: 0.15, y: 0.78, z: 0.68 },
    },
    {
      id: "frozen_minerals",
      text: "Ancient minerals",
      summary: "Clues from the early solar system",
      detail:
        "Some minerals locked inside formed before Earth existed. Scientists study them to learn how our solar system—and life’s later catastrophes—came to be.",
      position: { x: -0.45, y: 0.55, z: -0.55 },
    },
  ],
  sauropod: [
    {
      id: "small_brain",
      text: "Small brain",
      summary: "Tiny compared to body size",
      detail:
        "Long-necked dinosaurs had brains much smaller than you might expect. They did not need to be clever puzzle-solvers—they needed steady nerves to move a mountain-sized body.",
      position: { x: 0.22, y: 0.82, z: 0.55 },
    },
    {
      id: "long_neck",
      text: "Long neck",
      summary: "Reach food like a living crane",
      detail:
        "The neck worked like a counterbalanced boom to browse ferns and treetops other animals could not reach. More food for the family meant stronger herds in the kingdom.",
      position: { x: 0.35, y: 0.55, z: 0.72 },
    },
    {
      id: "massive_heart",
      text: "Powerful heart & lungs",
      summary: "Pumping blood up that neck",
      detail:
        "A huge heart and efficient lungs pushed blood and oxygen to the head far above the ground. Without that system, the tallest plant-eaters could not have survived.",
      position: { x: 0.05, y: 0.15, z: 0.45 },
    },
    {
      id: "pillar_legs",
      text: "Pillar legs",
      summary: "Columns holding tons of weight",
      detail:
        "Thick, column-like legs spread weight like bridge pylons. Tracks in stone show families walking together—the same “kingdom” you saw in the lesson video.",
      position: { x: 0.48, y: -0.55, z: 0.35 },
    },
    {
      id: "whiplash_tail",
      text: "Whiplash tail",
      summary: "Balance and maybe defense",
      detail:
        "A long muscular tail acted as a counterweight to the neck and could snap fast if a predator got too close. It helped the animal pivot and stay stable while moving.",
      position: { x: -0.78, y: 0.05, z: -0.25 },
    },
    {
      id: "plant_teeth",
      text: "Peg-like teeth",
      summary: "Built for stripping plants",
      detail:
        "Simple teeth raked leaves and soft plants—they were not meat slicers. That plant diet tied the whole ecosystem together: forests fed dinosaurs, dinosaurs shaped the land.",
      position: { x: 0.62, y: 0.72, z: 0.38 },
    },
  ],
};

export function presetExploreLabels(kind, objectLabel = "this subject") {
  const list = PRESETS[kind];
  if (!list) return null;
  return enrichDiagramLabels(list, objectLabel);
}

export function ensureExploreLabels(asset) {
  const kind = asset?.mesh?.exploreKind || inferExploreKind(asset);
  if (kind === "generic") {
    return enrichDiagramLabels(asset.labels, asset.label);
  }
  if (!labelsLookGeneric(asset.labels)) {
    return enrichDiagramLabels(asset.labels, asset.label);
  }
  const preset = presetExploreLabels(kind, asset.label);
  return preset || enrichDiagramLabels(asset.labels, asset.label);
}
