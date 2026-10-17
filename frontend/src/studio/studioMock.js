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

function part(id, text, blurb, steps) {
  return {
    id,
    text,
    blurb,
    panels: {
      function: steps.map((step) => ({ text: step })),
      structure: [{ name: text, detail: blurb }],
    },
  };
}

function assetMock({ id, slug, topic, subtitle, prompt, learningGoal, concepts, moments }) {
  const base = `/generated/studio/${id}`;
  const built = moments.map((moment, index) => ({
    id: `moment_${index + 1}`,
    title: moment.title,
    summary: moment.summary,
    caption: moment.caption,
    seekSec: index * 8,
    points: moment.points,
    labels: moment.labels,
    images: ["wide", "detail"].map((kind) => ({
      id: kind,
      kind,
      url: `${base}/moment-${index + 1}-image-${kind}.png`,
      error: null,
      positions: {},
    })),
    exploded: null,
    inside: null,
  }));
  return {
    id: slug,
    name: topic,
    image: `${base}/moment-1-image-wide.png`,
    session: {
      id: `mock-${id}`,
      topic,
      subtitle,
      prompt,
      learningGoal,
      concepts,
      moments: built,
      video: {
        id: "studio-lesson",
        merged: true,
        title: topic,
        url: `${base}/video/lesson-${id}.mp4`,
        posterUrl: `${base}/video/lesson-${id}-poster.jpg`,
        durationSeconds: 16,
        captions: built.map((moment) => ({ atSec: moment.seekSec, text: moment.caption })),
      },
      errors: [],
    },
  };
}

const heartMock = assetMock({
  id: "1792242126415",
  slug: "heart",
  topic: "How the heart pumps blood",
  subtitle: "Watch the atria fill and the ventricles push blood onward.",
  prompt: "Explain how the heart pumps blood",
  learningGoal: "See how the four chambers move blood through the heart.",
  concepts: [
    { title: "Right Atrium", text: "Receives blood returning to the heart." },
    { title: "Left Atrium", text: "Receives blood coming back from the lungs." },
    { title: "Right Ventricle", text: "Pumps blood toward the lungs." },
    { title: "Left Ventricle", text: "Pumps blood out to the body." },
  ],
  moments: [
    {
      title: "The atria fill",
      summary: "Blood returns to the upper chambers.",
      caption: "The atria fill before the beat.",
      points: ["Blood returns to the right atrium.", "Blood from the lungs returns to the left atrium.", "The atria then pass that blood downward."],
      labels: [
        part("right_atrium", "Right Atrium", "The upper chamber that receives blood returning to the heart.", [
          "Veins bring blood back into this chamber.",
          "The chamber fills before it contracts.",
          "It passes the blood down into the right ventricle.",
        ]),
        part("left_atrium", "Left Atrium", "The upper chamber that receives blood coming back from the lungs.", [
          "Blood arrives here after picking up oxygen.",
          "The chamber holds it briefly.",
          "It passes the blood down into the left ventricle.",
        ]),
      ],
    },
    {
      title: "The ventricles pump",
      summary: "The lower chambers push blood out.",
      caption: "The ventricles drive the blood onward.",
      points: ["The right ventricle sends blood to the lungs.", "The left ventricle sends blood to the body.", "The thicker left wall makes the stronger push."],
      labels: [
        part("right_ventricle", "Right Ventricle", "The lower chamber that pumps blood toward the lungs.", [
          "It receives blood from the right atrium.",
          "It contracts and sends that blood to the lungs.",
          "The lungs refresh the blood before it returns.",
        ]),
        part("left_ventricle", "Left Ventricle", "The lower chamber that pumps blood out to the body.", [
          "It receives blood from the left atrium.",
          "Its thick wall makes a strong contraction.",
          "That push sends blood out through the body.",
        ]),
      ],
    },
  ],
});

