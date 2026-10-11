const ID = "1791714129237";
const BASE = `/generated/studio/${ID}`;

function still(moment, kind) {
  return {
    id: kind,
    kind,
    url: `${BASE}/moment-${moment}-image-${kind}.png`,
    error: null,
    positions: {},
  };
}

function view(moment, kind) {
  return { url: `${BASE}/moment-${moment}-image-${kind}.png`, error: null };
}

const moments = [
  {
    id: "moment_1",
    title: "A neuron at rest",
    caption: "A neuron waits to fire",
    seekSec: 0,
    points: [
      "A neuron carries an electrical signal.",
      "The cell body, axon, and dendrites each have a job.",
      "At rest, the membrane is charged and ready.",
    ],
    labels: [
      {
        id: "action_potential",
        text: "Action Potential",
        blurb: "An action potential is a brief electrical spike that travels along the axon of a neuron. It allows the neuron to quickly send information over long distances.",
        highlights: [
          { icon: "zap", text: "Triggered when the membrane depolarizes" },
          { icon: "activity", text: "Travels rapidly along the axon" },
          { icon: "shield", text: "All-or-nothing response" },
          { icon: "arrow", text: "Helps transmit signals to other neurons" },
        ],
        facts: [
          ["Duration", "~1–2 ms"],
          ["Amplitude", "~100 mV"],
          ["Speed", "Up to 120 m/s (myelinated)"],
          ["Type", "Electrical signal"],
        ],
        panels: {
          function: [
            { title: "Resting Potential", text: "The inside of the neuron is about −70 mV." },
            { title: "Depolarization", text: "Voltage-gated sodium channels open and Na+ flows into the cell." },
            { title: "Repolarization", text: "Sodium channels close and potassium channels open. K+ flows out of the cell." },
            { title: "Hyperpolarization", text: "Potassium channels stay open briefly, so the membrane becomes more negative." },
            { title: "Return to Resting Potential", text: "Ion channels reset and the membrane potential returns to about −70 mV." },
          ],
          structure: [
            { title: "Axon membrane", text: "A thin boundary that holds the charge difference between inside and outside." },
            { title: "Sodium channels", text: "Gates that open first and let the spike begin." },
            { title: "Potassium channels", text: "Gates that open next and restore the resting charge." },
            { title: "Myelin sheath", text: "Insulation that lets the spike jump quickly along the axon." },
          ],
          related: [
            { title: "Synapse", text: "The junction where this electrical spike becomes a chemical message." },
            { title: "Neurotransmitters", text: "Molecules released when the spike reaches the axon terminal." },
            { title: "Dendrite", text: "The branch on the next cell that can receive the message." },
          ],
        },
      },
      {
        id: "synapse",
        text: "Synapse",
        blurb: "The synapse is the junction where one neuron passes a signal to the next cell.",
        highlights: [
          { icon: "radio", text: "The signal arrives at the axon terminal" },
          { icon: "layers", text: "A tiny gap separates the two cells" },
          { icon: "arrow", text: "The message can continue in the next neuron" },
        ],
        facts: [
          ["Width", "~20–40 nm"],
          ["Signal", "Chemical, then electrical"],
          ["Direction", "One way"],
          ["Type", "Junction"],
        ],
      },
      {
        id: "neurotransmitters",
        text: "Neurotransmitters",
        blurb: "Neurotransmitters are chemical messengers released into the synapse.",
        highlights: [
          { icon: "dot", text: "Stored in vesicles until the signal arrives" },
          { icon: "arrow", text: "Diffuse across the synaptic gap" },
          { icon: "shield", text: "Cleared so the signal can stop" },
        ],
        facts: [
          ["Role", "Chemical messenger"],
          ["Release", "From the axon terminal"],
          ["Target", "Receptors on the next cell"],
          ["Type", "Molecule"],
        ],
      },
    ],
    images: ["wide", "angle", "part", "detail"].map((kind) => still(1, kind)),
    exploded: view(1, "exploded"),
    inside: view(1, "inside"),
  },
  {
    id: "moment_2",
    title: "The signal starts",
    caption: "The membrane potential flips",
    seekSec: 8,
    points: [
      "Sodium channels open and the inside becomes positive.",
      "The spike begins at the axon hillock.",
      "The signal moves in one direction along the axon.",
    ],
    labels: [
      { id: "axon", text: "Axon", blurb: "The long fiber that carries the spike away from the cell body." },
      { id: "membrane", text: "Membrane", blurb: "The cell boundary whose charge changes as the signal passes." },
    ],
    images: ["wide", "angle", "part", "detail"].map((kind) => still(2, kind)),
    exploded: view(2, "exploded"),
    inside: null,
  },
  {
    id: "moment_3",
    title: "Across the synapse",
    caption: "The signal reaches the gap",
    seekSec: 16,
    points: [
      "The electrical spike reaches the axon terminal.",
      "Vesicles release neurotransmitter into the gap.",
      "The next cell may fire if enough receptors are activated.",
    ],
    labels: [
      { id: "vesicle", text: "Vesicle", blurb: "A small sac that stores neurotransmitter until the signal arrives." },
      { id: "receptor", text: "Receptor", blurb: "A protein on the next cell that the neurotransmitter binds to." },
    ],
    images: ["wide", "angle"].map((kind) => still(3, kind)),
    exploded: null,
    inside: view(3, "inside"),
  },
  {
    id: "moment_4",
    title: "Chemical messengers",
    caption: "Molecules cross the gap",
    seekSec: 24,
    points: [
      "Neurotransmitters diffuse across the synaptic cleft.",
      "Binding opens channels on the receiving cell.",
      "Leftover messenger is cleared so the signal can stop.",
    ],
    labels: [
      { id: "cleft", text: "Synaptic cleft", blurb: "The tiny space the messenger molecules cross." },
      { id: "channel", text: "Ion channel", blurb: "A gate that opens when the messenger binds." },
    ],
    images: ["wide", "angle", "detail"].map((kind) => still(4, kind)),
    exploded: view(4, "exploded"),
    inside: null,
  },
  {
    id: "moment_5",
    title: "The next cell",
    caption: "The message continues",
    seekSec: 32,
    points: [
      "The receiving neuron adds up the incoming signals.",
      "A strong enough input starts a new action potential.",
      "That is how a nerve message travels through a circuit.",
    ],
    labels: [
      { id: "dendrite", text: "Dendrite", blurb: "A branch that receives signals from other neurons." },
      { id: "cell_body", text: "Cell body", blurb: "The part that decides whether the neuron will fire." },
    ],
    images: ["detail"].map((kind) => still(5, kind)),
    exploded: view(5, "exploded"),
    inside: view(5, "inside"),
  },
];

