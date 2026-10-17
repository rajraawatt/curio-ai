import { useEffect, useRef, useState } from "react";
import {
  Activity, ArrowRight, Atom, Bell, BookOpen, Box, ChevronLeft, ChevronRight, CircleDot, Clapperboard, Compass, Cpu, Crop, Download, Heart, House, Landmark, Layers, Leaf, Loader2, Menu, Palette, PanelLeft, PanelLeftClose, Pencil, Play, Radio, Rocket, Search, Share2, Shield, Sparkles, Star, Target, User, Zap, ZoomIn, ZoomOut,
} from "lucide-react";
import { LessonClipPlayer } from "./components/LessonClipPlayer.jsx";
import { studioMocks } from "./studioMock.js";

const STEP_COLORS = ["bg-[#2563eb]", "bg-[#16a34a]", "bg-[#d97706]", "bg-[#7c3aed]", "bg-[#0284c7]"];

const FUNCTION_ICONS = ["zap", "activity", "shield", "arrow", "radio", "layers"];
const TABLE_COLORS = ["bg-[#1d4ed8]", "bg-[#15803d]", "bg-[#b45309]", "bg-[#6d28d9]", "bg-[#0369a1]"];

function overviewLines(label, moment) {
  const saved = label?.highlights?.length
    ? label.highlights
    : moment?.points || [];
  return saved
    .map((item) => (typeof item === "string" ? item : item?.text))
    .filter(Boolean)
    .slice(0, 4);
}

function structureRows(label) {
  return (label?.panels?.structure || [])
    .map((row) => ({
      name: row.name || row.title,
      detail: row.detail || row.text,
    }))
    .filter((row) => row.name && row.detail);
}

const PART_ICONS = {
  zap: Zap,
  activity: Activity,
  shield: Shield,
  arrow: ArrowRight,
  radio: Radio,
  layers: Layers,
  dot: CircleDot,
};

const HISTORY_KEY = "curio-studio-history";
const SAVED_VIDEO = "/generated/studio/1791914535838/video/lesson-1791914535838.mp4";
const SAVED_POSTER = "/generated/studio/1791914535838/video/lesson-1791914535838-poster.jpg";
const SAVED_STILL = "/generated/studio/1791914535838/moment-1-image-detail.png";

function savedRocketSession() {
  const still = { id: "detail", kind: "detail", url: SAVED_STILL, error: null };
  return {
    id: "rocket-saved",
    topic: "Rocket Launch Mechanics",
    subject: "Space Science",
    learningGoal: "Understand how rocket engines generate thrust and lift a rocket off the launchpad.",
    concepts: [
      { title: "Combustion Chamber", text: "Where fuel and oxidizer burn to produce hot gases.", icon: "box" },
      { title: "Thrust and Exhaust", text: "How escaping gases create an upward force.", icon: "activity" },
      { title: "Nozzle", text: "Accelerates exhaust as it leaves the engine.", icon: "zap" },
      { title: "Propellant Feed", text: "Moves fuel and oxidizer into the engine.", icon: "layers" },
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

const SUGGESTIONS = [
  { text: "Rocket Launch Mechanics", image: "/example-rocket.png" },
  { text: "How a nerve cell sends a signal", image: "/example-nerve.png" },
  { text: "How the heart pumps blood", image: "/example-heart.png" },
  { text: "How a seed becomes a plant", image: "/example-seed.png" },
];
const IDEAS = ["How does a rocket work?", "Kanchivaram saree weaving", "Formation of mountains", "Life cycle of a butterfly"];
const TEMPLATES = [
  { title: "How Rockets Work", tags: ["3D Models", "Simulations"], image: "/example-rocket.png", prompt: "Rocket Launch Mechanics" },
  { title: "Kanchivaram Saree Weaving", tags: ["3D Models", "Real Videos"], image: "/example-nerve.png", prompt: "Kanchivaram saree weaving" },
  { title: "Inside a Human Heart", tags: ["3D Models", "Animations"], image: "/example-heart.png", prompt: "How the heart pumps blood" },
  { title: "How Mountains are Formed", tags: ["3D Models", "Exploded View"], image: "/example-seed.png", prompt: "Formation of mountains" },
];
const SUBJECTS = [
  ["Science", Atom],
  ["History & Culture", Landmark],
  ["Space & Astronomy", Rocket],
  ["Technology", Cpu],
  ["Nature & Environment", Leaf],
  ["Art & Design", Palette],
  ["Everyday Life", Heart],
];

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id) : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 24)));
}

async function readStudioStream(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let event = "message";
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      try {
        onEvent(event, JSON.parse(dataLines.join("\n")));
      } catch {
        // ignore a partial chunk
      }
    }
  }
}

