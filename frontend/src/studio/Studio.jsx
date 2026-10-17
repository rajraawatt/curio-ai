import { useEffect, useRef, useState } from "react";
import {
  Activity, ArrowRight, AudioLines, BarChart3, BookOpen, Bookmark, Box, Check, ChevronLeft, ChevronRight, Clock, Crop, Download, Hand, History, House, Loader2, Lock, MoreHorizontal, PanelLeft, Pencil, Play, Plus, Search, Send, Share2, Sparkles, Star, Target, User, X, Zap, ZoomIn, ZoomOut,
} from "lucide-react";
import { LessonClipPlayer } from "./LessonClipPlayer.jsx";
import { savedRocketSession, studioMocks } from "./studioMock.js";
import { clearDraft, hasLessonAssets, readDraft, readHistory, readStarred, saveDraft, savedChat, storeChat, writeHistory, writeStarred } from "./storage.js";

function usesChapterFiles(session) {
  if (!session || session.id === "rocket-saved") return false;
  const lessonUrl = String(session.video?.url || "");
  if (lessonUrl.includes("/1791914535838/")) return false;
  if (session.moments?.some((moment) => moment.clip?.url)) return true;
  if (session.video?.voiced) return true;
  return /^\d+$/.test(String(session.id || "")) && (session.video?.durationSeconds || 0) > 16;
}

function chapterClipFor(session, index) {
  const moment = session?.moments?.[index];
  if (!moment) return null;
  if (!moment.clip?.url) {
    const start = moment.seekSec;
    const next = session.moments?.[index + 1]?.seekSec;
    const end = next != null ? next : session.video?.durationSeconds;
    if (start != null && end != null && end - start < 8) return null;
  }
  const saved = moment.clip?.url
    ? moment.clip.url
    : String(session.video?.url || "").includes("/video/lesson-")
      ? session.video.url.replace(/lesson-[^./?]+/, `chapter-${index + 1}`)
      : "";
  if (!saved) return null;
  const frames = Math.max((moment.images?.length || 1) - 1, 1);
  return {
    id: moment.id || `chapter-${index + 1}`,
    merged: false,
    voiced: true,
    title: moment.title,
    url: saved,
    posterUrl: moment.clip?.posterUrl || moment.images?.find((image) => image.url)?.url || null,
    durationSeconds: moment.clip?.durationSeconds || frames * 8,
    captions: moment.clip?.captions || [],
  };
}

function structureRows(label) {
  return (label?.panels?.structure || [])
    .map((row) => ({
      name: row.name || row.title,
      detail: row.detail || row.text,
    }))
    .filter((row) => row.name && row.detail);
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

function clock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function ReadyImage({ src, className = "absolute inset-0 h-full w-full object-cover", spin = false, size = 18 }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [src]);
  const showSpin = !ready && !failed && (spin || Boolean(src));
  return (
    <>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className={`${className} ${ready ? "" : "opacity-0"}`}
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {showSpin ? (
        <span className="absolute inset-0 z-10 grid place-items-center">
          <Loader2 size={size} className="animate-spin text-white/70" />
        </span>
      ) : null}
    </>
  );
}

function chapterSpan(item, next) {
  if (item?.clip?.durationSeconds) return item.clip.durationSeconds;
  if (item?.seconds) return item.seconds;
  if (next?.seekSec != null && item?.seekSec != null && next.seekSec > item.seekSec) return next.seekSec - item.seekSec;
  return 8;
}

function StudioProgress({ progress, notice, detail, dark }) {
  return (
    <div className={`relative h-12 overflow-hidden rounded-xl ${dark ? "bg-black/55" : "bg-white/10"}`}>
      <div className="absolute inset-y-0 left-0 bg-[#7C3AED] transition-[width] duration-300" style={{ width: `${progress}%` }} />
      <div className="relative flex h-full flex-col justify-center gap-0.5 px-3 text-[0.72rem] font-semibold leading-tight text-white">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate">{notice || "Planning"}</span>
          <span>{progress}%</span>
        </span>
        <span className="truncate text-[0.68rem] font-medium text-white/75">{detail || "Waiting for the first image"}</span>
      </div>
    </div>
  );
}

