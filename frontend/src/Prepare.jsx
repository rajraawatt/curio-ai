import { useEffect, useMemo, useRef, useState } from "react";
import { PackMediaView } from "./components/PackMediaView.jsx";
import { PrepareInteractiveReview, arePreviewModelsReady, loadInteractiveModels, previewModelUrls } from "./components/PrepareInteractiveReview.jsx";
import { ensureMediaReachable } from "./mediaReady.js";
import { Wordmark } from "./Lobby.jsx";

const AGES = [
  ["8-10", "Ages 8–10"],
  ["11-14", "Ages 11–14"],
  ["15-18", "Ages 15–18"],
];

const LANGS = [
  ["en", "English"],
  ["hi", "Hindi"],
  ["es", "Spanish"],
];

const PREPARE_JOB_KEY = "curio-prepare-job";
const PREPARE_PACK_KEY = "curio-prepare-last-pack";

const btnBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 font-bold text-[0.9rem] transition active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none";
const btnViolet = `${btnBase} bg-[#7C3AED] text-white shadow-[0_4px_0_rgba(124,58,237,0.35)] hover:bg-[#6D28D9]`;
const btnPink = `${btnBase} bg-[#EC4899] text-white shadow-[0_4px_0_rgba(236,72,153,0.35)] hover:brightness-95`;

const fieldClass = "grid gap-1 text-[0.78rem] font-extrabold text-[#6B7280]";
const inputClass =
  "w-full rounded-[14px] border-2 border-[#F0EAE0] bg-[#F8F4ED] px-2.5 py-2 font-bold text-[#1F2937] focus:border-[#C4B5FD] focus:bg-white focus:outline-none";
const cardClass =
  "mb-3.5 rounded-[22px] border-2 border-[#F0EAE0] bg-white p-4 text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]";

function readPrepareJob() {
  try {
    const raw = sessionStorage.getItem(PREPARE_JOB_KEY);
    if (!raw) return null;
    const job = JSON.parse(raw);
    if (!job?.startedAt || Date.now() - job.startedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem(PREPARE_JOB_KEY);
      return null;
    }
    return job;
  } catch {
    return null;
  }
}

function writePrepareJob(job) {
  try {
    if (!job) sessionStorage.removeItem(PREPARE_JOB_KEY);
    else sessionStorage.setItem(PREPARE_JOB_KEY, JSON.stringify(job));
  } catch {
    // ignore quota / private mode
  }
}

function readCachedPack() {
  try {
    const raw = localStorage.getItem(PREPARE_PACK_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.pack || Date.now() - Number(data.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PREPARE_PACK_KEY);
      return null;
    }
    return data.pack;
  } catch {
    return null;
  }
}

function cachePack(pack) {
  if (!packHasContent(pack)) return;
  try {
    localStorage.setItem(
      PREPARE_PACK_KEY,
      JSON.stringify({ savedAt: Date.now(), pack }),
    );
  } catch {
    // ignore
  }
}

function packProgress(pack) {
  if (!pack) return 0;
  if (pack.status === "done") return 100;
  const clips = pack.useVeo === false ? 0 : 2;
  const models = pack.useTripo === false ? 0 : 2;
  const merge = pack.useVeo === false ? 0 : 1;
  const expected = 1 + 2 + clips + merge + models;
  const doneSteps = Object.keys(pack.pipeline || {}).length;
  let pct = Math.round((doneSteps / expected) * 100);
  if (["starting", "planned", "image", "veo", "tripo"].includes(pack.status)) {
    pct = Math.min(96, pct + 8);
  }
  return Math.max(6, Math.min(99, pct));
}

function statusLabel(status, notice) {
  if (notice) return notice;
  switch (status) {
    case "starting":
      return "Starting…";
    case "planned":
      return "Planning beats…";
    case "image":
      return "Creating stills…";
    case "veo":
      return "Generating video…";
    case "tripo":
      return "Building 3D models…";
    case "done":
      return "Complete";
    default:
      return "Building pack…";
  }
}