const plantMock = assetMock({
  id: "1792243496873",
  slug: "plant",
  topic: "How a plant lives without chlorophyll",
  subtitle: "Watch a pale forest plant draw food through a fungal network.",
  prompt: "Explain photosynthesis of a plant without chlorophyll",
  learningGoal: "See how Indian pipe gets food without making it from sunlight.",
  concepts: [
    { title: "Indian Pipe Stem", text: "A white stem with no chlorophyll." },
    { title: "Forest Floor", text: "The decaying layer the plant grows from." },
    { title: "Mycorrhizal Fungi", text: "The network that carries sugars to the plant." },
    { title: "Host Tree Roots", text: "The tree that made those sugars." },
  ],
  moments: [
    {
      title: "A pale forest plant",
      summary: "Indian pipe rises from the forest floor.",
      caption: "A pale plant emerges from the forest floor.",
      points: ["Indian pipe has no chlorophyll, so it looks white.", "It grows from dark, rich soil.", "It cannot make food from sunlight."],
      labels: [
        part("indian_pipe_stem", "Indian Pipe Stem", "The waxy white stem of a plant that does not photosynthesize.", [
          "The stem stays white because it has no chlorophyll.",
          "It holds the flower above the leaf litter.",
          "Food has to arrive from somewhere else.",
        ]),
        part("forest_floor", "Forest Floor", "The decaying layer the plant grows out of.", [
          "Leaf litter and humus cover the soil.",
          "Fungi live throughout this layer.",
          "The plant's roots meet that fungal network here.",
        ]),
      ],
    },
    {
      title: "A hidden food network",
      summary: "Fungi carry sugars from a nearby tree.",
      caption: "A fungal network feeds the pale plant.",
      points: ["Fungi connect the plant to a nearby tree.", "The tree makes sugars by photosynthesis.", "The fungi pass some of those sugars to Indian pipe."],
      labels: [
        part("mycorrhizal_fungi", "Mycorrhizal Fungi", "The fungal threads that link the plant to a tree.", [
          "Their threads spread through the soil.",
          "They connect Indian pipe roots to tree roots.",
          "Sugars move across that link to the pale plant.",
        ]),
        part("host_tree_roots", "Host Tree Roots", "Roots of a nearby tree that made the sugars.", [
          "The tree's leaves make sugars in sunlight.",
          "Some of those sugars reach the roots.",
          "The fungi collect them and pass them on.",
        ]),
      ],
    },
  ],
});

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
  heartMock,
  plantMock,
];

const SAVED_VIDEO = "/generated/studio/1791914535838/video/lesson-1791914535838.mp4";
const SAVED_POSTER = "/generated/studio/1791914535838/video/lesson-1791914535838-poster.jpg";
const SAVED_STILL = "/generated/studio/1791914535838/moment-1-image-detail.png";