function shortSpan(seconds) {
  const total = Math.max(1, Math.round(Number(seconds) || 0));
  if (total < 60) return `${total} sec`;
  const minutes = Math.max(1, Math.round(total / 60));
  return `${minutes} min`;
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
  const [prompt, setPrompt] = useState(() => (mockSession ? mockSession.prompt : readDraft()?.session?.prompt || ""));
  const [busy, setBusy] = useState(() => !mockSession && Boolean(readDraft()?.busy));
  const [progress, setProgress] = useState(() => (!mockSession && readDraft()?.progress) || 0);
  const [notice, setNotice] = useState(() => (!mockSession && readDraft()?.notice) || "");
  const [statusLog, setStatusLog] = useState(() => {
    const saved = !mockSession && readDraft()?.log;
    return Array.isArray(saved) ? saved : [];
  });
  const [error, setError] = useState("");
  const [session, setSession] = useState(() => mockSession || (!mockId && readDraft()?.session) || null);
  const [momentIndex, setMomentIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [focus, setFocus] = useState(() => (mockSession ? mockSession.moments[0].labels[0] : null));
  const [panelView, setPanelView] = useState("model");
  const [zoom, setZoom] = useState(1);
  const [detailTab, setDetailTab] = useState("overview");
  const [functionStep, setFunctionStep] = useState(0);
  const [cropping, setCropping] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(() => savedChat(mockSession?.id || (!mockId && readDraft()?.session?.id)));
  const [tutorBusy, setTutorBusy] = useState(false);
  const [history, setHistory] = useState(() => readHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(true);
  const [sidebarsHidden, setSidebarsHidden] = useState(false);
  const [videoFull, setVideoFull] = useState(false);
  const [stillZoom, setStillZoom] = useState(false);
  const [stillPan, setStillPan] = useState({ x: 0, y: 0 });
  const [stillDragging, setStillDragging] = useState(false);
  const stillDrag = useRef(null);
  const structureWasOpen = useRef(true);
  const [starred, setStarred] = useState(() => readStarred());
  const [linkCopied, setLinkCopied] = useState(false);
  const [learningStarted, setLearningStarted] = useState(() => {
    if (mockSession) return false;
    const draft = readDraft();
    if (draft?.session) return Boolean(draft.learningStarted);
    return true;
  });
  const [lessonNote, setLessonNote] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [watchMode, setWatchMode] = useState(() => !mockSession && Boolean(readDraft()?.session));
  const [homeNav, setHomeNav] = useState("create");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const askRef = useRef(null);
  const chatEndRef = useRef(null);
  const agentRef = useRef(null);
  const [flight, setFlight] = useState(null);
  const playbackRef = useRef(null);
  const previewVideoRef = useRef(null);
  const momentIndexRef = useRef(0);
  const bridgeTimer = useRef(null);
  const handoffRef = useRef(false);
  const [bridge, setBridge] = useState(null);
  const [playToken, setPlayToken] = useState(0);

  const moment = session?.moments?.[momentIndex] || null;
  const images = moment?.images || [];
  const image = images[imageIndex]?.url ? images[imageIndex] : null;
  const viewImage =
    panelView === "exploded" ? moment?.exploded : panelView === "inside" ? moment?.inside : image;
  const label = focus || moment?.labels?.[0] || null;

  useEffect(() => {
    setStillPan({ x: 0, y: 0 });
  }, [viewImage?.url]);

  useEffect(() => {
    setFunctionStep(0);
  }, [label?.id, moment?.id]);

  useEffect(() => {
    if (!messages.length && !tutorBusy) return;
    const box = chatEndRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, tutorBusy]);

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
    if (!videoFull) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setVideoFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoFull]);

  useEffect(() => {
    if (!playToken) return undefined;
    const timer = window.setTimeout(() => playbackRef.current?.play(), 80);
    return () => window.clearTimeout(timer);
  }, [playToken]);

  useEffect(() => () => {
    if (bridgeTimer.current) window.clearTimeout(bridgeTimer.current);
  }, []);

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
    if (mock) return;
    if (!session?.id) {
      clearDraft();
      return;
    }
    saveDraft({ session, notice, progress, busy, learningStarted, log: statusLog });
  }, [session, notice, progress, busy, learningStarted, statusLog, mock]);

  useEffect(() => {
    if (mock || !busy) return undefined;
    const id = String(session?.id || "");
    if (!/^\d+$/.test(id)) return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/studio/session/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (stop) return;
        if (data.session) {
          setSession(data.session);
          const first = data.session.moments?.[0]?.labels?.[0];
          if (first) setFocus((current) => current || first);
        }
        if (data.notice) setNotice(data.notice);
        if (Array.isArray(data.log)) setStatusLog(data.log);
        if (data.progress != null) setProgress(Math.max(0, Math.min(100, Math.round(data.progress))));
        if (data.done) setBusy(false);
      } catch {
        // keep the last snapshot on screen
      }
    };
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [busy, session?.id, mock]);

  useEffect(() => {
    if (mock || !session?.id) return;
    storeChat(session.id, messages);
  }, [messages, session?.id, mock]);

  function applyMoment(index, seek) {
    const next = session?.moments?.[index];
    if (!next) return;
    if (bridgeTimer.current) {
      window.clearTimeout(bridgeTimer.current);
      bridgeTimer.current = null;
    }
    handoffRef.current = false;
    setBridge(null);
    setMomentIndex(index);
    setImageIndex(0);
    setZoom(1);
    setCropping(false);
    setFocus(next.labels?.[0] || null);
    setQuestion("");
    setPreviewPlaying(false);
    previewVideoRef.current?.pause();
    if (usesChapterFiles(session)) {
      setPlayToken((token) => token + 1);
      return;
    }
    if (seek && next.seekSec != null) playbackRef.current?.seek(next.seekSec);
  }

  function onTime(time) {
    if (usesChapterFiles(session)) {
      const chapter = session?.moments?.[momentIndexRef.current];
      const count = chapter?.images?.length || 1;
      const step = chapter?.clip?.stepSeconds || 8;
      const endAt = Math.max(count - 1, 0) * step;
      const frame = count > 1 && time >= endAt - 0.35
        ? count - 1
        : Math.min(Math.floor(Math.max(time, 0) / step), Math.max(count - 1, 0));
      setImageIndex((current) => (current === frame ? current : frame));
      return;
    }
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
    }
  }

  function onChapterEnded() {
    if (!usesChapterFiles(session) || handoffRef.current) return;
    handoffRef.current = true;
    const current = momentIndexRef.current;
    const moments = session?.moments || [];
    const next = moments[current + 1];
    if (!next || !chapterClipFor(session, current + 1)) {
      setBridge({ index: current, done: true });
      return;
    }
    setBridge({ index: current + 1, done: false });
    setMomentIndex(current + 1);
    setImageIndex(0);
    setZoom(1);
    setCropping(false);
    setFocus(next.labels?.[0] || null);
    if (bridgeTimer.current) window.clearTimeout(bridgeTimer.current);
    bridgeTimer.current = window.setTimeout(() => {
      bridgeTimer.current = null;
      handoffRef.current = false;
      setBridge(null);
      setPlayToken((token) => token + 1);
    }, 2500);
  }

  async function generate(event, textOverride) {
    event?.preventDefault();
    const text = String(textOverride || prompt).trim();
    if (textOverride) setPrompt(textOverride);
    if (!text || busy || mock) return;
    setLearningStarted(false);
    setWatchMode(true);
    if (window.location.pathname !== "/studio/watch") {
      window.history.pushState({}, "", "/studio/watch");
    }
    setHistoryOpen(false);
    setPanelView("model");
    setBusy(true);
    setProgress(0);
    setError("");
    setNotice("Planning");
    setStatusLog([]);
    setSession({
      id: `pending-${Date.now()}`,
      topic: text.slice(0, 120),
      subtitle: "Generating your lesson…",
      prompt: text,
      moments: [],
      concepts: [],
      video: null,
      learningGoal: "",
      errors: [],
    });
    setMomentIndex(0);
    setImageIndex(0);
    setFocus(null);
    setZoom(1);
    setCropping(false);
    setMessages([]);
    if (/rocket/i.test(text)) {
      const saved = savedRocketSession();
      setSession(saved);
      setFocus(saved.moments[0].labels[0]);
      setNotice("");
      setBusy(false);
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
          if (Array.isArray(data.log)) setStatusLog(data.log);
          if (data.progress != null) setProgress(Math.max(0, Math.min(100, Math.round(data.progress))));
          if (data.session) {
            setSession(data.session);
            const first = data.session.moments?.[0]?.labels?.[0];
            if (first) setFocus((current) => current || first);
          }
          if (data.done) setBusy(false);
        }
        if ((eventName === "session" || eventName === "done") && data.session) {
          setSession(data.session);
          if (data.done) setBusy(false);
        }
        if (eventName === "error") setError(data.error || "Studio failed");
      });
    } catch (err) {
      setError(err.message || "Studio failed");
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
    storeChat(session?.id, messages);
    setMessages(savedChat(item.id));
    setQuestion("");
    setHistoryOpen(false);
    setLearningStarted(true);
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
    storeChat(session?.id, messages);
    setMessages([]);
    setHistoryOpen(false);
    setWatchMode(false);
    clearDraft();
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
  }

  function addCrop(imageUrl) {
    setCropping(false);
    setFocus({
      id: `crop-${Date.now()}`,
      text: "Selected region",
      blurb: `This is the area cropped from ${moment?.title || "this moment"}.`,
      imageUrl,
    });
    setDetailTab("overview");
  }

  function clearCrop() {
    setFocus(moment?.labels?.[0] || null);
  }

  function receiveCrop({ url, from }) {
    const agent = agentRef.current?.getBoundingClientRect();
    const to = agent
      ? { x: agent.left + agent.width + 8, y: agent.top + 6, w: 64, h: 44 }
      : { x: from.x, y: from.y, w: 64, h: 44 };
    const id = Date.now();
    setFlight({ id, url, from, to, phase: "start" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlight((current) => (current && current.id === id ? { ...current, phase: "end" } : current));
      });
    });
    window.setTimeout(() => {
      setFlight((current) => (current && current.id === id ? null : current));
      addCrop(url);
      window.setTimeout(() => askRef.current?.focus(), 0);
    }, 680);
  }

  const showWorkspace = Boolean(session) || busy || watchMode;
  const chapterMode = usesChapterFiles(session);
  const activeChapter = chapterMode ? chapterClipFor(session, momentIndex) : null;
  const clip = chapterMode
    ? activeChapter
    : (session?.video?.url
      ? {
          id: "studio-lesson",
          merged: true,
          voiced: Boolean(session.video.voiced),
          title: session.topic,
          url: session.video.url,
          posterUrl: session.video.posterUrl,
          durationSeconds: session.video.durationSeconds,
          captions: session.video.captions,
          packId: "studio",
        }
      : null);
  const chapterStill = moment?.images?.find((item) => item.url)?.url || null;
  const bridgeMoment = bridge ? session?.moments?.[bridge.index] : null;
  return (
    <main className="relative flex h-screen overflow-hidden bg-black font-[Inter,sans-serif] text-[#e8eaed]">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      {!showWorkspace ? (
      <header className="flex items-center justify-between px-4 py-3 font-sans">
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
      ) : (
      <header className={`items-center justify-between px-4 py-3 ${videoFull ? "hidden" : "flex"}`}>
        <a href="/studio" className="flex items-center gap-2 text-lg font-black tracking-[-0.03em]" onClick={goLanding}>
          <img src="/curio-logo.png" alt="" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-[#5b8cff] via-[#c084fc] to-[#fb923c] bg-clip-text text-transparent">Curio</span>
        </a>
        <nav className="flex items-center gap-1 rounded-full bg-white/5 p-1">
          <a href="/studio" onClick={goLanding} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${historyOpen ? "text-white/70 hover:bg-white/10" : "bg-[#4c1d95] text-white"}`}>
            <House size={14} /> Home
          </a>
          <button type="button" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${historyOpen ? "bg-[#4c1d95] text-white" : "text-white/70 hover:bg-white/10"}`} onClick={() => setHistoryOpen((open) => !open)}>
            <BookOpen size={14} /> My Learnings
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10" aria-label="History" onClick={() => setHistoryOpen((open) => !open)}>
            <History size={18} />
          </button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-white/20 text-white" aria-label="Profile">
            <User size={18} />
          </button>
        </div>
      </header>
      )}
      {!showWorkspace && (
        <form className="flex w-full max-w-5xl flex-1 flex-col justify-center self-center px-4 font-sans" onSubmit={generate}>
          <div className="mb-6 text-center">
            <img src="/curio-welcome.png" alt="" className="mx-auto mb-4 h-36 w-36 object-contain" />
            <p className="m-0 text-2xl font-bold tracking-wide text-white">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-[#5b8cff] via-[#c084fc] to-[#fb923c] bg-clip-text text-4xl font-black text-transparent">Curio</span>
            </p>
            <p className="m-0 mt-2 text-sm font-bold text-white/70">Turn any topic into an interactive visual lesson</p>
          </div>
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
          <div className="mx-auto mt-8 w-full max-w-5xl">
            <p className="m-0 mb-3 text-sm font-bold text-white/55">Check our Generated mocks</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {studioMocks.map((item) => (
                <a
                  key={item.id}
                  href={`/studio/mock/${item.id}`}
                  onClick={(event) => openStudioPath(event, `/studio/mock/${item.id}`)}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-2 text-left text-white no-underline hover:bg-white/10"
                >
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold leading-snug">{item.name}</span>
                  <ArrowRight size={16} className="shrink-0 text-white/45" />
                </a>
              ))}
            </div>
          </div>
          {mock && (
            <p className="mx-auto mt-2 max-w-3xl text-center text-xs font-bold text-white/45">
              Mock lesson. Nothing is generated. Ask still talks to Gemini.
            </p>
          )}
        </form>
      )}
      {showWorkspace && !learningStarted && (busy || session) && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {busy && (
            <div className="shrink-0 px-4 pt-3">
              <StudioProgress progress={progress} notice={notice} detail={statusLog[statusLog.length - 1]} />
            </div>
          )}
          {error && !busy && <p className="m-0 shrink-0 px-4 pt-3 text-xs font-medium text-red-300">{error}</p>}
          <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-[380px] shrink-0 flex-col border-r border-white/10 bg-black px-4 py-5">
            <p className="m-0 text-base font-semibold">Lesson Structure</p>
            <p className="m-0 mt-1 text-xs font-medium text-white/40">{session.moments?.length || 0} chapters · {(() => {
              const total = session.video?.durationSeconds || (session.moments || []).reduce((sum, item, index, list) => sum + chapterSpan(item, list[index + 1]), 0);
              return total >= 60 ? `${Math.max(1, Math.round(total / 60))} min` : clock(total);
            })()}</p>
            <ol className="m-0 mt-4 min-h-0 flex-1 list-none overflow-y-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {busy && !(session.moments || []).length && (
                <li className="text-xs font-medium text-white/45">Planning the lesson structure…</li>
              )}
              {(session.moments || []).map((item, index, list) => {
                const active = index === momentIndex;
                const thumb = item.images?.find((image) => image.url)?.url;
                const span = Math.max(0, Math.round(chapterSpan(item, list[index + 1])));
                const lengthLabel = span >= 60 ? `${Math.max(1, Math.round(span / 60))} min` : `${span} sec`;
                const detail = item.summary || item.caption || item.points?.[0] || "";
                return (
                  <li key={item.id || index} className="flex items-stretch gap-3">
                    <span className="flex w-8 shrink-0 flex-col items-center">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-[#7C3AED] text-white" : "bg-[#2c2c3a] text-white/55"}`}>{index + 1}</span>
                      {index < list.length - 1 && <span className="my-1 w-px flex-1 bg-white/20" />}
                    </span>
                    <button type="button" className={`mb-3 flex min-w-0 flex-1 items-start gap-3 rounded-2xl p-2.5 text-left ${active ? "bg-[#2a1454]" : "hover:bg-white/[0.04]"}`} onClick={() => applyMoment(index, true)}>
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black">
                        <ReadyImage src={thumb} spin={busy} size={16} />
                      </span>
                      <span className="min-w-0 py-0.5">
                        <span className="block text-sm font-semibold leading-snug">{item.title}</span>
                        {detail && <span className="mt-1 line-clamp-3 block text-xs font-medium leading-snug text-white/55">{detail}</span>}
                        <span className="mt-1.5 flex items-center gap-1 text-[0.7rem] font-medium text-white/40"><Clock size={11} /> {lengthLabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-black px-4 py-3">
            <div className="sticky top-0 z-20 flex items-center gap-3 rounded-2xl border border-[#6d28d9]/40 bg-gradient-to-r from-[#2a1460] via-[#1a1038] to-[#120c24] px-3 py-3 shadow-[0_10px_40px_rgba(91,33,182,0.28)]">
              <img src="/curio-chat.png" alt="" className="h-20 w-24 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <h1 className="m-0 text-2xl font-black tracking-tight">{busy ? "Building your lesson" : "Your Lesson is Ready!"}</h1>
                <p className="m-0 mt-1 text-sm font-semibold text-white/90">{session.topic}</p>
                <p className="m-0 mt-0.5 truncate text-xs font-medium text-white/55">{session.subtitle || session.learningGoal || session.prompt}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" className={`flex items-center gap-1.5 rounded-full border bg-black/20 px-3.5 py-2 text-xs font-semibold ${editOpen ? "border-[#c084fc]" : "border-white/20"}`} onClick={() => setEditOpen((open) => !open)}>
                  <Pencil size={13} /> Edit Lesson
                </button>
                <button type="button" className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3.5 py-2 text-xs font-semibold" onClick={() => { navigator.clipboard?.writeText(window.location.href); setLinkCopied(true); window.setTimeout(() => setLinkCopied(false), 1600); }}>
                  <Share2 size={13} /> {linkCopied ? "Copied" : "Share"}
                </button>
                <button type="button" disabled={busy} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#a855f7] px-5 py-2.5 text-sm font-semibold shadow-[0_8px_24px_rgba(124,58,237,0.4)] disabled:opacity-45" onClick={() => {
                  setLearningStarted(true);
                  if (hasLessonAssets(session)) {
                    setHistory((prev) => {
                      const next = [session, ...prev.filter((item) => item.id !== session.id)].filter(hasLessonAssets).slice(0, 24);
                      writeHistory(next);
                      return next;
                    });
                  }
                }}>
                  Start Learning <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-[7rem] flex-1 overflow-hidden rounded-2xl bg-black">
              {clip?.url ? (
                <video
                  ref={previewVideoRef}
                  src={clip.url}
                  poster={session.moments?.[momentIndex]?.images?.find((image) => image.url)?.url || clip.posterUrl}
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover"
                  onTimeUpdate={(event) => {
                    const start = chapterMode ? 0 : (session.moments?.[momentIndex]?.seekSec ?? 0);
                    if (event.currentTarget.currentTime >= start + 5) {
                      event.currentTarget.pause();
                      setPreviewPlaying(false);
                    }
                  }}
                  onEnded={() => setPreviewPlaying(false)}
                />
              ) : null}
              {!previewPlaying && (
                <ReadyImage
                  src={session.moments?.[momentIndex]?.images?.find((image) => image.url)?.url || clip?.posterUrl}
                  spin={busy}
                  size={36}
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] backdrop-blur-2xl [mask-image:linear-gradient(to_top,black_28%,transparent)]" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black via-black/55 to-transparent" />
              {!previewPlaying && clip?.url && (
                <button
                  type="button"
                  className="absolute left-1/2 top-[38%] grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white"
                  aria-label="Play 5 second preview"
                  onClick={() => {
                    const video = previewVideoRef.current;
                    if (!video) return;
                    const start = chapterMode ? 0 : (session.moments?.[momentIndex]?.seekSec ?? 0);
                    video.currentTime = start;
                    video.play().then(() => setPreviewPlaying(true)).catch(() => {});
                  }}
                >
                  <Play size={28} className="ml-1" />
                </button>
              )}
              <div className="pointer-events-none absolute bottom-[4.75rem] left-4 right-4">
                <p className="m-0 text-sm font-medium text-white/80">Moment {momentIndex + 1}</p>
                <h2 className="m-0 mt-1 line-clamp-1 text-xl font-black">{session.moments?.[momentIndex]?.title || session.topic}</h2>
                <p className="m-0 mt-1 line-clamp-1 max-w-xl text-sm font-medium leading-snug text-white/85">{session.moments?.[momentIndex]?.caption || session.moments?.[momentIndex]?.summary}</p>
                <p className="m-0 mt-2 flex items-center gap-1.5 text-xs font-medium text-white/75">
                  <Clock size={13} />
                  {clock(session.moments?.[momentIndex]?.seekSec ?? momentIndex * 8)} – {clock(session.moments?.[momentIndex + 1]?.seekSec ?? (session.video?.durationSeconds || (session.moments?.[momentIndex]?.seekSec ?? 0) + 8))}
                </p>
              </div>
            </div>
            <div className="relative z-10 -mt-16 shrink-0">
              <div className="grid gap-3 min-[900px]:grid-cols-3">
                <section className="rounded-2xl border border-white/10 bg-[#14141f]/75 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <p className="m-0 flex items-center gap-2 text-sm font-semibold"><Target size={15} className="text-[#c084fc]" /> Learning Objectives</p>
                  <ul className="m-0 mt-3 grid list-none gap-2 p-0">
                    {(/rocket/i.test(session.topic || "")
                      ? ["Understand how rocket engines generate thrust", "Identify the main components and their functions", "Learn how a rocket overcomes gravity", "See real world examples"]
                      : [session.learningGoal, ...(session.moments || []).flatMap((item) => item.points || [])].filter(Boolean).slice(0, 4)
                    ).map((goal) => (
                      <li key={goal} className="flex items-start gap-2 text-xs font-medium leading-snug text-white/75"><Check size={13} className="mt-0.5 shrink-0 text-[#c084fc]" />{goal}</li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-2xl border border-white/10 bg-[#14141f]/75 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <p className="m-0 flex items-center gap-2 text-sm font-semibold"><BookOpen size={15} className="text-[#c084fc]" /> Key Concepts</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(session.concepts?.length
                      ? session.concepts.map((item) => item.title)
                      : [...new Set((session.moments || []).flatMap((item) => (item.labels || []).map((part) => part.text)))]
                    ).slice(0, 9).map((name) => (
                      <span key={name} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] font-medium text-white/80">{name}</span>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-white/10 bg-[#14141f]/75 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <p className="m-0 flex items-center gap-2 text-sm font-semibold"><BarChart3 size={15} className="text-[#c084fc]" /> You'll Practice</p>
                  <ul className="m-0 mt-3 grid list-none gap-2 p-0">
                    {(/rocket/i.test(session.topic || "")
                      ? ["Label the main components", "Answer interactive questions", "Apply concepts to real rockets", "Short quiz at the end"]
                      : ["Label the main parts", "Answer questions with Curio", "Follow each moment", "Review the key ideas"]
                    ).map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs font-medium leading-snug text-white/75"><Check size={13} className="mt-0.5 shrink-0 text-[#c084fc]" />{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
            </div>
            <div className="mt-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-sm font-semibold">Lesson Highlights</p>
                <p className="m-0 flex items-center gap-1 text-xs font-medium text-white/45">
                  <Clock size={12} />
                  {session.moments?.length || 0} chapters · {(() => {
                    const total = session.video?.durationSeconds || (session.moments || []).reduce((sum, item, index, list) => {
                      const start = item.seekSec ?? index * 8;
                      const end = list[index + 1]?.seekSec ?? start + 8;
                      return sum + Math.max(0, end - start);
                    }, 0);
                    return total >= 60 ? `${Math.max(1, Math.round(total / 60))} min` : clock(total);
                  })()}
                </p>
              </div>
              <div className="mt-2 flex gap-3">
                {(session.moments || []).map((item, index, list) => {
                  const active = index === momentIndex;
                  const thumb = item.images?.find((image) => image.url)?.url || session.video?.posterUrl;
                  const start = item.seekSec ?? index * 8;
                  const end = list[index + 1]?.seekSec ?? (session.video?.durationSeconds || start + 8);
                  const detail = item.caption || item.summary || item.points?.[0] || "";
                  return (
                    <button
                      key={item.id || index}
                      type="button"
                      className={`relative h-40 w-64 shrink-0 overflow-hidden rounded-2xl border text-left ${active ? "border-[#7C3AED]" : "border-white/15"}`}
                      onClick={() => applyMoment(index, true)}
                    >
                      <ReadyImage src={thumb} spin={busy} size={18} />
                      <span className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                      <span className={`absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${active ? "bg-[#7C3AED] text-white" : "bg-black/50 text-white/85"}`}>{index + 1}</span>
                      <span className="absolute bottom-3 left-3 right-3">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="mt-0.5 block text-[0.72rem] font-medium text-white/75">{clock(start)} – {clock(end)}</span>
                        {detail && <span className="mt-1 line-clamp-2 block text-[0.7rem] font-medium leading-snug text-white/65">{detail}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
          {editOpen && <aside className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-black p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#5b2a86] text-white"><Sparkles size={14} /></span>
              <p className="m-0 text-sm font-semibold">Edit with Curio</p>
            </div>
            <p className="m-0 mt-3 text-xs font-medium leading-snug text-white/45">Tell Curio what you want to change about this lesson. You can adjust the topic, depth, duration, or focus area.</p>
            <img src="/curio-reply.png" alt="" className="mx-auto mt-3 h-24 w-24 object-contain" />
            <p className="m-0 mt-3 text-xs font-semibold text-white/70">Try these suggestions:</p>
            <div className="mt-2 grid gap-2">
              {(session.id === "rocket-saved" || /rocket/i.test(session.topic || "")
                ? ["Make it simpler for middle school students", "Add more real world examples", "Focus more on the science behind thrust", "Make it shorter (5 minutes)"]
                : ["Make it simpler", "Add more real world examples", "Focus more on the main idea", "Make it shorter"]
              ).map((idea) => (
                <button key={idea} type="button" className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-left text-xs font-medium text-white/80" onClick={() => setLessonNote(idea)}>
                  {idea} <ArrowRight size={12} className="shrink-0 text-white/35" />
                </button>
              ))}
            </div>
            <form
              className="mt-auto flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2"
              onSubmit={(event) => {
                event.preventDefault();
                setLessonNote("");
              }}
            >
              <input value={lessonNote} onChange={(event) => setLessonNote(event.target.value)} placeholder="Ask Curio to modify this lesson..." className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-white/35" />
              <button type="submit" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7C3AED]" aria-label="Send edit">
                <Send size={14} />
              </button>
            </form>
          </aside>}
          </div>
        </div>
      )}

      {showWorkspace && learningStarted && (
        <div className={`relative grid min-h-0 w-full flex-1 gap-4 overflow-hidden p-4 ${videoFull ? "" : "pr-0"} ${
          videoFull
            ? "grid-cols-1"
            : sidebarsHidden || !structureOpen
            ? "grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_440px] min-[1440px]:grid-cols-[minmax(0,1fr)_500px]"
            : "grid-cols-1 min-[900px]:grid-cols-[300px_minmax(0,1fr)] min-[1200px]:grid-cols-[320px_minmax(0,1fr)_440px] min-[1440px]:grid-cols-[360px_minmax(0,1fr)_500px]"
        }`}>
          {!structureOpen && !sidebarsHidden && !videoFull && (
            <button
              type="button"
              className="absolute left-0 top-1/2 z-40 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#c026d3] text-white shadow-[0_0_16px_rgba(168,85,247,0.7)]"
              aria-label="Show lesson structure"
              onClick={() => setStructureOpen(true)}
            >
              <PanelLeft size={18} />
            </button>
          )}
          <section
            className={`relative flex min-h-0 min-w-0 flex-col overflow-visible bg-[#16141f] ${
              sidebarsHidden || videoFull ? "hidden" : structureOpen ? "max-h-[46vh] min-[900px]:max-h-none" : "hidden"
            }`}
          >
            {structureOpen && !sidebarsHidden && !videoFull && (
              <button
                type="button"
                className="absolute right-0 top-3 z-40 grid h-8 w-8 translate-x-1/2 place-items-center text-white"
                aria-label="Hide lesson structure"
                onClick={() => setStructureOpen(false)}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {structureOpen ? (() => {
              const moments = session?.moments || [];
              const total = Math.max(moments.length, 1);
              const progressPct = Math.round(((momentIndex + (busy ? 0 : 1)) / total) * 100);
              const duration = session?.video?.durationSeconds || moments.reduce((sum, item, index) => sum + chapterSpan(item, moments[index + 1]), 0);
              const elapsed = moments[momentIndex]?.seekSec || 0;
              const left = Math.max(0, duration - elapsed);
              const cover = session?.video?.posterUrl || moments[0]?.images?.find((imageItem) => imageItem.url)?.url;
              return (
              <div
                className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden bg-[#16141f] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                onScroll={(event) => {
                  const scroller = event.currentTarget;
                  const coverNode = scroller.querySelector("[data-lesson-cover]");
                  if (!coverNode) return;
                  const full = 320;
                  const collapsed = 148;
                  const shift = Math.min(scroller.scrollTop, full - collapsed);
                  const height = full - shift;
                  coverNode.style.height = `${height}px`;
                  coverNode.style.marginBottom = `${full - height}px`;
                }}
              >
              <div data-lesson-cover className="sticky top-0 z-20 h-[320px] overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 h-[320px]">
                  {cover ? (
                    <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[#2a1848]" />
                  )}
                  {cover && (
                    <img
                      src={cover}
                      alt=""
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full scale-110 object-cover blur-xl [mask-image:linear-gradient(to_top,#000_20%,transparent)]"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#16141f] via-[#16141f]/75 to-transparent" />
                  {busy && (
                    <div className="absolute inset-x-3 top-3 z-30">
                      <StudioProgress progress={progress} notice={notice} detail={statusLog[statusLog.length - 1]} dark />
                    </div>
                  )}
                  <div className={`relative flex items-start justify-between gap-2 px-3 ${busy ? "pt-16" : "pt-3"}`}>
                    <span className="flex items-center gap-1.5 rounded-full bg-[#6d28d9]/40 px-2.5 py-1 text-[0.68rem] font-semibold text-white shadow-lg backdrop-blur-sm">
                      <Play size={11} fill="currentColor" /> Lesson in Progress
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[0.68rem] font-medium text-white backdrop-blur-sm">
                      <Clock size={12} /> {shortSpan(left)} left
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3.5">
                    <h2 className="m-0 text-[1.35rem] font-bold leading-tight text-white">{session?.topic || "Building the lesson"}</h2>
                    <p className="m-0 mt-1.5 text-[0.78rem] font-medium leading-snug text-white/80">{session?.subtitle || session?.learningGoal || "A short lesson from your prompt."}</p>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-4 p-3">
                {!busy && (
                  <div className="flex items-center gap-3 px-1">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#d946ef]" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-white/80">{progressPct}%</span>
                  </div>
                )}
                {error && <p className="m-0 px-1 text-xs font-medium text-[#f9a8d4]">{error}</p>}
                {busy && !moments.length && (
                  <div className="flex items-center gap-2 px-1 text-sm font-medium text-white/60">
                    <Loader2 size={16} className="animate-spin" />
                    Building the lesson
                  </div>
                )}
                <ol className="m-0 grid list-none gap-1 p-0">
                  {moments.map((item, index) => {
                    const active = index === momentIndex;
                    const done = index < momentIndex;
                    const span = chapterSpan(item, moments[index + 1]);
                    const state = done ? "Watched" : active ? "In Progress" : "Locked";
                    const detail = item.summary || item.caption;
                    return (
                      <li key={item.id || index} className="relative">
                        {index < moments.length - 1 && (
                          <span className={`absolute left-[17px] top-10 bottom-0 w-px ${done ? "bg-[#22c55e]" : "bg-white/15"}`} />
                        )}
                        <button
                          type="button"
                          className={`relative flex w-full items-start gap-3 rounded-xl px-1 py-3 text-left ${active ? "bg-white/5" : ""}`}
                          onClick={() => applyMoment(index, true)}
                        >
                          <span className={`relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? "bg-[#22c55e] text-white" : active ? "bg-[#7C3AED] text-white shadow-[0_0_16px_rgba(168,85,247,0.85)]" : "border border-white/20 bg-[#1c1a24] text-white/45"}`}>
                            {done ? <Check size={15} strokeWidth={3} /> : active ? <Play size={14} fill="currentColor" className="ml-0.5" /> : <Lock size={13} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[0.98rem] font-semibold leading-snug ${done || active ? "text-white" : "text-white/45"}`}>{item.title}</span>
                            {detail && <span className="mt-1 block text-[0.78rem] font-medium leading-snug text-white/60">{detail}</span>}
                            <span className={`mt-1 block text-[0.72rem] font-medium ${active ? "text-[#c4b5fd]" : "text-white/40"}`}>{span > 0 ? shortSpan(span) : "0 sec"} • {state}</span>
                          </span>
                          {active && <AudioLines size={18} className="mt-1 shrink-0 text-[#c084fc]" />}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                <a
                  href={session?.video?.url || undefined}
                  download
                  className={`flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#a855f7] px-2 py-2.5 text-xs font-semibold text-white ${session?.video?.url ? "" : "pointer-events-none opacity-40"}`}
                >
                  <Download size={14} />
                  Download
                </a>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-2 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                  disabled={!session}
                  onClick={async () => {
                    const link = window.location.href;
                    try {
                      await navigator.clipboard.writeText(link);
                    } catch {
                      const input = document.createElement("textarea");
                      input.value = link;
                      document.body.appendChild(input);
                      input.select();
                      document.execCommand("copy");
                      input.remove();
                    }
                    setLinkCopied(true);
                    window.setTimeout(() => setLinkCopied(false), 1600);
                  }}
                >
                  <Share2 size={14} />
                  {linkCopied ? "Copied" : "Share"}
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-2 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                  disabled={!session?.id}
                  aria-label={starred.includes(session?.id) ? "Saved" : "Save lesson"}
                  onClick={() => {
                    if (!session?.id) return;
                    const on = starred.includes(session.id);
                    const nextStars = on ? starred.filter((id) => id !== session.id) : [session.id, ...starred.filter((id) => id !== session.id)];
                    writeStarred(nextStars);
                    setStarred(nextStars);
                    if (!on) {
                      setHistory((prev) => {
                        const next = [session, ...prev.filter((item) => item.id !== session.id)].slice(0, 24);
                        writeHistory(next);
                        return next;
                      });
                      setHistoryOpen(true);
                    }
                  }}
                >
                  <Bookmark size={14} className={starred.includes(session?.id) ? "fill-[#c084fc] text-[#c084fc]" : ""} />
                  Save
                </button>
              </div>
              </div>
              </div>
              );
            })() : null}
          </section>

          <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
            <div className="relative min-h-0 w-full flex-1">
              {!structureOpen && !sidebarsHidden && !videoFull && (
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
                  onPrevious={momentIndex > 0 ? () => applyMoment(momentIndex - 1, true) : undefined}
                  onNext={session?.moments && momentIndex < session.moments.length - 1 ? () => applyMoment(momentIndex + 1, true) : undefined}
                  onStretch={() => {
                    setSidebarsHidden((hidden) => {
                      if (!hidden) {
                        structureWasOpen.current = structureOpen;
                        setStructureOpen(false);
                        return true;
                      }
                      setStructureOpen(structureWasOpen.current);
                      return false;
                    });
                  }}
                  stretched={sidebarsHidden}
                  onZoom={() => setVideoFull((full) => !full)}
                  zoomed={videoFull}
                  onCrop={receiveCrop}
                  onEnded={onChapterEnded}
                  wide
                />
              ) : chapterMode && moment ? (
                <div className="relative grid h-full min-h-[240px] place-items-center overflow-hidden rounded-xl bg-black">
                  {chapterStill && <img src={chapterStill} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <p className="relative m-0 max-w-sm px-6 text-center text-sm font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">This chapter has no video yet.</p>
                </div>
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
              {bridge && bridgeMoment && (
                <div className="absolute inset-0 z-40 overflow-hidden rounded-xl bg-black">
                  {bridgeMoment.images?.find((image) => image.url)?.url && (
                    <img src={bridgeMoment.images.find((image) => image.url).url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="m-0 text-sm font-semibold text-white/75">{bridge.done ? "Lesson complete" : `Chapter ${bridge.index + 1}`}</p>
                    <h2 className="m-0 mt-1 text-3xl font-black">{bridgeMoment.title}</h2>
                    {bridgeMoment.caption && <p className="m-0 mt-2 max-w-xl text-sm font-medium leading-snug text-white/85">{bridgeMoment.caption}</p>}
                    {bridgeMoment.points?.length > 0 && (
                      <ul className="m-0 mt-3 grid max-w-xl list-none gap-1 p-0">
                        {bridgeMoment.points.slice(0, 3).map((point) => (
                          <li key={point} className="text-sm font-medium leading-snug text-white/75">{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className={`items-center justify-between gap-2 ${videoFull ? "hidden" : "flex"}`}>
              <p className="m-0 text-sm font-semibold">Moments</p>
              <button type="button" className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80 min-[1200px]:hidden" onClick={() => setDetailsOpen(true)}>
                Moment details
              </button>
              <p className="m-0 text-xs font-bold text-white/50">{(images.length ? imageIndex : momentIndex) + 1} / {Math.max(images.length || session?.moments?.length || 1, 1)}</p>
            </div>
            <div className={`gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${videoFull ? "hidden" : "flex"}`}>
              {(images.length ? images : [0, 1, 2, 3, 4]).map((item, index) => {
                const active = images.length ? index === imageIndex : index === momentIndex;
                const thumb = item?.url ? item : null;
                return (
                  <button
                    key={item?.id || index}
                    type="button"
                    className={`w-36 shrink-0 overflow-hidden rounded-xl border text-left ${active ? "border-[#a855f7]" : "border-white/10"}`}
                    onClick={() => {
                      if (!images.length) {
                        applyMoment(index, true);
                        return;
                      }
                      setImageIndex(index);
                      const at = index * (moment?.clip?.stepSeconds || 8);
                      playbackRef.current?.seek(index >= images.length - 1 ? Math.max(at - 0.3, 0) : at);
                    }}
                    disabled={images.length ? !moment : !item?.id}
                  >
                    <div className="relative grid aspect-video place-items-center bg-black">
                      {thumb?.url ? <img src={thumb.url} alt="" className="h-full w-full object-cover" /> : busy ? <Loader2 size={16} className="animate-spin text-white/40" /> : item?.error ? <span className="px-2 text-center text-[0.65rem] font-semibold text-white/45">Missed</span> : null}
                      <span className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full text-[0.65rem] font-black text-white ${active ? "bg-[#7C3AED]" : "bg-black/70"}`}>{index + 1}</span>
                    </div>
                    <span className="block px-2 py-1 text-[0.68rem] font-bold text-white/45">{clock(images.length ? index * (moment?.clip?.stepSeconds || 8) : (item?.seekSec ?? index * 8))}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className={`${videoFull ? "hidden" : detailsOpen ? "fixed bottom-0 right-0 top-16 z-30 flex w-[min(440px,100vw)]" : "hidden"} h-auto min-h-0 min-w-0 flex-col overflow-hidden bg-[#07070f] ${videoFull ? "" : "min-[900px]:static min-[900px]:flex min-[900px]:h-full min-[900px]:w-auto"}`}>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div
                className={`group relative aspect-video w-full shrink-0 touch-none overflow-hidden bg-black ${stillZoom ? (stillDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"}`}
                onPointerDown={(event) => {
                  if (!stillZoom || event.target.closest("button")) return;
                  const box = event.currentTarget.getBoundingClientRect();
                  stillDrag.current = { x: event.clientX, y: event.clientY, panX: stillPan.x, panY: stillPan.y, box };
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setStillDragging(true);
                }}
                onPointerMove={(event) => {
                  const drag = stillDrag.current;
                  if (!drag) return;
                  const maxX = drag.box.width * 0.25;
                  const maxY = drag.box.height * 0.25;
                  const x = Math.max(-maxX, Math.min(maxX, drag.panX + event.clientX - drag.x));
                  const y = Math.max(-maxY, Math.min(maxY, drag.panY + event.clientY - drag.y));
                  setStillPan({ x, y });
                }}
                onPointerUp={() => {
                  stillDrag.current = null;
                  setStillDragging(false);
                }}
                onPointerCancel={() => {
                  stillDrag.current = null;
                  setStillDragging(false);
                }}
              >
                {viewImage?.url ? (
                  <img
                    src={viewImage.url}
                    alt=""
                    draggable={false}
                    className={`h-full w-full object-cover ${stillDragging ? "" : "transition-transform duration-300"}`}
                    style={{ transform: stillZoom ? `translate(${stillPan.x}px, ${stillPan.y}px) scale(1.5)` : "scale(1)" }}
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm font-medium text-white/50">
                    {busy ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading this still</span> : "Pick a moment."}
                  </div>
                )}
                {!stillDragging && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Hand size={20} />
                  </span>
                )}
                <button
                  type="button"
                  className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-black/45 text-white backdrop-blur-sm"
                  aria-label={stillZoom ? "Shrink image" : "Zoom image"}
                  onClick={() => {
                    setStillZoom((zoom) => !zoom);
                    setStillPan({ x: 0, y: 0 });
                  }}
                >
                  {stillZoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
                {[["overview", "Overview"], ["function", "Function"], ["structure", "Structure"]].map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${detailTab === id ? "bg-[#7C3AED] text-white" : "text-white/55"}`}
                    onClick={() => setDetailTab(id)}
                  >
                    {name}
                  </button>
                ))}
                <div className="ml-auto flex items-center rounded-xl border border-white/10 bg-white/[0.03]">
                  <button type="button" className="grid h-8 w-8 place-items-center text-white/70 disabled:opacity-30" aria-label="Previous moment" onClick={() => applyMoment(momentIndex - 1, true)} disabled={momentIndex <= 0}>
                    <ChevronLeft size={15} />
                  </button>
                  <span className="min-w-8 text-center text-xs font-semibold text-white/80">{momentIndex + 1} / {Math.max(session?.moments?.length || 1, 1)}</span>
                  <button type="button" className="grid h-8 w-8 place-items-center text-white/70 disabled:opacity-30" aria-label="Next moment" onClick={() => applyMoment(momentIndex + 1, true)} disabled={!session?.moments || momentIndex >= session.moments.length - 1}>
                    <ChevronRight size={15} />
                  </button>
                </div>
                <button type="button" className="rounded-full px-2 py-1 text-xs font-semibold text-white/70 min-[900px]:hidden" onClick={() => setDetailsOpen(false)}>Close</button>
              </div>
              {detailTab === "overview" && (
                <div className="grid shrink-0 gap-3 px-4 pt-2">
                  <div>
                    <p className="m-0 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">Key moment {momentIndex + 1}</p>
                    <h3 className="m-0 mt-1 text-2xl font-bold tracking-tight">{moment?.title || "This moment"}</h3>
                    <p className="m-0 mt-1 text-sm font-medium leading-snug text-white/60">{moment?.caption || "Labels appear on the still once this moment is ready."}</p>
                  </div>
                  <div className="grid gap-2">
                    {(moment?.labels || []).map((part, index) => {
                      const Icon = [Box, Activity, Zap, Target][index % 4];
                      const on = label?.id === part.id;
                      return (
                        <button
                          key={part.id}
                          type="button"
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left ${on ? "border-[#7C3AED]/70 bg-white/[0.04]" : "border-white/10 bg-transparent"}`}
                          onClick={() => choosePart(part)}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#5b2a86] text-white">
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-snug">{part.text}</span>
                            {part.blurb && <span className="mt-0.5 block text-xs font-medium leading-snug text-white/50">{part.blurb}</span>}
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-white/35" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {detailTab === "function" && (() => {
                const steps = label?.panels?.function || moment?.panels?.function || [];
                const active = Math.min(functionStep, Math.max(steps.length - 1, 0));
                const functionFact = (label?.facts || moment?.facts || []).find((row) => Array.isArray(row) && /function/i.test(String(row[0])));
                const lead = functionFact?.[1] || label?.blurb || moment?.caption;
                return (
                  <div className="shrink-0 px-4 pt-3">
                    {lead && <p className="m-0 text-sm font-medium leading-snug text-white/55">{lead}</p>}
                    {steps.length > 0 ? (
                      <div className="mt-4 border-t border-white/10 pt-5">
                        <div className="flex items-end justify-between gap-3">
                          <h3 className="m-0 text-2xl font-bold tracking-tight">How it works</h3>
                          <p className="m-0 flex shrink-0 items-center gap-2 pb-1 text-xs font-medium text-white/45">
                            Step {active + 1} of {steps.length}
                            <span className="flex items-center gap-1">
                              {steps.map((step, index) => (
                                <button
                                  key={step.text}
                                  type="button"
                                  aria-label={`Step ${index + 1}`}
                                  className={`h-2 w-2 rounded-full ${index === active ? "bg-[#7C3AED]" : "bg-white/20"}`}
                                  onClick={() => setFunctionStep(index)}
                                />
                              ))}
                            </span>
                          </p>
                        </div>
                        <div className="mt-6">
                          {steps.map((step, index) => (
                            <button
                              key={step.text}
                              type="button"
                              className="flex w-full gap-4 text-left"
                              onClick={() => setFunctionStep(index)}
                            >
                              <span className="flex w-9 shrink-0 flex-col items-center">
                                <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white ${index === active ? "bg-[#7C3AED]" : "bg-[#4c1d95]"}`}>{index + 1}</span>
                                {index < steps.length - 1 && <span className="my-1 min-h-5 w-px flex-1 border-l border-dashed border-white/25" />}
                              </span>
                              <span className={`min-w-0 flex-1 pt-1.5 text-sm font-medium leading-snug ${index === active ? "text-white" : "text-white/75"} ${index < steps.length - 1 ? "mb-1 border-b border-white/10 pb-4" : "pb-2"}`}>
                                {step.text}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="m-0 mt-4 text-sm font-medium text-white/45">Select a labelled part.</p>
                    )}
                  </div>
                );
              })()}
              {detailTab === "structure" && (
                <div className="grid shrink-0 gap-2 px-4 pt-3">
                  {(label?.panels?.structure?.length ? label.panels.structure : structureRows(label)).map((row) => (
                    <div key={row.name} className="rounded-2xl border border-white/10 px-3 py-2.5">
                      <p className="m-0 text-sm font-semibold">{row.name}</p>
                      <p className="m-0 mt-0.5 text-xs font-medium leading-snug text-white/50">{row.detail}</p>
                    </div>
                  ))}
                  {!(label?.panels?.structure?.length || structureRows(label).length) && <p className="m-0 text-sm font-medium text-white/45">Select a labelled part.</p>}
                </div>
              )}
            </div>
            <div className={`relative mx-3 mb-3 mt-auto flex min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12101c] p-3 ${messages.length || tutorBusy ? "max-h-[58%] min-h-[12rem]" : ""}`}>
              <div className={`flex items-center ${messages.length || tutorBusy ? "gap-2" : "gap-3"}`}>
                <img ref={agentRef} src={messages.length || tutorBusy ? "/curio-chat.png" : "/curio-agent.png"} alt="" className={`shrink-0 object-contain ${messages.length || tutorBusy ? "h-8 w-10" : "h-12 w-12"}`} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold">Ask Curio</p>
                  {!(messages.length || tutorBusy) && (
                    <p className="m-0 text-xs font-medium text-white/45">{label?.imageUrl ? "Ask about this cropped moment" : "Ask anything about this part"}</p>
                  )}
                </div>
                {label?.imageUrl && (
                  <span className="relative shrink-0">
                    <img src={label.imageUrl} alt="" className="h-8 w-12 rounded-md object-cover ring-1 ring-[#7C3AED]" />
                    <button
                      type="button"
                      className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-white text-black"
                      aria-label="Remove cropped section"
                      onClick={clearCrop}
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </span>
                )}
              </div>
              {(messages.length > 0 || tutorBusy) && (
                <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {messages.map((msg, index) => (
                    msg.role === "user" ? (
                      <div key={`${msg.role}-${index}`} className="flex items-start justify-end gap-2">
                        <p className="m-0 max-w-[80%] rounded-2xl rounded-br-md border border-white/10 bg-[#2a2148] px-3 py-2 text-sm font-medium leading-snug">{msg.text}</p>
                        <span className="h-7 w-7 shrink-0 rounded-full border border-white/15 bg-white/[0.03]" />
                      </div>
                    ) : (
                      <div key={`${msg.role}-${index}`} className="flex items-start gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[#1a1030]">
                          <img src="/curio-reply.png" alt="" className="h-full w-full object-contain" />
                        </span>
                        <p className="m-0 max-w-[85%] rounded-2xl rounded-tl-md border border-white/10 bg-[#16122a] px-3 py-2.5 text-sm font-medium leading-relaxed text-white/90">{msg.text}</p>
                      </div>
                    )
                  ))}
                  {tutorBusy && (
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-[#1a1030]">
                        <img src="/curio-reply.png" alt="" className="h-full w-full object-contain" />
                      </span>
                      <p className="m-0 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#16122a] px-3 py-2 text-sm font-medium text-white/70">
                        <Loader2 size={14} className="animate-spin" /> Thinking
                      </p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
              <form
                className="mt-2 flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 px-2 py-1.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!label && moment?.labels?.[0]) choosePart(moment.labels[0]);
                  askTutor(question);
                }}
              >
                <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-white/70" aria-label="Add" onClick={() => askRef.current?.focus()}>
                  <Plus size={16} />
                </button>
                <input
                  ref={askRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={label?.imageUrl ? "Ask Curio about this crop..." : "Ask Curio anything about this part..."}
                  disabled={tutorBusy || !label}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-white/35"
                />
                <button type="submit" disabled={tutorBusy || !label || !question.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7C3AED] text-white disabled:opacity-40" aria-label="Ask">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {flight && (
        <img
          src={flight.url}
          alt=""
          className="pointer-events-none fixed z-[90] rounded-md object-cover shadow-[0_10px_28px_rgba(124,58,237,0.5)]"
          style={{
            left: flight.phase === "end" ? flight.to.x : flight.from.x,
            top: flight.phase === "end" ? flight.to.y : flight.from.y,
            width: flight.phase === "end" ? flight.to.w : flight.from.w,
            height: flight.phase === "end" ? flight.to.h : flight.from.h,
            transition: "left 640ms ease, top 640ms ease, width 640ms ease, height 640ms ease",
          }}
        />
      )}
      {session?.errors?.length > 0 && (
        <p className="m-0 px-4 pb-3 text-xs font-bold text-[#f9a8d4]">{session.errors[session.errors.length - 1]}</p>
      )}
      </div>
      <aside
        className={`shrink-0 overflow-hidden bg-black transition-[width] duration-200 ${
          historyOpen ? "w-[340px]" : "w-0"
        }`}
        aria-hidden={!historyOpen}
      >
        <div className="m-3 flex h-[calc(100%-1.5rem)] w-[316px] flex-col rounded-3xl border border-white/10 bg-[#0c0c14] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#5b21b6] text-white">
                <BookOpen size={16} />
              </span>
              <span className="min-w-0">
                <p className="m-0 text-sm font-semibold leading-tight">My Learnings</p>
                <p className="m-0 mt-0.5 text-[0.68rem] font-medium leading-tight text-white/45">Your generated lessons and chats</p>
              </span>
            </div>
            <button
              type="button"
              className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/15 px-2 py-1 text-[0.68rem] font-medium text-white/80"
              onClick={() => setHistoryOpen(false)}
            >
              <ChevronLeft size={12} /> Hide
            </button>
          </div>
          <button
            type="button"
            className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#a855f7] px-3 py-1.5 text-xs font-semibold"
            onClick={newChat}
          >
            <Plus size={13} /> New chat <ArrowRight size={12} />
          </button>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {history.length === 0 && (
              <p className="px-1 text-xs font-medium text-white/40">Lessons you generate show up here.</p>
            )}
            {[...history].sort((a, b) => Number(starred.includes(b.id)) - Number(starred.includes(a.id))).map((item) => {
              const thumb = item.video?.posterUrl || item.moments?.[0]?.images?.find((image) => image.url)?.url;
              const length = shortSpan(item.video?.durationSeconds || (item.moments || []).length * 8);
              const active = item.id === session?.id;
              const saved = starred.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`mb-2 flex w-full items-center gap-1 rounded-2xl border pr-1 ${active ? "border-white/10 bg-white/[0.06]" : "border-transparent hover:bg-white/[0.04]"}`}
                >
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left" onClick={() => openChat(item)}>
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black">
                      {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-snug">{item.topic || item.prompt}</span>
                      <span className="mt-1 flex items-center gap-1 text-[0.68rem] font-medium text-white/45">
                        <Clock size={11} /> {length}
                        {saved && <Star size={11} className="fill-[#facc15] text-[#facc15]" />}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
                    aria-label={saved ? "Unsave lesson" : "Save lesson"}
                    onClick={() => {
                      const nextStars = saved ? starred.filter((id) => id !== item.id) : [item.id, ...starred];
                      writeStarred(nextStars);
                      setStarred(nextStars);
                    }}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </main>
  );
}