const ROCKET_ID = "1791721740337";
const ROCKET_BASE = `/generated/studio/${ROCKET_ID}`;

function rocketStill(moment, kind) {
  return {
    id: kind,
    kind,
    url: `${ROCKET_BASE}/moment-${moment}-image-${kind}.png`,
    error: null,
    positions: {},
  };
}

const rocketMoments = [
  {
    id: "moment_1",
    title: "Engines light",
    caption: "The engines push against the pad",
    seekSec: 0,
    points: [
      "Fuel and oxidizer meet in the combustion chamber.",
      "Hot gas leaves through the nozzle at high speed.",
      "That downward push lifts the rocket.",
    ],
    labels: [
      {
        id: "combustion_chamber",
        text: "Combustion Chamber",
        blurb: "The combustion chamber is where fuel and oxidizer burn and turn into hot, high-pressure gas.",
        highlights: [
          "Fuel and oxidizer burn together here.",
          "The gas becomes very hot and highly pressurized.",
          "That pressure is what the engine turns into thrust.",
        ],
        facts: [
          ["Place", "Above the nozzle"],
          ["Job", "Burn the propellant"],
          ["Output", "Hot exhaust gas"],
        ],
        panels: {
          function: [
            { title: "Propellants enter", text: "Fuel and oxidizer are pumped into the chamber." },
            { title: "They burn", text: "The mixture ignites and releases a huge amount of heat." },
            { title: "Pressure builds", text: "The hot gas has only one way out: down through the nozzle." },
          ],
          structure: [
            { name: "Chamber wall", detail: "A strong shell that holds the burning gas." },
            { name: "Injector", detail: "The plate that sprays fuel and oxidizer into the chamber." },
            { name: "Throat", detail: "The narrow opening that leads into the nozzle." },
          ],
          related: [
            { title: "Nozzle", text: "The bell that speeds the gas up as it leaves." },
            { title: "Exhaust plume", text: "The bright stream of gas you see below the engine." },
          ],
        },
      },
      {
        id: "nozzle",
        text: "Nozzle",
        blurb: "The nozzle is the bell under the chamber. It speeds the exhaust up and points the push downward.",
        highlights: [
          "The bell gets wider toward the exit.",
          "Gas leaves faster than it entered.",
          "The rocket is pushed the other way.",
        ],
        facts: [
          ["Shape", "Widening bell"],
          ["Job", "Speed up the exhaust"],
          ["Direction", "Push downward"],
        ],
      },
    ],
    images: ["wide", "detail"].map((kind) => rocketStill(1, kind)),
    exploded: null,
    inside: null,
  },
  {
    id: "moment_2",
    title: "Thrust builds",
    caption: "The plume drives the rocket up",
    seekSec: 7.6,
    points: [
      "The propellant feed system keeps the engine supplied.",
      "The exhaust plume is the visible result of the burn.",
      "As the plume stays strong, the rocket climbs.",
    ],
    labels: [
      {
        id: "feed_system",
        text: "Propellant Feed System",
        blurb: "The propellant feed system is the pumps and pipes that deliver fuel and oxidizer to the engine.",
        highlights: [
          "Pumps push the propellants at high pressure.",
          "Pipes carry them into the chamber.",
          "The engine stalls if this flow stops.",
        ],
        facts: [
          ["Parts", "Pumps and pipes"],
          ["Job", "Feed the chamber"],
          ["Need", "Steady high pressure"],
        ],
        panels: {
          function: [
            { title: "Draw propellant", text: "Pumps pull fuel and oxidizer from the tanks." },
            { title: "Raise the pressure", text: "The propellants must enter the chamber faster than the flame can push back." },
            { title: "Keep the burn going", text: "A steady feed lets the exhaust plume stay strong." },
          ],
          structure: [
            { name: "Pumps", detail: "Machines that force the propellants toward the engine." },
            { name: "Pipes", detail: "Lines that carry fuel and oxidizer separately." },
            { name: "Valves", detail: "Controls that open the path into the chamber." },
          ],
          related: [
            { title: "Combustion chamber", text: "Where the delivered propellants burn." },
            { title: "Exhaust plume", text: "The flame produced once the feed is flowing." },
          ],
        },
      },
      {
        id: "exhaust_plume",
        text: "Exhaust Plume",
        blurb: "The exhaust plume is the bright stream of gas shooting out of the nozzle.",
        highlights: [
          "It is the burned propellant leaving the engine.",
          "The faster it leaves, the harder it pushes the rocket.",
          "You can see the thrust as flame and smoke.",
        ],
        facts: [
          ["Seen as", "Flame and smoke"],
          ["Leaves from", "The nozzle"],
          ["Effect", "Upward thrust"],
        ],
      },
    ],
    images: ["wide", "detail"].map((kind) => rocketStill(2, kind)),
    exploded: null,
    inside: null,
  },
];