export function savedRocketSession() {
  const still = { id: "detail", kind: "detail", url: SAVED_STILL, error: null };
  return {
    id: "rocket-saved",
    topic: "Rocket Launch Mechanics",
    subject: "Space Science",
    learningGoal: "Understand how rocket engines generate thrust and lift a rocket off the launchpad.",
    concepts: [
      { title: "Combustion Chamber", text: "Where fuel and oxidizer burn to produce hot gases.", icon: "flame" },
      { title: "Thrust and Exhaust", text: "How escaping gases create an upward force.", icon: "zap" },
      { title: "Nozzle", text: "Accelerates exhaust as it leaves the engine.", icon: "layers" },
      { title: "Propellant Feed", text: "Moves fuel and oxidizer into the engine.", icon: "droplet" },
    ],
    subtitle: "Watch the engines light and the exhaust push the rocket up.",
    prompt: "Rocket Launch Mechanics",
    errors: [],
    moments: [
      {
        id: "moment_1",
        title: "Ignition and Liftoff",
        summary: "Fuel and oxidizer ignite inside the engine.",
        caption: "The engines push against the pad.",
        seekSec: 0,
        points: ["Fuel and oxidizer meet in the combustion chamber.", "Hot gas leaves through the nozzle at high speed."],
        facts: [
          ["Function", "Fuel and oxidizer meet in the combustion chamber and burn to create high-speed exhaust."],
          ["Material", "Hot gas leaves through the nozzle at very high speed."],
          ["Purpose", "The downward exhaust creates an upward force that lifts the rocket off the pad."],
        ],
        panels: {
          function: [
            { text: "Fuel and oxidizer mix and burn inside the combustion chamber." },
            { text: "Hot gases expand and accelerate as they pass through the nozzle." },
            { text: "The downward exhaust produces an upward force that lifts the rocket off the pad." },
          ],
          structure: [
            { name: "Combustion chamber", detail: "The shell that holds the burning gases." },
            { name: "Injector", detail: "Sprays fuel and oxidizer into the chamber." },
            { name: "Nozzle", detail: "The widening bell that speeds the exhaust and directs it downward." },
          ],
        },
        labels: [
          {
            id: "combustion_chamber",
            text: "Combustion Chamber",
            blurb: "Where fuel and oxidizer burn",
            facts: [
              ["Function", "Fuel and oxidizer mix and burn here, building hot high-pressure gas."],
              ["Material", "A strong metal shell that holds the flame."],
              ["Purpose", "Creates the pressure the nozzle turns into lift."],
            ],
            panels: {
              function: [
                { text: "Fuel and oxidizer spray in through the injector." },
                { text: "They ignite, and gas pressure climbs inside the shell." },
                { text: "The only way out is down, toward the nozzle." },
              ],
              structure: [
                { name: "Chamber wall", detail: "The shell that holds the burning gas." },
                { name: "Injector", detail: "Sprays fuel and oxidizer into the chamber." },
                { name: "Throat", detail: "The narrow opening that leads into the nozzle." },
              ],
            },
          },
          {
            id: "nozzle",
            text: "Nozzle",
            blurb: "Speeds the exhaust",
            facts: [
              ["Function", "Speeds the exhaust and aims it downward."],
              ["Material", "A heat-resistant bell that gets wider toward the exit."],
              ["Purpose", "Turns chamber pressure into the push that lifts the rocket."],
            ],
            panels: {
              function: [
                { text: "Hot gas enters through the narrow throat." },
                { text: "The widening bell lets the gas speed up as it leaves." },
                { text: "The downward stream pushes the rocket the other way." },
              ],
              structure: [
                { name: "Throat", detail: "The narrowest point the gas must pass." },
                { name: "Bell", detail: "The widening wall that accelerates the exhaust." },
                { name: "Exit", detail: "The rim where the plume leaves the engine." },
              ],
            },
          },
        ],
        images: [still],
      },
      {
        id: "moment_2",
        title: "Thrust builds",
        summary: "The exhaust plume shows the engine at work.",
        caption: "The plume drives the rocket up.",
        seekSec: 8,
        points: ["The exhaust plume is the visible result of the burn.", "As the plume stays strong, the rocket climbs."],
        facts: [
          ["Function", "Pumps keep fuel and oxidizer flowing so the burn stays strong."],
          ["Material", "The plume is burned propellant leaving the nozzle as flame and smoke."],
          ["Purpose", "A steady, fast plume keeps pushing the rocket upward."],
        ],
        panels: {
          function: [
            { text: "Pumps draw fuel and oxidizer from the tanks." },
            { text: "The feed raises their pressure so they can enter the burning chamber." },
            { text: "A steady flow keeps the plume strong and the rocket climbing." },
          ],
          structure: [
            { name: "Propellant feed", detail: "Pumps, pipes, and valves from the tanks to the chamber." },
            { name: "Nozzle throat", detail: "The narrow opening the gas passes through before it spreads." },
            { name: "Exhaust plume", detail: "Burned gas leaving the nozzle as flame and smoke." },
          ],
        },
        labels: [
          {
            id: "feed_system",
            text: "Propellant Feed",
            blurb: "Pumps and pipes to the engine",
            facts: [
              ["Function", "Keeps fuel and oxidizer flowing into the burning chamber."],
              ["Material", "Pumps, pipes, and valves between the tanks and the engine."],
              ["Purpose", "A steady feed keeps the plume from dying out."],
            ],
            panels: {
              function: [
                { text: "Pumps draw fuel and oxidizer out of the tanks." },
                { text: "Pipes carry them separately toward the chamber." },
                { text: "Valves open the path so the burn can continue." },
              ],
              structure: [
                { name: "Pumps", detail: "Force the propellants toward the engine." },
                { name: "Pipes", detail: "Carry fuel and oxidizer on separate lines." },
                { name: "Valves", detail: "Open or close the path into the chamber." },
              ],
            },
          },
          {
            id: "exhaust_plume",
            text: "Exhaust Plume",
            blurb: "Flame leaving the nozzle",
            facts: [
              ["Function", "The burned gas rushes out and pushes back on the rocket."],
              ["Material", "Hot exhaust, seen as flame and smoke."],
              ["Purpose", "The faster it leaves, the harder the rocket is pushed up."],
            ],
            panels: {
              function: [
                { text: "Burned propellant leaves the nozzle as a bright stream." },
                { text: "The stream stays aimed downward while the engine is firing." },
                { text: "That downward rush is what keeps the rocket climbing." },
              ],
              structure: [
                { name: "Core", detail: "The hottest gas straight out of the nozzle." },
                { name: "Edge", detail: "Where the plume mixes with the outside air." },
                { name: "Trail", detail: "The smoke that shows the path of the thrust." },
              ],
            },
          },
        ],
        images: [{ ...still, url: "/generated/studio/1791914535838/moment-2-image-detail.png" }],
      },
    ],
    video: {
      id: "studio-lesson",
      merged: true,
      title: "Rocket Launch Mechanics",
      url: SAVED_VIDEO,
      posterUrl: SAVED_POSTER,
      durationSeconds: 16,
      captions: [
        { atSec: 0, text: "The engines push against the pad" },
        { atSec: 8, text: "The plume drives the rocket up" },
      ],
    },
  };
}