function StillFrame({ src, alt, zoom, cropping, onCropped }) {
  const imgRef = useRef(null);
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [box, setBox] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [src]);

  function panLimit() {
    const frame = frameRef.current;
    if (!frame || zoom <= 1) return { x: 0, y: 0 };
    return {
      x: (frame.clientWidth * (zoom - 1)) / 2,
      y: (frame.clientHeight * (zoom - 1)) / 2,
    };
  }

  function clampPan(next) {
    const limit = panLimit();
    return {
      x: Math.min(limit.x, Math.max(-limit.x, next.x)),
      y: Math.min(limit.y, Math.max(-limit.y, next.y)),
    };
  }

  useEffect(() => {
    setPan((current) => clampPan(zoom <= 1 ? { x: 0, y: 0 } : current));
  }, [zoom]);

  function point(event) {
    const rect = frameRef.current.getBoundingClientRect();
    return {
      x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
      width: rect.width,
      height: rect.height,
    };
  }

  function toSource(x, y, width, height) {
    const img = imgRef.current;
    const fit = Math.min(width / img.naturalWidth, height / img.naturalHeight);
    const scale = fit * zoom;
    return {
      sx: (x - pan.x + (img.naturalWidth * scale - width) / 2) / scale,
      sy: (y - pan.y + (img.naturalHeight * scale - height) / 2) / scale,
    };
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (cropping) {
      const start = point(event);
      dragRef.current = { mode: "crop", ...start, box: null };
      setBox({ x: start.x, y: start.y, w: 0, h: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (zoom <= 1) return;
    dragRef.current = { mode: "pan", x: event.clientX, y: event.clientY, pan: { ...pan } };
    setPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === "pan") {
      setPan(clampPan({
        x: drag.pan.x + (event.clientX - drag.x),
        y: drag.pan.y + (event.clientY - drag.y),
      }));
      return;
    }
    const now = point(event);
    const next = {
      x: Math.min(drag.x, now.x),
      y: Math.min(drag.y, now.y),
      w: Math.abs(now.x - drag.x),
      h: Math.abs(now.y - drag.y),
    };
    dragRef.current.box = next;
    setBox(next);
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    setPanning(false);
    if (!drag || drag.mode === "pan") return;
    const region = drag.box;
    setBox(null);
    const img = imgRef.current;
    if (!region || region.w < 12 || region.h < 12 || !drag.width || !drag.height || !img?.naturalWidth) return;
    const start = toSource(region.x, region.y, drag.width, drag.height);
    const end = toSource(region.x + region.w, region.y + region.h, drag.width, drag.height);
    const sx = Math.max(0, Math.min(start.sx, end.sx));
    const sy = Math.max(0, Math.min(start.sy, end.sy));
    const sw = Math.min(img.naturalWidth - sx, Math.abs(end.sx - start.sx));
    const sh = Math.min(img.naturalHeight - sy, Math.abs(end.sy - start.sy));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    canvas.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onCropped(canvas.toDataURL("image/png"));
  }

  return (
    <div
      ref={frameRef}
      className={`relative h-full w-full overflow-hidden bg-black ${
        cropping ? "cursor-crosshair" : zoom > 1 ? (panning ? "cursor-grabbing" : "cursor-grab") : ""
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className="absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
        style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})` }}
      />
      {box && box.w > 0 && (
        <span
          className="pointer-events-none absolute border-2 border-[#7C3AED] bg-[#7C3AED]/25"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        />
      )}
    </div>
  );
}