export const rocketMock = {
  id: `mock-${ROCKET_ID}`,
  topic: "How a rocket leaves the ground",
  subtitle: "Watch the engines light and the exhaust push the rocket up.",
  prompt: "Explain how a rocket leaves the ground",
  moments: rocketMoments,
  video: {
    id: "studio-lesson",
    merged: true,
    title: "How a rocket leaves the ground",
    url: `${ROCKET_BASE}/video/lesson-${ROCKET_ID}.mp4`,
    posterUrl: `${ROCKET_BASE}/video/lesson-${ROCKET_ID}-poster.jpg`,
    durationSeconds: 15.67,
    captions: rocketMoments.map((moment) => ({ atSec: moment.seekSec, text: moment.caption })),
  },
  errors: [],
};

export const nerveCellMock = {
  id: `mock-${ID}`,
  topic: "How a nerve cell sends a signal",
  subtitle: "Watch a cinematic explanation of how neurons communicate.",
  prompt: "Explain how a nerve cell sends a signal",
  moments,
  video: {
    id: "studio-lesson",
    merged: true,
    title: "How a nerve cell sends a signal",
    url: `${BASE}/video/lesson-${ID}.mp4`,
    posterUrl: `${BASE}/video/lesson-${ID}-poster.jpg`,
    durationSeconds: 40,
    captions: moments.map((moment) => ({ atSec: moment.seekSec, text: moment.caption })),
  },
  errors: [],
};

export const studioMocks = [
  {
    id: "nerve",
    name: nerveCellMock.topic,
    image: `${BASE}/moment-1-image-wide.png`,
    session: nerveCellMock,
  },
  {
    id: "rocket",
    name: rocketMock.topic,
    image: `${ROCKET_BASE}/moment-1-image-wide.png`,
    session: rocketMock,
  },
];