async function readPrepareStream(res, onEvent) {
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
        // ignore malformed chunk
      }
    }
  }
}

function packHasContent(pack) {
  return Boolean(
    pack?.mergedVideo?.url ||
      pack?.videos?.some((v) => v?.url) ||
      pack?.assets?.some((a) => a?.glbUrl || a?.sourceImageUrl || a?.previewUrl || a?.mesh),
  );
}

/** Shared Prepare studio — use embedded inside teacher, or full page at /prepare. */
export function PrepareStudio({ embedded = false }) {
  const savedJob = useMemo(() => readPrepareJob(), []);
  const cachedPack = useMemo(() => readCachedPack(), []);
  const [pack, setPack] = useState(() => cachedPack);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() =>
    savedJob?.notice || (cachedPack?.topic ? `Ready · ${cachedPack.topic}` : ""),
  );
  const [progress, setProgress] = useState(() =>
    savedJob?.busy ? savedJob.progress || 0 : packHasContent(cachedPack) ? 100 : 0,
  );
  const [topic, setTopic] = useState(() => savedJob?.topic || "");
  const [ageGroup, setAgeGroup] = useState("11-14");
  const [keywords, setKeywords] = useState("");
  const [language, setLanguage] = useState("en");
  const [useGemini, setUseGemini] = useState(true);
  const [useVeo, setUseVeo] = useState(true);
  const [useTripo, setUseTripo] = useState(false);
  const [sharingLearning, setSharingLearning] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);
  const [prepareTab, setPrepareTab] = useState("generated");
  const [mediaEpoch, setMediaEpoch] = useState(0);
  const [previewModels, setPreviewModels] = useState({ status: "idle", loaded: 0, total: 3 });
  const [previewLoadKey, setPreviewLoadKey] = useState(0);
  const [classId, setClassId] = useState("6a");
  const [subjectId, setSubjectId] = useState("science");
  const [galleryMeta, setGalleryMeta] = useState(null);
  const streamActiveRef = useRef(false);
  const pollRef = useRef(null);
  const jobStartedAtRef = useRef(null);
  const mediaRef = useRef(null);
  const latestPackRef = useRef(null);

  const subjects = useMemo(() => {
    const map = galleryMeta?.subjectsByClass || {};
    return map[classId] || [{ id: "science", label: "Science" }];
  }, [galleryMeta, classId]);

  function persistJob(partial) {
    const next = {
      busy: true,
      startedAt: jobStartedAtRef.current || Date.now(),
      progress,
      notice,
      topic,
      ...partial,
    };
    if (!next.busy) {
      writePrepareJob(null);
      jobStartedAtRef.current = null;
      return;
    }
    jobStartedAtRef.current = next.startedAt;
    writePrepareJob(next);
  }

  async function loadPack() {
    const res = await fetch("/api/prepare/assets");
    const data = await res.json();
    const next = data.pack || null;

    function hydrateForm(source) {
      if (!source?.topic) return;
      setTopic((prev) => prev || source.topic);
      if (source.ageGroup) setAgeGroup(source.ageGroup);
      if (source.language) setLanguage(source.language);
      if (Array.isArray(source.keywords) && source.keywords.length) {
        setKeywords(source.keywords.join(", "));
      }
      if (source.classId) setClassId(source.classId);
      if (source.subjectId) setSubjectId(source.subjectId);
    }

    if (packHasContent(next)) {
      latestPackRef.current = next;
      setPack(next);
      cachePack(next);
      hydrateForm(next);
      return next;
    }
    // API blip / empty response — keep whatever we already show (cache or prior state).
    const fallback = latestPackRef.current || readCachedPack() || pack;
    if (packHasContent(fallback)) {
      latestPackRef.current = fallback;
      setPack(fallback);
      hydrateForm(fallback);
      return fallback;
    }
    if (next) {
      latestPackRef.current = next;
      setPack(next);
      hydrateForm(next);
    }
    return next;
  }

  function applyPackUpdate(nextPack, eventName) {
    if (!nextPack) return;
    latestPackRef.current = nextPack;
    setPack(nextPack);
    if (packHasContent(nextPack) && (eventName === "done" || nextPack.status === "done")) {
      cachePack(nextPack);
    }
    const pct = eventName === "done" || nextPack.status === "done" ? 100 : packProgress(nextPack);
    setProgress(pct);
    const label = statusLabel(nextPack.status, nextPack.notice);
    if (label) setNotice(label);
    // Unlock UI as soon as the pack is done — don't wait for stream/gallery finish.
    if (eventName === "done" || nextPack.status === "done") {
      setBusy(false);
      writePrepareJob(null);
      jobStartedAtRef.current = null;
      setPrepareTab("generated");
      setMediaEpoch((n) => n + 1);
      persistJob({
        busy: false,
        progress: 100,
        notice: label,
        topic: nextPack.topic || topic,
      });
      return;
    }
    persistJob({
      busy: true,
      progress: pct,
      notice: label,
      topic: nextPack.topic || topic,
    });
  }

  function revealMedia() {
    requestAnimationFrame(() => {
      mediaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    let cancelled = false;
    if (packHasContent(cachedPack)) {
      latestPackRef.current = cachedPack;
    }
    (async () => {
      try {
        const next = await loadPack();
        if (cancelled) return;
        if (packHasContent(next)) {
          writePrepareJob(null);
          setBusy(false);
          setProgress(100);
          if (next.topic) setNotice(`Ready · ${next.topic}`);
        } else if (savedJob?.busy) {
          jobStartedAtRef.current = savedJob.startedAt || Date.now();
          setBusy(true);
          setProgress(savedJob.progress || 6);
          setNotice(savedJob.notice || "Resuming…");
        }
      } catch (err) {
        if (cancelled) return;
        // Keep cached pack visible if the network request fails.
        if (packHasContent(latestPackRef.current || cachedPack)) {
          setPack(latestPackRef.current || cachedPack);
          setProgress(100);
        } else {
          setError(err.message);
        }
      }
    })();
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setGalleryMeta(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!busy || streamActiveRef.current) return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await loadPack();
        if (cancelled || !next) return;
        const complete = next.status === "done" || packHasContent(next);
        const pct = complete ? 100 : packProgress(next);
        setProgress(pct);
        setNotice(statusLabel(next.status, next.notice));
        if (complete) {
          setBusy(false);
          writePrepareJob(null);
          jobStartedAtRef.current = null;
          clearInterval(pollRef.current);
          pollRef.current = null;
          setNotice(`Ready · ${next.topic || topic || "lesson pack"}`);
          revealMedia();
        } else {
          persistJob({
            busy: true,
            progress: pct,
            notice: statusLabel(next.status, next.notice),
          });
        }
      } catch {
        // keep polling
      }
    };
    tick();
    pollRef.current = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [busy]);

  useEffect(() => {
    if (!subjects.some((s) => s.id === subjectId) && subjects[0]) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  async function saveToGallery(nextPack = pack, silent = false) {
    const target = nextPack || pack;
    if (!packHasContent(target)) {
      if (!silent) setError("Generate a lesson video or 3D assets before saving.");
      return null;
    }
    if (!silent) {
      setSavingGallery(true);
      setError("");
    }
    try {
      const res = await fetch("/api/gallery/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          subjectId,
          pack: { ...target, classId, subjectId, topic: topic.trim() || target.topic },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save to Gallery.");
      if (!silent) setNotice(`Saved to Gallery: ${data.pack?.topic || topic}`);
      return data.pack;
    } catch (err) {
      if (!silent) setError(err.message);
      throw err;
    } finally {
      if (!silent) setSavingGallery(false);
    }
  }

  async function shareForLearning() {
    if (!packHasContent(pack)) {
      setError("Generate video or 3D assets before sharing for Learning.");
      return;
    }
    setSharingLearning(true);
    setError("");
    try {
      const res = await fetch("/api/gallery/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          subjectId,
          pack: { ...pack, classId, subjectId, topic: topic.trim() || pack.topic },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not share for Learning.");
      setNotice(`Shared all assets for Learning · ${classId.toUpperCase()} / ${subjectId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSharingLearning(false);
    }
  }

  async function generate(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!topic.trim()) {
      setError("Add a topic for the next class.");
      return;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    streamActiveRef.current = true;
    const startedAt = Date.now();
    jobStartedAtRef.current = startedAt;
    setBusy(true);
    setError("");
    setProgress(6);
    setNotice("Starting…");
    persistJob({
      busy: true,
      startedAt,
      progress: 6,
      notice: "Starting…",
      topic: topic.trim(),
    });
    let finalPack = null;
    try {
      const res = await fetch("/api/prepare/assets?stream=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          ageGroup,
          keywords,
          language,
          useGemini,
          useVeo,
          useTripo,
          reuseExisting: false,
          objectCount: 2,
          classId,
          subjectId,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Prepare failed (${res.status})`);
      }

      await readPrepareStream(res, (eventName, data) => {
        const nextPack = eventName === "pack" ? data : data.pack;
        if (nextPack && (eventName === "pack" || eventName === "done")) {
          applyPackUpdate(nextPack, eventName);
          if (eventName === "done" || nextPack.status === "done") finalPack = nextPack;
        }
        if (eventName === "error") {
          setError(data.error || "Prepare failed");
          setBusy(false);
          writePrepareJob(null);
        } else if (data.notice || nextPack?.notice) {
          setNotice(data.notice || nextPack.notice);
        } else if (eventName === "status") {
          setNotice(data.notice || "Working…");
        }
        if (eventName === "done") {
          setProgress(100);
          setBusy(false);
          setNotice(data.pack?.notice || "Prepare pack complete");
          finalPack = data.pack || finalPack || latestPackRef.current;
          writePrepareJob(null);
          jobStartedAtRef.current = null;
          revealMedia();
        }
      });

      if (!finalPack) finalPack = latestPackRef.current;
      const fresh = await loadPack().catch(() => null);
      const display = packHasContent(finalPack)
        ? { ...(fresh || {}), ...finalPack }
        : fresh || finalPack;
      if (display) {
        latestPackRef.current = display;
        setPack(display);
        setProgress(100);
        setBusy(false);
        if (packHasContent(display)) cachePack(display);
      }

      // Unlock first; gallery save must not keep the button stuck on Generating…
      streamActiveRef.current = false;
      setBusy(false);
      writePrepareJob(null);
      jobStartedAtRef.current = null;
      setPrepareTab("generated");

      if (display && packHasContent(display)) {
        // Wait until stills/video are actually reachable (first-generate race).
        await ensureMediaReachable(display).catch(() => false);
        const refreshed = await loadPack().catch(() => display);
        const readyPack = packHasContent(refreshed) ? refreshed : display;
        latestPackRef.current = readyPack;
        setPack(readyPack);
        cachePack(readyPack);
        setMediaEpoch((n) => n + 1);
        setNotice(`Generated · ${readyPack.topic || topic || "lesson pack"}`);
        revealMedia();
        saveToGallery(readyPack, true)
          .then(() => {
            setNotice(`Generated and saved to Gallery · ${classId.toUpperCase()} / ${subjectId}`);
          })
          .catch(() => {});
      } else {
        setError("Pack finished but no video/stills were found. Try Generate again.");
        revealMedia();
      }
    } catch (err) {
      setError(err.message);
      writePrepareJob(null);
    } finally {
      streamActiveRef.current = false;
      setBusy(false);
      writePrepareJob(null);
      jobStartedAtRef.current = null;
      revealMedia();
    }
  }

  const Root = embedded ? "div" : "main";
  const classes = galleryMeta?.classes || [
    { id: "6a", label: "Class 6A" },
    { id: "7b", label: "Class 7B" },
    { id: "8c", label: "Class 8C" },
  ];
  const showMedia = packHasContent(pack) && (!busy || progress >= 100 || pack?.status === "done");
  const generating = busy && progress < 100 && pack?.status !== "done";
  const previewReady = previewModels.status === "ready";
  const previewDownloading = prepareTab === "preview" && previewModels.status === "loading";

  // Load local /generated GLBs into memory once when Student Preview opens.
  useEffect(() => {
    if (prepareTab !== "preview" || !pack || !showMedia) return undefined;

    const urls = previewModelUrls(pack);
    const total = Math.max(urls.length, 1);

    // Already served into memory this session — skip the loading screen.
    if (arePreviewModelsReady(pack)) {
      setPreviewModels({ status: "ready", loaded: urls.length, total: urls.length });
      return undefined;
    }

    let cancelled = false;
    setPreviewModels({ status: "loading", loaded: 0, total });

    loadInteractiveModels(pack, ({ loaded, total: nextTotal, status }) => {
      if (cancelled) return;
      setPreviewModels({
        status: status === "ready" ? "ready" : "loading",
        loaded,
        total: nextTotal || total,
      });
    })
      .then(({ loaded, total: nextTotal }) => {
        if (cancelled) return;
        setPreviewModels({ status: "ready", loaded, total: nextTotal || total });
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewModels({
          status: "error",
          loaded: 0,
          total,
          error: err?.message || "Could not load models.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [prepareTab, pack, showMedia, previewLoadKey]);

  return (
    <Root
      className={
        embedded
          ? "bg-[radial-gradient(900px_420px_at_0%_0%,rgba(236,72,153,0.08),transparent_50%),radial-gradient(800px_400px_at_100%_0%,rgba(124,58,237,0.1),transparent_50%),#F8F4ED] px-6 pb-12 pt-5 font-[Nunito,sans-serif] text-[#1F2937]"
          : "min-h-screen bg-[radial-gradient(900px_420px_at_0%_0%,rgba(236,72,153,0.08),transparent_50%),radial-gradient(800px_400px_at_100%_0%,rgba(124,58,237,0.1),transparent_50%),#F8F4ED] p-5 font-[Nunito,sans-serif] text-[#1F2937]"
      }
    >
      {embedded ? (
        <header className="mb-4">
          <p className="mb-1 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[#EC4899]">
            Teacher tool
          </p>
          <h1 className="m-0 text-[clamp(1.4rem,2.5vw,1.85rem)] font-black tracking-[-0.02em] text-[#1F2937]">
            Prepare assets
          </h1>
          <p className="mt-1.5 max-w-[52ch] text-[0.92rem] font-bold text-[#6B7280]">
            Pick class and subject, generate, then save or share the full pack (video + 3D).
          </p>
        </header>
      ) : (
        <header className="mb-[18px] flex items-center gap-4">
          <Wordmark />
          <div>
            <h1 className="m-0 text-[1.25rem] font-black text-[#1F2937]">Prepare assets</h1>
            <p className="mt-1 text-[0.9rem] font-bold text-[#6B7280]">
              One lesson video (~16s): two scenes merged with a smooth fade. Each scene keeps one subject for 3D.
            </p>
          </div>
          <a href="/" className="ml-auto font-bold text-[#7C3AED] hover:underline">
            Back
          </a>
        </header>
      )}

      <form
        className={cardClass}
        onSubmit={(event) => {
          event.preventDefault();
          generate(event);
        }}
      >
        <h2 className="m-0 font-black text-[#1F2937]">Lesson to prepare</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={fieldClass}>
            Class
            <select
              className={inputClass}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={generating}
            >
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.label}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldClass}>
            Subject
            <select
              className={inputClass}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={generating}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.label}
                </option>
              ))}
            </select>
          </label>
          <label className={`${fieldClass} sm:col-span-2`}>
            Topic
            <input
              className={inputClass}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="How a volcano erupts"
              disabled={generating}
            />
          </label>
          <label className={fieldClass}>
            Student age group
            <select
              className={inputClass}
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              disabled={generating}
            >
              {AGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldClass}>
            Language
            <select
              className={inputClass}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={generating}
            >
              {LANGS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className={`${fieldClass} sm:col-span-2`}>
            Keywords
            <input
              className={inputClass}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="magma, crater, ash cloud"
              disabled={generating}
            />
          </label>
        </div>

        <label className="my-3 flex items-center gap-2 text-[0.88rem] font-bold text-[#1F2937] accent-[#7C3AED]">
          <input type="checkbox" checked={useGemini} onChange={(e) => setUseGemini(e.target.checked)} disabled={generating} />
          Plan beats with Gemini
        </label>
        <label className="my-3 flex items-center gap-2 text-[0.88rem] font-bold text-[#1F2937] accent-[#7C3AED]">
          <input type="checkbox" checked={useVeo} onChange={(e) => setUseVeo(e.target.checked)} disabled={generating} />
          Generate HD video from the stills
        </label>
        <label className="my-3 flex items-center gap-2 text-[0.88rem] font-bold text-[#1F2937] accent-[#7C3AED]">
          <input type="checkbox" checked={useTripo} onChange={(e) => setUseTripo(e.target.checked)} disabled={generating} />
          3D model of each fragment from the same still
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className={btnViolet} disabled={generating}>
            {generating ? "Generating…" : "Generate lesson pack"}
          </button>
          <span className="text-[0.82rem] font-bold text-[#6B7280]">
            {pack ? `Mode: ${pack.mode || pack.status || "ready"}` : "No pack yet"}
          </span>
        </div>

        {generating && (
          <div
            className="mt-4 grid gap-2"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Generation progress"
          >
            <div className="h-3.5 overflow-hidden rounded-full border-2 border-[#F0EAE0] bg-[#F3EEE6]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(progress, 6)}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-[0.82rem] font-extrabold text-[#6B7280]">
              <span className="min-w-0 truncate font-extrabold text-[#7C3AED]">
                {notice || "Building pack…"}
              </span>
              <strong className="shrink-0 text-[0.95rem] text-[#7C3AED]">{progress}%</strong>
            </div>
          </div>
        )}
        {notice && !generating && <p className="mt-2 text-[0.85rem] font-bold text-[#7C3AED]">{notice}</p>}
        {error && <p className="mt-2 font-bold text-[#EC4899]">{error}</p>}
      </form>

      {generating && (
        <section className={`${cardClass} border-[rgba(124,58,237,0.25)]`}>
          <h2 className="m-0 font-black text-[#1F2937]">Working on your pack</h2>
          <p className="mt-2 m-0 text-[0.9rem] font-bold text-[#6B7280]">
            Video and stills appear below when this reaches 100%.
          </p>
          {pack?.pipeline && (
            <ol className="mt-3 list-decimal pl-[18px] text-[0.9rem] font-bold text-[#1F2937]">
              {Object.values(pack.pipeline).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
        </section>
      )}

      {showMedia ? (
        <div ref={mediaRef} className="scroll-mt-4">
          <div className="my-4 flex flex-wrap items-center gap-2 border-b-2 border-[#F0EAE0] pb-3">
            <button
              type="button"
              className={`${btnBase} ${
                prepareTab === "generated"
                  ? "bg-[#7C3AED] text-white shadow-[0_4px_0_rgba(124,58,237,0.35)]"
                  : "bg-gray-100 text-gray-600 shadow-[0_4px_0_rgba(0,0,0,0.08)] hover:bg-gray-200 hover:text-gray-900"
              }`}
              onClick={() => setPrepareTab("generated")}
            >
              Generated Lessons
            </button>
            <button
              type="button"
              className={`${btnBase} ${
                prepareTab === "preview"
                  ? "bg-[#7C3AED] text-white shadow-[0_4px_0_rgba(124,58,237,0.35)]"
                  : "bg-gray-100 text-gray-600 shadow-[0_4px_0_rgba(0,0,0,0.08)] hover:bg-gray-200 hover:text-gray-900"
              }`}
              onClick={() => setPrepareTab("preview")}
            >
              {previewDownloading
                ? `Loading… ${previewModels.loaded}/${previewModels.total || 3}`
                : "Student Preview"}
            </button>
          </div>

          {prepareTab === "generated" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={btnPink}
                  disabled={savingGallery || generating}
                  onClick={() => saveToGallery()}
                >
                  {savingGallery ? "Saving…" : "Save to Gallery"}
                </button>
                <p className="m-0 text-[0.85rem] font-semibold text-[#6B7280]">
                  Saves this pack’s video and assets to Gallery.
                </p>
              </div>
              <PackMediaView
                key={`prepare-media-${mediaEpoch}-${pack?.mergedVideo?.url || pack?.createdAt || "pack"}`}
                pack={pack}
                language={language}
                trackAs="Teacher prepare"
              />
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={btnPink}
                  disabled={sharingLearning || generating || !previewReady}
                  onClick={shareForLearning}
                >
                  {sharingLearning ? "Sharing…" : "Share for Learning"}
                </button>
                <p className="m-0 text-[0.85rem] font-semibold text-[#6B7280]">
                  {previewDownloading
                    ? `Loading models from files (${previewModels.loaded} of ${previewModels.total || 3})…`
                    : previewModels.status === "error"
                      ? previewModels.error || "Model load failed."
                      : `Shares video + 3D models to ${classId.toUpperCase()} Learning under ${
                          subjects.find((s) => s.id === subjectId)?.label || subjectId
                        }.`}
                </p>
              </div>
              {!previewReady ? (
                <section className={`${cardClass} grid min-h-[280px] place-items-center text-center`}>
                  {previewModels.status === "error" ? (
                    <div>
                      <p className="m-0 font-black text-[#EC4899]">
                        {previewModels.error || "Could not load models."}
                      </p>
                      <button
                        type="button"
                        className={`${btnPink} mt-3`}
                        onClick={() => setPreviewLoadKey((key) => key + 1)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="m-0 text-[1.05rem] font-black text-[#1F2937]">Loading models…</p>
                      <p className="mt-2 m-0 text-[0.9rem] font-bold text-[#6B7280]">
                        {previewModels.loaded} of {previewModels.total || 3} ready from local files. Preview
                        unlocks when all finish.
                      </p>
                      <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-[#F0EAE0]">
                        <div
                          className="h-full rounded-full bg-[#EC4899] transition-[width] duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              ((previewModels.loaded || 0) / Math.max(previewModels.total || 3, 1)) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <PrepareInteractiveReview pack={pack} language={language} modelsReady={previewReady} />
              )}
            </div>
          )}
        </div>
      ) : (
        !generating &&
        progress >= 100 && (
          <section className={cardClass}>
            <p className="m-0 font-bold text-[#6B7280]">
              Pack marked complete, but preview is missing.{" "}
              <button
                type="button"
                className="font-black text-[#7C3AED] underline"
                onClick={() => loadPack().then(revealMedia)}
              >
                Reload preview
              </button>
            </p>
          </section>
        )
      )}
    </Root>
  );
}

/** Standalone /prepare route (kept for testing). */
export function Prepare() {
  return <PrepareStudio embedded={false} />;
}