function clock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function openStudioPath(event, href) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  if (window.location.pathname === href) return;
  window.history.pushState({}, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function MockPicker() {
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = "#000";
    return () => {
      document.body.style.background = previous;
    };
  }, []);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-black font-[Inter,sans-serif] text-[#e8eaed]">
      <header className="flex items-center px-4 py-3">
        <a
          href="/studio"
          className="flex items-center gap-2 text-lg font-black tracking-[-0.03em]"
          onClick={(event) => openStudioPath(event, "/studio")}
        >
          <img src="/curio-logo.png" alt="" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-[#5b8cff] via-[#c084fc] to-[#fb923c] bg-clip-text text-transparent">Curio</span>
        </a>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-16">
        <h1 className="m-0 text-center text-2xl font-black">Generated mocks</h1>
        <p className="m-0 mt-2 text-center text-sm font-bold text-white/55">Choose a lesson to open.</p>
        <div className="mt-6 grid gap-3">
          {studioMocks.map((item) => (
            <a
              key={item.id}
              href={`/studio/mock/${item.id}`}
              onClick={(event) => openStudioPath(event, `/studio/mock/${item.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-white no-underline hover:bg-white/10"
            >
              <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0 flex-1 text-sm font-black leading-snug">{item.name}</span>
              <ArrowRight size={16} className="shrink-0 text-white/45" />
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

export function Studio({ mockId = "" }) {
  const mockSession = studioMocks.find((item) => item.id === mockId)?.session || null;
  const mock = Boolean(mockSession);
  const [prompt, setPrompt] = useState(() => (mockSession ? mockSession.prompt : ""));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(() => mockSession);
  const [momentIndex, setMomentIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [focus, setFocus] = useState(() => (mockSession ? mockSession.moments[0].labels[0] : null));
  const [panelView, setPanelView] = useState("model");
  const [zoom, setZoom] = useState(1);
  const [detailTab, setDetailTab] = useState("overview");
  const [cropping, setCropping] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [tutorBusy, setTutorBusy] = useState(false);
  const [history, setHistory] = useState(() => readHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(true);
  const [learningStarted, setLearningStarted] = useState(true);
  const [watchMode, setWatchMode] = useState(false);
  const [homeNav, setHomeNav] = useState("create");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const askRef = useRef(null);
  const playbackRef = useRef(null);
  const momentIndexRef = useRef(0);

  const moment = session?.moments?.[momentIndex] || null;
  const images = moment?.images || [];
  const image = images[imageIndex] || images.find((item) => item.url) || null;
  const viewImage =
    panelView === "exploded" ? moment?.exploded : panelView === "inside" ? moment?.inside : image;
  const label = focus || moment?.labels?.[0] || null;

  useEffect(() => {
    const previous = document.body.style.background;
    const previousColor = document.body.style.color;
    document.body.style.background = "#000";
    document.body.style.color = "#e8eaed";
    return () => {
      document.body.style.background = previous;
      document.body.style.color = previousColor;
    };
  }, []);

  useEffect(() => {
    momentIndexRef.current = momentIndex;
  }, [momentIndex]);

  useEffect(() => {
    if (mock) return undefined;
    const onPop = () => {
      if (window.location.pathname === "/studio") {
        setSession(null);
        setWatchMode(false);
        setPrompt("");
        setNotice("");
        setError("");
        setBusy(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mock]);

  useEffect(() => {
    if (session?.id) setStructureOpen(true);
  }, [session?.id]);

  useEffect(() => {
    if (mock || window.location.pathname !== "/studio/watch") return;
    setWatchMode(true);
    setSession((current) => current || savedRocketSession());
  }, [mock]);

  useEffect(() => {
    if (mock) return;
    const next = session || watchMode ? "/studio/watch" : "/studio";
    const path = window.location.pathname;
    if (path !== "/studio" && path !== "/studio/watch") return;
    if (path === next) return;
    window.history.pushState({}, "", next);
  }, [session, watchMode, mock]);

  useEffect(() => {
    if (!session?.id || mock) return;
    setHistory((prev) => {
      const next = [session, ...prev.filter((item) => item.id !== session.id)].slice(0, 24);
      writeHistory(next);
      return next;
    });
  }, [session, mock]);

  function applyMoment(index, seek) {
    const next = session?.moments?.[index];
    if (!next) return;
    setMomentIndex(index);
    setImageIndex(0);
    setZoom(1);
    setCropping(false);
    setFocus(next.labels?.[0] || null);
    setMessages([]);
    setQuestion("");
    if (seek && next.seekSec != null) playbackRef.current?.seek(next.seekSec);
  }

  function onTime(time) {
    const moments = session?.moments || [];
    let index = -1;
    moments.forEach((item, i) => {
      if (item.seekSec != null && time + 0.05 >= item.seekSec) index = i;
    });
    if (index >= 0 && index !== momentIndexRef.current) {
      const next = moments[index];
      setMomentIndex(index);
      setImageIndex(0);
      setZoom(1);
      setCropping(false);
      setFocus(next.labels?.[0] || null);
      setMessages([]);
    }
  }

  async function generate(event, textOverride) {
    event?.preventDefault();
    const text = String(textOverride || prompt).trim();
    if (textOverride) setPrompt(textOverride);
    if (!text || busy || mock) return;
    setLearningStarted(true);
    setWatchMode(true);
    if (window.location.pathname !== "/studio/watch") {
      window.history.pushState({}, "", "/studio/watch");
    }
    setHistoryOpen(false);
    setPanelView("model");
    setBusy(true);
    setProgress(0);
    setError("");
    setNotice("Starting…");
    setSession(null);
    setMomentIndex(0);
    setImageIndex(0);
    setFocus(null);
    setZoom(1);
    setCropping(false);
    setMessages([]);
    if (/rocket/i.test(text)) {
      try {
        const res = await fetch("/api/studio/rocket-five-minute", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({ topic: text }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Lesson generation failed (${res.status})`);
        }
        let result = null;
        let streamError = "";
        await readStudioStream(res, (eventName, data) => {
          if (eventName === "status") {
            if (data.notice) setNotice(data.notice);
            if (data.progress != null) setProgress(Math.max(0, Math.min(100, Math.round(data.progress))));
          }
          if (eventName === "done" && data.result) result = data.result;
          if (eventName === "error") streamError = data.error || "Lesson generation failed";
        });
        if (streamError) throw new Error(streamError);
        if (!result?.video || !Array.isArray(result.moments)) {
          throw new Error("The server finished without returning a lesson video.");
        }
        const saved = savedRocketSession();
        setSession({
          ...saved,
          id: "rocket-five-minute",
          topic: text,
          prompt: text,
          subtitle: "A narrated lesson with clickable chapters.",
          video: result.video,
          moments: result.moments,
        });
        setMomentIndex(0);
        setImageIndex(0);
        setFocus(null);
        setNotice("Lesson ready");
      } catch (err) {
        setError(err.message || "Could not generate the lesson");
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Studio failed (${res.status})`);
      }
      await readStudioStream(res, (eventName, data) => {
        if (eventName === "status") {
          if (data.notice) setNotice(data.notice);
          if (data.progress != null) setProgress(Math.max(0, Math.min(100, Math.round(data.progress))));
        }
        if ((eventName === "session" || eventName === "done") && data.session) {
          setSession(data.session);
        }
        if (eventName === "error") setError(data.error || "Studio failed");
      });
    } catch (err) {
      const saved = savedRocketSession();
      setSession(saved);
      setFocus(saved.moments[0].labels[0]);
      setError("");
      setNotice("");
    } finally {
      setBusy(false);
    }
  }

  async function askTutor(text) {
    const ask = String(text || "").trim();
    if (!ask || !label || tutorBusy) return;
    const history = messages;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: ask }]);
    setTutorBusy(true);
    try {
      const res = await fetch("/api/model-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: ask,
          modelLabel: moment?.title,
          modelId: moment?.id,
          partId: label.id,
          partLabel: label.text,
          topic: session?.topic,
          reason: label.blurb,
          history,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tutor failed");
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, followUp: data.followUp }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: err.message }]);
    } finally {
      setTutorBusy(false);
    }
  }

  function openChat(item) {
    setSession(item);
    setPrompt(item.prompt || item.topic || "");
    setNotice("");
    setError("");
    setMomentIndex(0);
    setImageIndex(0);
    setFocus(null);
    setZoom(1);
    setCropping(false);
    setMessages([]);
    setQuestion("");
    setHistoryOpen(false);
  }

  function goLanding(event) {
    if (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
    }
    setBusy(false);
    setSession(null);
    setPrompt("");
    setNotice("");
    setError("");
    setMomentIndex(0);
    setImageIndex(0);
    setFocus(null);
    setZoom(1);
    setCropping(false);
    setMessages([]);
    setHistoryOpen(false);
    setAskOpen(false);
    setWatchMode(false);
    if (window.location.pathname !== "/studio") {
      window.history.pushState({}, "", "/studio");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  function newChat() {
    goLanding();
  }

  function choosePart(part) {
    setFocus(part);
    setDetailTab("overview");
    setMessages([]);
    setQuestion("");
  }

  function addCrop(imageUrl) {
    setCropping(false);
    setFocus({
      id: `crop-${Date.now()}`,
      text: "Selected region",
      blurb: `This is the area cropped from ${moment?.title || "the still"}.`,
      imageUrl,
    });
    setMessages([]);
    setQuestion("");
  }

  const showWorkspace = Boolean(session) || busy || watchMode;
  const clip = session?.video?.url
    ? {
        id: "studio-lesson",
        merged: true,
        title: session.topic,
        url: session.video.url,
        posterUrl: session.video.posterUrl,
        durationSeconds: session.video.durationSeconds,
        captions: session.video.captions,
        packId: "studio",
      }
    : null;
  return (
    <main className="relative flex h-screen overflow-hidden bg-black font-[Inter,sans-serif] text-[#e8eaed]">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3">
        <a href="/studio" className="flex items-center gap-2 text-lg font-black tracking-[-0.03em]" onClick={goLanding}>
          <img src="/curio-logo.png" alt="" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-[#5b8cff] via-[#c084fc] to-[#fb923c] bg-clip-text text-transparent">Curio</span>
        </a>
        <nav className="flex items-center gap-1 rounded-full bg-white/5 p-1">
          <a href="/studio" onClick={goLanding} className="flex items-center gap-1.5 rounded-full bg-[#4c1d95] px-3 py-1.5 text-xs font-black text-white">
            <House size={14} /> Home
          </a>
          <a href="/studio/mocks" onClick={(event) => openStudioPath(event, "/studio/mocks")} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10">
            <Compass size={14} /> Explore
          </a>
          <button type="button" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10" onClick={() => setHistoryOpen((open) => !open)}>
            <BookOpen size={14} /> My Learnings
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10" aria-label="History" onClick={() => setHistoryOpen((open) => !open)}>
            <Bell size={18} />
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white" aria-label="Profile">
            <User size={18} />
          </button>
        </div>
      </header>
      {!showWorkspace && (
        <div className="flex min-h-0 flex-1 overflow-hidden bg-[#070b16]">
          {sidebarOpen && (
            <button type="button" className="absolute inset-0 z-20 bg-black/50 md:hidden" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
          )}
          <aside className={`absolute z-30 flex h-full w-[280px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/10 bg-[#10162a] p-3 md:static ${sidebarOpen ? "flex" : "hidden md:flex"}`}>
            {[
              ["create", "Create with AI", Sparkles, () => { setHomeNav("create"); setSidebarOpen(false); }],
              ["templates", "Templates", Layers, () => { setHomeNav("templates"); document.getElementById("lesson-templates")?.scrollIntoView({ behavior: "smooth" }); setSidebarOpen(false); }],
              ["lessons", "My Lessons", BookOpen, () => { setHistoryOpen(true); setSidebarOpen(false); }],
              ["favorites", "Favorites", Star, () => { setHomeNav("favorites"); setHistoryOpen(true); setSidebarOpen(false); }],
            ].map(([id, name, Icon, action]) => (
              <button
                key={id}
                type="button"
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${id === "create" ? "bg-gradient-to-r from-[#7C3AED] to-[#c026d3] text-white" : homeNav === id ? "bg-[#2a2150] text-white" : "text-white/70 hover:bg-white/5"}`}
                onClick={action}
              >
                <Icon size={16} /> {name}
              </button>
            ))}
            <p className="mb-1 mt-5 px-3 text-[0.7rem] font-semibold uppercase tracking-wide text-white/40">Subjects</p>
            {SUBJECTS.map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium ${homeNav === name ? "bg-[#2a2150] text-white" : "text-white/75 hover:bg-white/5"}`}
                onClick={() => { setHomeNav(name); setPrompt(name); setSidebarOpen(false); }}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#241b45] text-[#c4b5fd]"><Icon size={14} /></span>
                {name}
              </button>
            ))}
          </aside>
          <form className="min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-10" onSubmit={generate}>
            <button type="button" className="mb-4 grid h-9 w-9 place-items-center rounded-lg border border-white/15 md:hidden" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <h1 className="m-0 text-[1.9rem] font-semibold text-white">Create a Lesson with AI</h1>
            <p className="m-0 mt-2 max-w-2xl text-[0.95rem] font-medium text-white/55">Turn any topic into an interactive learning experience with videos, 3D models and visual explanations.</p>
            <div className="mt-6 flex h-14 w-full min-w-0 items-center gap-2 rounded-full border border-[#7c5cbf]/80 bg-[#12162b] px-3 shadow-[0_0_24px_rgba(124,58,237,0.25)] focus-within:shadow-[0_0_28px_rgba(168,85,247,0.45)]">
              <Sparkles size={18} className="ml-1 shrink-0 text-[#c4b5fd]" />
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe what you want to teach..."
                className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-medium text-white outline-none placeholder:text-white/40"
              />
              <button type="submit" disabled={busy || mock || !prompt.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#7C3AED] to-[#c026d3] text-white disabled:opacity-40" aria-label="Create lesson">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
            </div>
            {error && <p className="m-0 mt-3 text-sm font-medium text-[#f9a8d4]">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {IDEAS.map((idea) => (
                <button key={idea} type="button" className="rounded-full border border-white/10 bg-[#1a1433] px-3 py-1.5 text-xs font-medium text-white/80 hover:border-[#a855f7]" onClick={() => generate({ preventDefault() {} }, idea)}>
                  {idea}
                </button>
              ))}
            </div>
            <div id="lesson-templates" className="mt-5 flex items-center justify-between">
              <p className="m-0 text-sm font-semibold text-white/80">Or try these ideas</p>
              <a href="/studio/mocks" onClick={(event) => openStudioPath(event, "/studio/mocks")} className="text-xs font-semibold text-[#c4b5fd]">View all</a>
            </div>
            <div className="mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TEMPLATES.map((item) => (
                <article key={item.title} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12162b]">
                  <img src={item.image} alt="" className="aspect-video w-full object-cover" />
                  <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
                    <h2 className="m-0 text-sm font-semibold leading-snug">{item.title}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/10 px-1.5 py-0.5 text-[0.62rem] font-medium text-white/60">{tag}</span>
                      ))}
                    </div>
                    <button type="button" className="mt-2 min-h-9 w-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#c026d3] px-3 text-xs font-semibold" onClick={() => generate({ preventDefault() {} }, item.prompt)}>
                      Use Template
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <ol className="m-0 mt-5 flex list-none flex-col gap-3 p-0 text-sm md:flex-row md:items-center">
              {[
                ["1", "Describe Topic", "Add a topic or concept"],
                ["2", "AI Builds Lesson", "Generates video, 3D models, and key moments"],
                ["3", "Explore & Learn", "Interact, ask questions, and go deeper"],
              ].map(([n, title, text], index) => (
                <li key={n} className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#5b21b6] text-xs font-semibold">{n}</span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-xs font-medium text-white/50">{text}</span>
                  </span>
                  {index < 2 && <ArrowRight size={14} className="hidden text-white/30 md:block" />}
                </li>
              ))}
            </ol>
          </form>
        </div>
      )}

      {showWorkspace && session && !busy && !learningStarted && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 flex items-center gap-2 text-2xl font-black">
                <Sparkles size={22} className="text-[#c084fc]" />
                Your Lesson is Ready!
              </h2>
              <p className="m-0 mt-1 text-lg font-black">{session.topic}</p>
              <p className="m-0 mt-1 text-sm font-bold text-white/60">{session.subtitle || session.prompt || "An interactive lesson from your topic."}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-black" onClick={() => setLearningStarted(true)}>
                <Pencil size={14} /> Edit Lesson
              </button>
              <button type="button" className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs font-black" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                <Share2 size={14} /> Share
              </button>
              <button type="button" className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#a855f7] px-4 py-2 text-sm font-black" onClick={() => setLearningStarted(true)}>
                Start Learning <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <section className="overflow-y-auto rounded-2xl border border-white/10 bg-[#12121c] p-3">
              <p className="m-0 text-sm font-black">Lesson Structure</p>
              <ol className="m-0 mt-3 grid list-none gap-2 p-0">
                {(session.moments || []).map((item, index) => {
                  const thumb = item.images?.find((imageItem) => imageItem.url);
                  return (
                    <li key={item.id || index} className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#7C3AED] text-xs font-black">{index + 1}</span>
                      <span className="h-8 w-10 shrink-0 overflow-hidden rounded-md bg-black">
                        {thumb?.url && <img src={thumb.url} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black">{item.title}</span>
                        <span className="block text-[0.65rem] font-bold text-white/40">{clock(item.seekSec)} – {clock(session?.moments?.[index + 1]?.seekSec ?? ((item.seekSec || 0) + (item.durationSeconds || 8)))}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section className="flex min-h-0 flex-col gap-3">
              <button type="button" className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black text-left" onClick={() => setLearningStarted(true)}>
                {session.video?.posterUrl || session.moments?.[0]?.images?.[0]?.url ? (
                  <img src={session.video?.posterUrl || session.moments[0].images[0].url} alt="" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-black/50 text-white"><Play size={28} /></span>
                </span>
                <span className="absolute bottom-4 left-4 right-4">
                  <span className="block text-sm font-bold">Moment 1</span>
                  <span className="block text-2xl font-black">{session.moments?.[0]?.title}</span>
                  <span className="mt-1 block max-w-lg text-sm font-bold text-white/80">{session.moments?.[0]?.caption}</span>
                  <span className="mt-2 block text-xs font-bold text-white/70">00:00 – {clock(session.video?.durationSeconds || 16)}</span>
                </span>
              </button>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {[
                  [Box, "3D Models", "Explore labelled parts"],
                  [Clapperboard, "Real Videos", "Saved lesson footage"],
                  [Shield, "Key Concepts", "Summaries and visuals"],
                  [Target, "Quiz & Challenges", "Test your understanding"],
                ].map(([Icon, title, text]) => (
                  <div key={title} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#12121c] px-3 py-2">
                    <Icon size={16} className="shrink-0 text-[#c084fc]" />
                    <span>
                      <span className="block text-xs font-black">{title}</span>
                      <span className="block text-[0.65rem] font-bold text-white/45">{text}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {showWorkspace && (busy || learningStarted) && (
        <div className={`relative grid min-h-0 w-full flex-1 gap-4 overflow-hidden p-4 ${
          structureOpen
            ? "grid-cols-1 min-[900px]:grid-cols-[280px_minmax(0,1fr)] min-[1200px]:grid-cols-[300px_minmax(0,1fr)_320px] min-[1440px]:grid-cols-[350px_minmax(0,1fr)_350px]"
            : "grid-cols-1 min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1440px]:grid-cols-[minmax(0,1fr)_350px]"
        }`}>
          {!structureOpen && (
            <button
              type="button"
              className="absolute left-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-[#12121c] text-white hover:bg-white/10"
              aria-label="Show lesson structure"
              onClick={() => setStructureOpen(true)}
            >
              <PanelLeft size={18} />
            </button>
          )}
          <section
            className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12121c] ${
              structureOpen ? "max-h-[46vh] min-[900px]:max-h-none" : "hidden"
            }`}
          >
            {structureOpen ? (
              <div className="flex min-h-0 w-full flex-1 flex-col">
              <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-3.5 [scrollbar-width:thin]">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 text-[0.68rem] font-medium text-white/45">{session?.subject || "Lesson"}</p>
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-white/70 hover:bg-white/10"
                      aria-label="Hide lesson structure"
                      onClick={() => setStructureOpen(false)}
                    >
                      <PanelLeftClose size={14} />
                    </button>
                  </div>
                  <h2 className="m-0 mt-1 text-base font-semibold leading-snug text-white">{session?.topic || "Building the lesson"}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#a855f7]"
                        style={{ width: busy && !session?.moments?.length ? `${progress}%` : `${((momentIndex + 1) / Math.max(session?.moments?.length || 1, 1)) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[0.65rem] font-medium text-white/50">{busy && !session?.moments?.length ? `${progress}%` : `${momentIndex + 1} / ${Math.max(session?.moments?.length || 0, 1)}`}</span>
                  </div>
                  {notice && <p className="m-0 mt-1 text-xs font-bold text-[#c4b5fd]">{notice}</p>}
                  {error && <p className="m-0 mt-1 text-xs font-bold text-[#f9a8d4]">{error}</p>}
                </div>
                {busy && !session?.moments?.length && (
                  <div className="flex items-center gap-2 text-sm font-bold text-white/60">
                    <Loader2 size={16} className="animate-spin" />
                    Building the lesson
                  </div>
                )}
                <ol className="m-0 grid list-none gap-1.5 p-0">
                  {(session?.moments?.length ? session.moments : []).map((item, index) => {
                    const thumb = item.images?.find((imageItem) => imageItem.url);
                    const active = index === momentIndex;
                    const done = index < momentIndex;
                    return (
                      <li key={item.id || index}>
                        <button
                          type="button"
                          className={`flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left ${active ? "bg-[#5b21b6]/70" : "hover:bg-white/5"}`}
                          onClick={() => applyMoment(index, true)}
                        >
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-semibold ${done ? "bg-emerald-500 text-white" : active ? "bg-[#7C3AED] text-white" : "bg-white/10 text-white/55"}`}>
                            {done ? "✓" : index + 1}
                          </span>
                          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-black">
                            {thumb?.url ? <img src={thumb.url} alt="" className="h-full w-full object-cover" /> : busy ? <Loader2 size={12} className="m-auto mt-3.5 animate-spin text-white/40" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[0.82rem] font-semibold leading-snug ${done ? "text-white/70" : "text-white"}`}>{item.title}</span>
                            <span className="block text-[0.75rem] font-medium leading-snug text-white/55">{item.summary || item.caption}</span>
                          </span>
                          <span className="shrink-0 text-[0.65rem] font-medium text-white/40">{clock(item.seekSec)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <div className="flex gap-2 rounded-xl border border-[#fb7185]/25 bg-[#1a1024] p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fb7185]/15 text-[#fb7185]">
                    <Target size={16} />
                  </span>
                  <div>
                    <p className="m-0 text-[0.8rem] font-semibold text-white">Learning Goal</p>
                    <p className="m-0 mt-1 text-[0.8rem] font-medium leading-snug text-white/60">{session?.learningGoal || session?.subtitle || "A short lesson from your prompt."}</p>
                  </div>
                </div>
                <div>
                  <p className="m-0 flex items-center gap-1.5 text-[0.8rem] font-semibold text-white">
                    <Sparkles size={13} className="text-[#c084fc]" /> Key Concepts
                  </p>
                  <ul className="m-0 mt-2.5 grid list-none gap-3 p-0">
                    {(session?.concepts?.length ? session.concepts : (session?.moments || []).slice(0, 4).map((item) => ({ title: item.title, text: item.summary || item.caption, icon: "box" }))).map((item, index) => {
                      const Icon = { box: Box, activity: Activity, zap: Zap, layers: Layers, target: Target }[item.icon] || Box;
                      const tone = ["text-[#c4b5fd] bg-[#3b1764]", "text-[#2dd4bf] bg-[#0f3d3a]", "text-[#93c5fd] bg-[#1e3a5f]", "text-[#fbbf24] bg-[#3f2e12]"][index % 4];
                      return (
                        <li key={item.title || index} className="flex items-start gap-2.5">
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[0.82rem] font-semibold leading-snug text-white">{item.title}</span>
                            <span className="block text-[0.75rem] font-medium leading-snug text-white/55">{item.text}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
                <a
                  href={session?.video?.url || undefined}
                  download
                  className={`m-3 flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#a855f7] px-3 py-2 text-sm font-semibold text-white ${session?.video?.url ? "" : "pointer-events-none opacity-40"}`}
                >
                  <Download size={16} />
                  Download
                </a>
              </div>
            ) : null}
          </section>

          <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
            <div className="relative min-h-0 w-full flex-1">
              {!structureOpen && (
                <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-xl">
                  <p className="m-0 text-xs font-bold text-white/80">Lesson</p>
                  <h2 className="m-0 text-2xl font-black">{session?.topic || "Building the lesson"}</h2>
                  <p className="m-0 mt-1 text-sm font-bold text-white/75">{session?.subtitle || moment?.caption}</p>
                </div>
              )}
              {clip ? (
                <LessonClipPlayer
                  clip={clip}
                  lang="en"
                  ageGroup="11-14"
                  captions
                  playbackRef={playbackRef}
                  onTime={onTime}
                  trackPlayback={false}
                  wide
                />
              ) : (
                <div className="grid h-full min-h-[240px] place-items-center rounded-2xl bg-black/40 text-sm font-bold text-white/60">
                  {busy ? (
                    <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Drawing the lesson video</span>
                  ) : (
                    <span className="max-w-md px-6 text-center">
                      {session?.errors?.[session.errors.length - 1] || "No video yet."}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 text-sm font-semibold">Chapters / Moments</p>
              {error && <p className="m-0 w-full text-xs font-medium text-[#f9a8d4]">{error}</p>}
              <button type="button" className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 min-[1200px]:hidden" onClick={() => setDetailsOpen(true)}>
                Moment details
              </button>
              <p className="m-0 text-xs font-bold text-white/50">{momentIndex + 1} / {Math.max(session?.moments?.length || 1, 1)}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(session?.moments?.length ? session.moments : [0, 1, 2, 3, 4]).map((item, index) => {
                const active = index === momentIndex;
                const thumb = item?.images?.find((imageItem) => imageItem.url);
                return (
                  <button
                    key={item?.id || index}
                    type="button"
                    className={`w-36 shrink-0 overflow-hidden rounded-xl border text-left ${active ? "border-[#a855f7]" : "border-white/10"}`}
                    onClick={() => applyMoment(index, true)}
                    disabled={!item?.id}
                  >
                    <div className="relative grid aspect-video place-items-center bg-black">
                      {thumb?.url ? <img src={thumb.url} alt="" className="h-full w-full object-cover" /> : busy ? <Loader2 size={16} className="animate-spin text-white/40" /> : null}
                      <span className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full text-[0.65rem] font-black text-white ${active ? "bg-[#7C3AED]" : "bg-black/70"}`}>{index + 1}</span>
                    </div>
                    <span className="block truncate px-2 pt-1 text-[0.72rem] font-extrabold">{item?.title || `Moment ${index + 1}`}</span>
                    <span className="block px-2 pb-1 text-[0.68rem] font-bold text-white/45">{clock(item?.seekSec ?? index * 8)} – {clock(session?.moments?.[index + 1]?.seekSec ?? (item?.seekSec ?? index * 8) + 8)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className={`${detailsOpen ? "fixed bottom-4 right-4 top-20 z-30 flex w-[min(350px,calc(100vw-2rem))]" : "hidden"} h-auto min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden rounded-2xl border border-[#2c3558] bg-[#12162b] p-3.5 shadow-2xl min-[1200px]:static min-[1200px]:flex min-[1200px]:h-full min-[1200px]:w-auto min-[1200px]:shadow-none`}>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-xs font-semibold text-white/55">Moment {momentIndex + 1} of {Math.max(session?.moments?.length || 1, 1)}</p>
                <button type="button" className="rounded-full px-2 py-1 text-xs font-semibold text-white/70 min-[1200px]:hidden" onClick={() => setDetailsOpen(false)}>Close</button>
                <div className="flex gap-1">
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-[#1a2038] text-white/80 disabled:opacity-30" aria-label="Previous moment" onClick={() => applyMoment(momentIndex - 1, true)} disabled={momentIndex <= 0}>
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-[#1a2038] text-white/80 disabled:opacity-30" aria-label="Next moment" onClick={() => applyMoment(momentIndex + 1, true)} disabled={!session?.moments || momentIndex >= session.moments.length - 1}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <h3 className="m-0 text-lg font-bold">{moment?.title || "This moment"}</h3>
              <p className="m-0 text-sm font-medium leading-snug text-white/70">{moment?.caption || "Labels appear on the still once this moment is ready."}</p>
              <div className="relative overflow-hidden rounded-xl bg-black">
                {viewImage?.url ? (
                  <img src={viewImage.url} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="grid aspect-video place-items-center text-sm font-medium text-white/50">
                    {busy ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading this still</span> : "Pick a moment."}
                  </div>
                )}
                {(moment?.labels || []).slice(0, 4).map((part, index) => {
                  const Icon = [Box, Activity, Zap, Target][index % 4];
                  const on = label?.id === part.id;
                  const place = [
                    { top: 10, left: 10 },
                    { top: 10, right: 10 },
                    { bottom: 10, left: 10 },
                    { bottom: 10, right: 10 },
                  ][index];
                  const hint = String(part.blurb || "").split(".")[0];
                  return (
                    <button
                      key={part.id}
                      type="button"
                      style={place}
                      className={`absolute flex max-w-[46%] items-center gap-2 rounded-xl border px-2 py-1.5 text-left shadow-lg backdrop-blur-md ${on ? "border-[#a855f7] bg-[#2a1248]/90" : "border-white/20 bg-[#12081c]/80"}`}
                      onClick={() => choosePart(part)}
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#7C3AED]/40 text-[#e9d5ff]">
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.72rem] font-semibold leading-snug">{part.text}</span>
                        <span className="line-clamp-2 block text-[0.62rem] font-medium leading-snug text-white/55">{hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {[["overview", "Overview"], ["function", "Function"], ["structure", "Structure"]].map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${detailTab === id ? "bg-gradient-to-r from-[#7C3AED] to-[#a855f7] text-white shadow-[0_0_16px_rgba(168,85,247,0.45)]" : "text-white/45"}`}
                    onClick={() => setDetailTab(id)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {detailTab === "overview" && (
                <div className="grid gap-3 border-t border-white/10 pt-3">
                  {(label?.facts?.length ? label.facts : moment?.facts || []).slice(0, 3).map((row, index) => {
                    const Icon = [Shield, Box, Target][index % 3];
                    const tone = ["bg-[#0f3d3a] text-[#2dd4bf]", "bg-[#3b1764] text-[#c4b5fd]", "bg-[#4c1d2e] text-[#fb7185]"][index % 3];
                    const name = Array.isArray(row) ? row[0] : row;
                    const value = Array.isArray(row) ? row[1] : row;
                    return (
                      <div key={`${name}-${index}`} className="flex items-start gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${tone}`}><Icon size={15} /></span>
                        <div>
                          <p className="m-0 text-[0.8rem] font-semibold text-white">{name}</p>
                          <p className="m-0 text-[0.75rem] font-medium leading-snug text-white/55">{value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {detailTab === "function" && (
                <div className="grid gap-3 border-t border-white/10 pt-3">
                  <p className="m-0 flex items-center gap-2 text-[0.8rem] font-semibold text-white">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0f3d3a] text-[#2dd4bf]"><Shield size={15} /></span>
                    Function
                  </p>
                  {(label?.panels?.function || moment?.panels?.function || []).map((step, index) => (
                    <div key={step.text} className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5b21b6] text-[0.75rem] font-semibold text-white">{index + 1}</span>
                      <p className="m-0 pt-1 text-[0.75rem] font-medium leading-snug text-white/55">{step.text}</p>
                    </div>
                  ))}
                  {!(label?.panels?.function || moment?.panels?.function)?.length && <p className="m-0 text-[0.75rem] font-medium text-white/45">Select a labelled part.</p>}
                </div>
              )}
              {detailTab === "structure" && (
                <div className="grid gap-3 border-t border-white/10 pt-3">
                  <p className="m-0 flex items-center gap-2 text-[0.8rem] font-semibold text-white">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3b1764] text-[#c4b5fd]"><Box size={15} /></span>
                    Structure
                  </p>
                  {(label?.panels?.structure?.length ? label.panels.structure : structureRows(label)).map((row, index) => (
                    <div key={row.name} className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#5b21b6] text-[0.75rem] font-semibold text-white">{index + 1}</span>
                      <p className="m-0 pt-1 text-[0.75rem] font-medium leading-snug text-white/55">
                        <span className="font-semibold text-white">{row.name}: </span>
                        {row.detail}
                      </p>
                    </div>
                  ))}
                  {!(label?.panels?.structure?.length || structureRows(label).length) && <p className="m-0 text-[0.75rem] font-medium text-white/45">Select a labelled part.</p>}
                </div>
              )}
              <div className="flex flex-col gap-2">
                {messages.map((msg, index) => (
                  <div key={`${msg.role}-${index}`} className={`rounded-xl px-3 py-2 text-sm font-bold ${msg.role === "user" ? "bg-white/10" : "bg-[#7C3AED]"}`}>
                    <p className="m-0">{msg.text}</p>
                  </div>
                ))}
                {tutorBusy && (
                  <p className="m-0 flex items-center gap-2 text-sm font-bold text-[#d8b4fe]">
                    <Loader2 size={14} className="animate-spin" /> Thinking
                  </p>
                )}
              </div>
            </div>
            {askOpen ? (
              <form
                className="flex shrink-0 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  askTutor(question);
                }}
              >
                <input
                  ref={askRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={label ? `Ask about ${label.text}` : "Select a part first"}
                  disabled={tutorBusy || !label}
                  className="min-w-0 flex-1 rounded-full border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none"
                />
                <button type="submit" disabled={tutorBusy || !label || !question.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#a855f7] disabled:opacity-40" aria-label="Ask">
                  <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="mt-auto flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#c026d3] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)]"
                onClick={() => {
                  if (!label && moment?.labels?.[0]) choosePart(moment.labels[0]);
                  setAskOpen(true);
                  setTimeout(() => askRef.current?.focus(), 0);
                }}
              >
                Ask Curio about this part
                <ArrowRight size={16} />
              </button>
            )}
          </aside>
        </div>
      )}

      {session?.errors?.length > 0 && (
        <p className="m-0 px-4 pb-3 text-xs font-bold text-[#f9a8d4]">{session.errors[session.errors.length - 1]}</p>
      )}
      </div>
      <aside
        className={`shrink-0 overflow-hidden border-white/10 bg-black transition-[width] duration-200 ${
          historyOpen ? "w-72 border-l" : "w-0"
        }`}
        aria-hidden={!historyOpen}
      >
        <div className="flex h-full w-72 flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <p className="m-0 text-sm font-black">Chats</p>
            <button
              type="button"
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black"
              onClick={() => setHistoryOpen(false)}
            >
              Hide
            </button>
          </div>
          <button
            type="button"
            className="mx-3 mb-3 rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-black"
            onClick={newChat}
          >
            New chat
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {history.length === 0 && (
              <p className="px-2 text-sm font-bold text-white/40">Lessons you generate show up here.</p>
            )}
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mb-1 w-full truncate rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-white/10 ${
                  item.id === session?.id ? "bg-white/10" : ""
                }`}
                onClick={() => openChat(item)}
              >
                {item.topic || item.prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
