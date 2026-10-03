import { useEffect, useState } from "react";
import { AssetViewer, StillViewer } from "./components/AssetViewer.jsx";
import { clipAnalyticsMeta } from "./clipAnalyticsMeta.js";
import { LessonClipPlayer as ClipPlayer } from "./components/LessonClipPlayer.jsx";
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

/** Shared Prepare studio — use embedded inside teacher, or full page at /prepare. */
export function PrepareStudio({ embedded = false }) {
  const [pack, setPack] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState(0);
  const [topic, setTopic] = useState("");
  const [ageGroup, setAgeGroup] = useState("11-14");
  const [keywords, setKeywords] = useState("");
  const [language, setLanguage] = useState("en");
  const [useGemini, setUseGemini] = useState(true);
  const [useVeo, setUseVeo] = useState(true);
  const [useTripo, setUseTripo] = useState(true);
  const [sharingLearning, setSharingLearning] = useState(false);

  async function loadPack() {
    const res = await fetch("/api/prepare/assets");
    const data = await res.json();
    setPack(data.pack || null);
    if (!data.pack?.topic) return;
    setTopic(data.pack.topic);
    if (data.pack.ageGroup) setAgeGroup(data.pack.ageGroup);
    if (data.pack.language) setLanguage(data.pack.language);
    if (Array.isArray(data.pack.keywords) && data.pack.keywords.length) {
      setKeywords(data.pack.keywords.join(", "));
    }
  }

  useEffect(() => {
    loadPack().catch((err) => setError(err.message));
  }, []);

  async function shareForLearning() {
    if (!pack?.mergedVideo?.url && !pack?.videos?.some((v) => v?.url)) {
      setError("Generate a lesson video before sharing for Learning.");
      return;
    }
    setSharingLearning(true);
    setError("");
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setLearningLesson", pack }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not share for Learning.");
      setNotice(`Shared for Learning: ${pack.topic || "Prepared lesson"}`);
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
    setBusy(true);
    setError("");
    setProgress(6);
    setNotice("Starting…");
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
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Prepare failed (${res.status})`);
      }

      await readPrepareStream(res, (eventName, data) => {
        const nextPack = eventName === "pack" ? data : data.pack;
        if (nextPack && (eventName === "pack" || eventName === "done")) {
          setPack(nextPack);
          setProgress(packProgress(nextPack));
        }
        if (eventName === "error") setError(data.error || "Prepare failed");
        else if (data.notice || nextPack?.notice) setNotice(data.notice || nextPack.notice);
        else if (eventName === "status") setNotice(data.notice || "Working…");
        if (eventName === "done") {
          setProgress(100);
          setNotice(data.pack?.notice || "Done");
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const Root = embedded ? "div" : "main";
  const rootClass = embedded ? "g-prepare" : "prepare";
  const showExtras = !embedded;

  return (
    <Root className={rootClass}>
      {embedded ? (
        <header className="g-prepare__hero">
          <p className="g-prepare__kicker">Teacher tool</p>
          <h1>Prepare assets</h1>
          <p>Fill in the lesson details, then generate a pack for class.</p>
        </header>
      ) : (
        <header className="prepare-header">
          <Wordmark />
          <div>
            <h1>Prepare assets</h1>
            <p>One lesson video (~16s): two scenes merged with a smooth fade. Each scene keeps one subject for 3D.</p>
          </div>
          <a href="/">Back</a>
        </header>
      )}

      <form
        className="prepare-panel"
        onSubmit={(event) => {
          event.preventDefault();
          generate(event);
        }}
      >
        <h2>Lesson to prepare</h2>
        <div className="prepare-fields">
          <label className="prepare-field wide">
            Topic
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="How a volcano erupts"
              disabled={busy}
            />
          </label>
          <label className="prepare-field">
            Student age group
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} disabled={busy}>
              {AGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="prepare-field">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={busy}>
              {LANGS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="prepare-field wide">
            Keywords
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="magma, crater, ash cloud"
              disabled={busy}
            />
          </label>
        </div>

        <label className="prepare-toggle">
          <input type="checkbox" checked={useGemini} onChange={(e) => setUseGemini(e.target.checked)} disabled={busy} />
          Plan beats with Gemini
        </label>
        <label className="prepare-toggle">
          <input type="checkbox" checked={useVeo} onChange={(e) => setUseVeo(e.target.checked)} disabled={busy} />
          Generate HD video from the stills
        </label>
        <label className="prepare-toggle">
          <input type="checkbox" checked={useTripo} onChange={(e) => setUseTripo(e.target.checked)} disabled={busy} />
          3D model of each fragment from the same still
        </label>

        <div className="prepare-actions">
          <button type="submit" className={embedded ? "g-btn g-btn--blue" : "primary"} disabled={busy}>
            {busy ? "Generating…" : "Generate lesson pack"}
          </button>
          {showExtras && <span className="prepare-mode">{pack ? `Mode: ${pack.mode}` : "No pack yet"}</span>}
        </div>

        {(busy || progress > 0) && (
          <div
            className={`prepare-progress${embedded ? " g-prepare__progress" : ""}`}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Generation progress"
          >
            <div className="prepare-progress-track">
              <div className="prepare-progress-bar" style={{ width: `${Math.max(progress, busy ? 6 : 0)}%` }} />
            </div>
            <div className="prepare-progress-meta">
              <span>{busy ? "Building pack…" : progress >= 100 ? "Complete" : "Ready"}</span>
              <strong>{progress}%</strong>
            </div>
          </div>
        )}
        {notice && <p className="prepare-notice">{notice}</p>}
        {error && <p className="error">{error}</p>}
      </form>

      {showExtras && pack?.pipeline && (
        <section className="prepare-pipeline">
          <h2>Pipeline</h2>
          <ol>
            {Object.values(pack.pipeline).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {showExtras && pack?.beats?.length > 0 && (
        <section className="prepare-pipeline">
          <h2>Beats</h2>
          <ol>
            {pack.beats.map((beat) => (
              <li key={beat.id}>
                <strong>{beat.title}</strong> → {beat.objectId}:{" "}
                {beat.narration && typeof beat.narration === "object" ? beat.narration.en : beat.narration}
              </li>
            ))}
          </ol>
        </section>
      )}

      {(pack?.mergedVideo?.url || pack?.videos?.length > 0) && (
        <section className="prepare-videos">
          <h2>Lesson video (~{Math.round(pack.videoDurationSec || 16)}s)</h2>
          {!embedded && (
            <p className="prepare-caption-note">
              One merged clip (max 16s). Picture, Veo sound, captions, and the woman&apos;s voice stay in sync.
            </p>
          )}
          {pack.mergedVideo?.url ? (
            <div className="prepare-video-row single">
              <ClipPlayer
                key={pack.mergedVideo.url}
                clip={clipAnalyticsMeta(pack.mergedVideo, pack)}
                lang={language}
                ageGroup={ageGroup}
                trackAs="Prepare"
              />
            </div>
          ) : (
            <div className="prepare-video-row">
              {pack.videos.map((clip) => (
                <ClipPlayer
                  key={`${clip.id}-${clip.url}`}
                  clip={clipAnalyticsMeta(clip, pack)}
                  lang={language}
                  ageGroup={ageGroup}
                  trackAs="Prepare"
                />
              ))}
            </div>
          )}
          <div className="prepare-share-row">
            <button
              type="button"
              className="g-btn g-btn--pink"
              disabled={sharingLearning}
              onClick={shareForLearning}
            >
              {sharingLearning ? "Sharing…" : "Share for Learning"}
            </button>
            <p className="prepare-share-note">Students see this video under their Learning tab.</p>
          </div>
          {pack.mergeError && <p className="error">Merge failed: {pack.mergeError}. Showing separate clips.</p>}
          {pack.mergedVideo?.sourceClips?.length > 0 && (
            <p className="prepare-source-clips">
              Source:{" "}
              {pack.mergedVideo.sourceClips.map((url, i) => (
                <a key={url} href={url.split("?")[0]}>
                  clip {i + 1}
                </a>
              ))}
            </p>
          )}
        </section>
      )}

      {(pack?.assets || []).length > 0 && (
        <section className="prepare-grid">
          <header className="prepare-grid__head">
            <h2>3D models</h2>
            <p>Each still sits beside its Tripo model. Drag a model to turn it.</p>
          </header>
          <div className="prepare-grid__row">
            {(pack?.assets || []).map((asset) => {
              const stillUrl = asset.sourceImageUrl || asset.previewUrl;
              return (
                <article key={asset.id} className="prepare-card">
                  <div className="prepare-card__media">
                    <StillViewer stillUrl={stillUrl} label={asset.label} />
                    <AssetViewer mesh={asset.mesh} label={asset.label} glbUrl={asset.glbUrl} />
                  </div>
                  <div className="prepare-card-body">
                    <h3>{asset.label}</h3>
                    <p>{asset.reason}</p>
                    <p className="prepare-status">
                      {asset.glbUrl && stillUrl
                        ? "Still + 3D ready. Drag the model to turn it."
                        : asset.glbUrl
                          ? "3D ready. Drag the model to turn it."
                          : asset.mesh?.status === "error" || asset.error
                            ? "Still ready. 3D was not created because Tripo has no credit left."
                            : stillUrl
                              ? "Still ready. 3D has not been made yet."
                              : "Waiting…"}
                    </p>
                    {asset.labels?.length > 0 && (
                      <ul className="prepare-labels">
                        {asset.labels.map((l) => (
                          <li key={l.id}>{l.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </Root>
  );
}

/** Standalone /prepare route (kept for testing). */
export function Prepare() {
  return <PrepareStudio embedded={false} />;
}
