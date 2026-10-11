import { useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, CircleDot, Crop, History, Layers, Radio, Search, Shield, Sparkles, User, Zap, ZoomIn, ZoomOut } from "lucide-react";
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
const SUGGESTIONS = [
  { text: "How a nerve cell sends a signal", image: "/example-nerve.png" },
  { text: "How a rocket leaves the ground", image: "/example-rocket.png" },
  { text: "How the heart pumps blood", image: "/example-heart.png" },
  { text: "How a seed becomes a plant", image: "/example-seed.png" },
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
    <main className="flex h-screen flex-col overflow-hidden bg-black font-sans text-[#e8eaed]">
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
  const playbackRef = useRef(null);
  const momentIndexRef = useRef(0);

  const moment = session?.moments?.[momentIndex] || null;
  const images = moment?.images || [];
  const image = images[imageIndex] || images.find((item) => item.url) || null;
  const viewImage =
    panelView === "exploded" ? moment?.exploded : panelView === "inside" ? moment?.inside : image;
  const label = focus;

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
    setFocus(mock ? next.labels?.[0] || null : null);
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
      setFocus(mock ? next.labels?.[0] || null : null);
      setMessages([]);
    }
  }

  async function generate(event) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || busy || mock) return;
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
      setError(err.message);
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

  function newChat() {
    if (mock) return;
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

  const showWorkspace = Boolean(session) || busy;
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
    <main className="relative flex h-screen overflow-hidden bg-black font-sans text-[#e8eaed]">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3">
        <a href="/studio" className="flex items-center gap-2 text-lg font-black tracking-[-0.03em]" onClick={(event) => openStudioPath(event, "/studio")}>
          <img src="/curio-logo.png" alt="" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-[#5b8cff] via-[#c084fc] to-[#fb923c] bg-clip-text text-transparent">Curio</span>
        </a>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm font-black text-white/80 hover:bg-white/10"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
          >
            <History size={18} />
            History
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white"
            aria-label="Profile"
          >
            <User size={18} />
          </button>
        </div>
      </header>
      <form
        className={showWorkspace ? "border-b border-white/10 px-4 pb-3" : "flex w-full max-w-5xl flex-1 flex-col justify-center self-center px-4"}
        onSubmit={generate}
      >
        {!showWorkspace && (
          <div className="mb-6 text-center">
            <img src="/curio-logo.png" alt="" className="mx-auto mb-4 h-28 w-28" />
            <p className="m-0 text-2xl font-bold tracking-wide text-white">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-[#5b8cff] via-[#c084fc] to-[#fb923c] bg-clip-text text-4xl font-black text-transparent">Curio</span>
            </p>
            <p className="m-0 mt-2 text-sm font-bold text-white/70">Turn any topic into an interactive visual lesson</p>
          </div>
        )}
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 rounded-full border border-[#7c5cbf]/70 bg-[#0c0c14]/80 px-3 shadow-[0_0_28px_rgba(124,58,237,0.28)]">
          <Search size={18} className="ml-1 shrink-0 text-white/45" aria-hidden="true" />
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Explain how a rocket launch works…"
            className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-bold text-white outline-none placeholder:text-white/40"
          />
          <button
            type="submit"
            disabled={busy || mock || !prompt.trim()}
            className={`relative flex min-w-[7.5rem] items-center justify-center gap-1.5 overflow-hidden rounded-full bg-[#3b0764] px-4 py-2 text-sm font-black text-white ${busy ? "" : "disabled:opacity-40"}`}
          >
            {busy && (
              <span
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#7C3AED] to-[#a855f7]"
                style={{ width: `${progress}%` }}
              />
            )}
            {!busy && <span className="absolute inset-0 bg-gradient-to-r from-[#7C3AED] to-[#a855f7]" />}
            <span className="relative flex items-center gap-1.5">
              {!busy && <Sparkles size={14} />}
              {busy ? `${progress}%` : "Generate"}
            </span>
          </button>
        </div>
        {!showWorkspace && (
          <div className="mx-auto mt-8 w-full max-w-5xl">
            <p className="m-0 mb-3 text-sm font-bold text-white/55">Try an example</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.text}
                  type="button"
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-2 text-left hover:bg-white/10"
                  onClick={() => setPrompt(suggestion.text)}
                >
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {suggestion.image && <img src={suggestion.image} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold leading-snug">{suggestion.text}</span>
                  <ArrowRight size={16} className="shrink-0 text-white/45" />
                </button>
              ))}
            </div>
          </div>
        )}
        {mock && (
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs font-bold text-white/45">
            Mock lesson. Nothing is generated. Ask still talks to Gemini.
          </p>
        )}
      </form>

      {!showWorkspace && (
        <a
          href="/studio/mocks"
          onClick={(event) => openStudioPath(event, "/studio/mocks")}
          className="shrink-0 pb-6 text-center text-sm font-bold text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white"
        >
          See our generated mocks
        </a>
      )}

      {showWorkspace && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-3 overflow-hidden lg:grid-cols-[minmax(0,37fr)_minmax(0,39fr)_minmax(0,24fr)]">
          <section className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div>
              <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-white/45">Lesson video</p>
              <h2 className="m-0 mt-1 text-lg font-black">{session?.topic || "Building the lesson"}</h2>
              <p className="m-0 mt-1 text-sm font-bold leading-snug text-white/55">
                {session?.subtitle || moment?.caption || "A short lesson from your prompt."}
              </p>
              {notice && <p className="m-0 mt-1 text-sm font-bold text-[#c4b5fd]">{notice}</p>}
              {error && <p className="m-0 mt-1 text-sm font-bold text-[#f9a8d4]">{error}</p>}
            </div>
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
                <div className="grid aspect-video place-items-center rounded-xl bg-black/40 px-6 text-center text-sm font-bold text-white/60">
                {busy ? "The video appears after the stills." : "No video yet."}
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(session?.moments?.length ? session.moments : [0, 1, 2, 3, 4]).map((item, index) => {
                const active = index === momentIndex;
                const thumb = item?.images?.find((imageItem) => imageItem.url);
                return (
                  <button
                    key={item?.id || index}
                    type="button"
                    className={`w-28 shrink-0 overflow-hidden rounded-xl border text-left ${
                      active ? "border-[#7C3AED]" : "border-white/10"
                    }`}
                    onClick={() => applyMoment(index, true)}
                    disabled={!item?.id}
                  >
                    <div className="aspect-video bg-black">
                      {thumb?.url && <img src={thumb.url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className="block truncate px-2 pt-1 text-[0.72rem] font-extrabold">
                      {item?.title || `Moment ${index + 1}`}
                    </span>
                    <span className="block px-2 pb-1 text-[0.68rem] font-bold text-white/45">
                      {clock(item?.seekSec ?? index * 8)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div>
              <p className="m-0 text-sm font-black">Key concepts in this lesson</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(session?.moments || []).map((item, index) => {
                  const thumb = item.images?.find((imageItem) => imageItem.url);
                  const glow = [
                    "shadow-[0_0_14px_rgba(167,139,250,0.9)]",
                    "shadow-[0_0_14px_rgba(251,146,60,0.9)]",
                    "shadow-[0_0_14px_rgba(96,165,250,0.9)]",
                    "shadow-[0_0_14px_rgba(52,211,153,0.9)]",
                    "shadow-[0_0_14px_rgba(244,114,182,0.9)]",
                  ][index % 5];
                  return (
                    <button
                      key={item.id || index}
                      type="button"
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-2xl border bg-white/[0.04] px-2 py-2 text-left ${
                        index === momentIndex ? "border-white/25" : "border-white/10"
                      }`}
                      onClick={() => applyMoment(index, true)}
                    >
                      <span className={`h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black ${glow}`}>
                        {thumb?.url && <img src={thumb.url} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.72rem] font-black">{item.title}</span>
                        <span className="block truncate text-[0.65rem] font-bold text-white/45">
                          {item.points?.[0] || item.caption}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/45 p-3 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ["3D Model", "model"],
                ["Exploded View", "exploded"],
                ["Inside View", "inside"],
              ].map(([name, view]) => (
                <button
                  key={name}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    panelView === view ? "bg-gradient-to-r from-[#7C3AED] to-[#a855f7] text-white" : "text-white/45"
                  }`}
                  onClick={() => {
                    setPanelView(view);
                    setZoom(1);
                    setCropping(false);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2">
              {panelView === "model" && images.length > 0 && (
                <div className="flex shrink-0 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((item, index) => (
                    <button
                      key={`${item.id}-${index}`}
                      type="button"
                      className={`overflow-hidden rounded-lg border ${
                        index === imageIndex ? "border-[#a855f7]" : "border-white/10"
                      }`}
                      onClick={() => {
                        setImageIndex(index);
                        setZoom(1);
                        setCropping(false);
                      }}
                    >
                      {item.url ? (
                        <img src={item.url} alt="" className="h-14 w-14 object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 place-items-center text-[0.65rem] font-extrabold text-white/40">
                          {item.error ? "Failed" : busy ? "…" : index + 1}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl bg-black">
                {viewImage?.url ? (
                  <StillFrame
                    src={viewImage.url}
                    alt={moment?.title || "Lesson still"}
                    zoom={zoom}
                    cropping={cropping}
                    onCropped={addCrop}
                  />
                ) : (
                  <div className="grid h-full place-items-center px-4 text-center text-sm font-bold text-white/50">
                    {viewImage?.error || (busy ? "Gemini is drawing this view." : "Pick a moment.")}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#2a2a2a]/95 px-1.5 py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-white/10"
                      onClick={() => setZoom((value) => Math.max(0.6, Math.round((value - 0.2) * 10) / 10))}
                    >
                      <ZoomOut size={15} />
                      Zoom out
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white/90 hover:bg-white/10"
                      onClick={() => setZoom((value) => Math.min(2.4, Math.round((value + 0.2) * 10) / 10))}
                    >
                      <ZoomIn size={15} />
                      Zoom in
                    </button>
                    <button
                      type="button"
                      aria-pressed={cropping}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                        cropping ? "bg-white text-black" : "text-white/90 hover:bg-white/10"
                      }`}
                      onClick={() => setCropping((on) => !on)}
                    >
                      <Crop size={15} />
                      Crop
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {moment?.labels?.length > 0 && (
              <div>
                <p className="m-0 mb-2 text-xs font-extrabold uppercase tracking-[0.06em] text-white/45">Explore other parts</p>
                <div className="flex flex-wrap gap-2">
                  {moment.labels.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                        label?.id === part.id ? "bg-gradient-to-r from-[#7C3AED] to-[#a855f7] text-white" : "bg-white/10 text-white hover:bg-white/15"
                      }`}
                      onClick={() => choosePart(part)}
                    >
                      {part.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-start justify-between gap-2">
                <h3 className="m-0 text-lg font-black">{label?.text || "Ask about a part"}</h3>
                {label && (
                  <button
                    type="button"
                    className="rounded-full bg-white/10 px-2 py-1 text-xs font-black"
                    onClick={() => setFocus(null)}
                  >
                    Close
                  </button>
                )}
              </div>
              {(label?.imageUrl || viewImage?.url) && (
                <img
                  src={label?.imageUrl || viewImage.url}
                  alt=""
                  className="aspect-video w-full rounded-xl object-cover"
                />
              )}
              <div className="flex flex-wrap gap-2">
                {[
                  ["overview", "Overview"],
                  ["function", "Function"],
                  ["structure", "Structure"],
                  ["related", "Related"],
                ].map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                      detailTab === id ? "bg-gradient-to-r from-[#7C3AED] to-[#a855f7] text-white" : "text-white/45"
                    }`}
                    onClick={() => setDetailTab(id)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {detailTab === "overview" ? (
                <>
                  <p className="m-0 text-sm font-bold leading-relaxed text-white/80">
                    {label?.blurb || "Choose a part under the still. The explanation and questions stay in this column."}
                  </p>
                  {overviewLines(label, moment).length > 0 && (
                    <section className="grid gap-3 rounded-xl border border-white/10 bg-black p-3">
                      {overviewLines(label, moment).map((text, index) => (
                        <div key={text} className="flex items-center gap-3">
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black text-white ${STEP_COLORS[index % STEP_COLORS.length]}`}>
                            {index + 1}
                          </span>
                          <span className="text-sm font-bold leading-snug text-white/85">{text}</span>
                        </div>
                      ))}
                    </section>
                  )}
                  {label?.facts?.length > 0 && (
                    <section className="rounded-xl border border-white/10 p-3">
                      <h4 className="m-0 text-base font-black">Quick Facts</h4>
                      <table className="mt-2 w-full border-collapse text-sm">
                        <tbody>
                          {label.facts.map(([name, value]) => (
                            <tr key={name} className="border-t border-white/10">
                              <th className="py-2 pr-3 text-left font-bold text-white/45">{name}</th>
                              <td className="py-2 text-right font-bold text-white/85">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}
                </>
              ) : detailTab === "function" ? (
                <div className="grid gap-2">
                  {(label?.panels?.function || []).map((step, index) => {
                    const Icon = PART_ICONS[FUNCTION_ICONS[index % FUNCTION_ICONS.length]] || CircleDot;
                    return (
                      <article key={step.title} className="rounded-xl border border-white/10 bg-[#141414] p-3">
                        <div className="flex items-start gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7C3AED]/20 text-[#d8b4fe]">
                            <Icon size={16} strokeWidth={2.25} />
                          </span>
                          <div>
                            <h4 className="m-0 text-sm font-black">{step.title}</h4>
                            <p className="m-0 mt-1 text-sm font-bold leading-snug text-white/65">{step.text}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : detailTab === "structure" ? (
                <table className="w-full overflow-hidden rounded-xl border border-white/10 text-sm">
                  <tbody>
                    {structureRows(label).map((row, index) => (
                      <tr key={row.name} className="border-t border-black/40 first:border-t-0">
                        <th className={`w-[40%] px-3 py-3 text-left align-top font-black text-white ${TABLE_COLORS[index % TABLE_COLORS.length]}`}>
                          {row.name}
                        </th>
                        <td className="bg-black px-3 py-3 align-top font-bold leading-snug text-white/80">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="grid gap-2">
                  {(label?.panels?.related || []).map((step, index) => (
                    <article key={step.title} className="rounded-xl border border-white/10 bg-[#141414] p-3">
                      <div className="flex items-start gap-3">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black text-white ${STEP_COLORS[index % STEP_COLORS.length]}`}>
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="m-0 text-sm font-black">{step.title}</h4>
                          <p className="m-0 mt-1 text-sm font-bold leading-snug text-white/65">{step.text}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                {messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      msg.role === "user" ? "bg-white/10" : "bg-[#7C3AED]"
                    }`}
                  >
                    <p className="m-0">{msg.text}</p>
                    {msg.followUp && (
                      <button
                        type="button"
                        className="mt-2 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black"
                        onClick={() => askTutor(msg.followUp)}
                      >
                        Ask: {msg.followUp}
                      </button>
                    )}
                  </div>
                ))}
                {tutorBusy && <p className="m-0 text-sm font-bold text-[#d8b4fe]">Thinking…</p>}
              </div>
            </div>
            <form
              className="mt-auto flex shrink-0 flex-col gap-2 border-t border-white/10 pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                askTutor(question);
              }}
            >
              <p className="m-0 text-sm font-black">Ask about {label?.text || "a part"}</p>
              <div className="flex gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={label ? `How does ${label.text.toLowerCase()} start?` : "Select a part first"}
                disabled={tutorBusy || !label}
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-black px-3 py-2 text-sm font-bold outline-none"
              />
              <button
                type="submit"
                disabled={tutorBusy || !label || !question.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#a855f7] text-white disabled:opacity-40"
                aria-label="Ask"
              >
                <ArrowRight size={18} />
              </button>
              </div>
            </form>
          </aside>
          </div>
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
