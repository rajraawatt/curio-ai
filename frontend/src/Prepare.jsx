import { useEffect, useState } from "react";
import { AssetViewer, StillViewer } from "./components/AssetViewer.jsx";
import { Wordmark } from "./Lobby.jsx";

const DEFAULT_PROMPT = `Create a short educational lesson about an animal cell.
Show the nucleus as the control center and mitochondria producing energy.
Keep it clear for middle-school students.`;

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

export function Prepare() {
  const [pack, setPack] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [useGemini, setUseGemini] = useState(false);
  const [useVeo, setUseVeo] = useState(false);
  const [useTripo, setUseTripo] = useState(true);
  const [reuseExisting, setReuseExisting] = useState(true);

  async function loadPack() {
    const res = await fetch("/api/prepare/assets");
    const data = await res.json();
    setPack(data.pack || null);
    if (data.pack?.teacherPrompt) setPrompt(data.pack.teacherPrompt);
  }

  useEffect(() => {
    loadPack().catch((err) => setError(err.message));
  }, []);

  async function generate() {
    setBusy(true);
    setError("");
    setNotice("Starting…");
    try {
      const res = await fetch("/api/prepare/assets?stream=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          prompt,
          useGemini,
          useVeo,
          useTripo,
          reuseExisting,
          objectCount: 2,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Prepare failed (${res.status})`);
      }

      await readPrepareStream(res, (event, data) => {
        if (event === "pack" || (event === "done" && data.pack)) {
          setPack(data.pack || data);
          if (data.notice || data.pack?.notice) setNotice(data.notice || data.pack.notice);
        } else if (event === "status") {
          setNotice(data.notice || "Working…");
        } else if (event === "error") {
          setError(data.error || "Prepare failed");
        } else if (event === "done") {
          setNotice(data.pack?.notice || "Done");
          if (data.pack) setPack(data.pack);
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="prepare">
      <header className="prepare-header">
        <Wordmark />
        <div>
          <h1>Prepare lesson pack</h1>
          <p>Prompt → Gemini plan → stills → Veo (~15s) → Tripo 3D (same images)</p>
        </div>
        <a href="/">Back</a>
      </header>

      <section className="prepare-panel">
        <h2>Teacher prompt</h2>
        <textarea
          className="prepare-prompt"
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={busy}
        />
        <label className="prepare-toggle">
          <input type="checkbox" checked={reuseExisting} onChange={(e) => setReuseExisting(e.target.checked)} disabled={busy} />
          Reuse existing stills + video (skip regenerating them)
        </label>
        <label className="prepare-toggle">
          <input type="checkbox" checked={useGemini} onChange={(e) => setUseGemini(e.target.checked)} disabled={busy} />
          Gemini plan (beats + key objects + labels)
        </label>
        <label className="prepare-toggle">
          <input type="checkbox" checked={useVeo} onChange={(e) => setUseVeo(e.target.checked)} disabled={busy} />
          Veo image→video (~2×8s clips from the stills)
        </label>
        <label className="prepare-toggle">
          <input type="checkbox" checked={useTripo} onChange={(e) => setUseTripo(e.target.checked)} disabled={busy} />
          Tripo image→3D from the stills (uses credits)
        </label>
        <div className="prepare-actions">
          <button type="button" className="primary" disabled={busy} onClick={generate}>
            {busy ? "Generating… results appear as each step finishes" : "Generate lesson pack"}
          </button>
          <span className="prepare-mode">{pack ? `Mode: ${pack.mode}` : "No pack yet"}</span>
        </div>
        {notice && <p className="prepare-notice">{notice}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      {pack?.pipeline && (
        <section className="prepare-pipeline">
          <h2>Pipeline</h2>
          <ol>
            {Object.values(pack.pipeline).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {pack?.beats?.length > 0 && (
        <section className="prepare-pipeline">
          <h2>Beats</h2>
          <ol>
            {pack.beats.map((beat) => (
              <li key={beat.id}>
                <strong>{beat.title}</strong> → {beat.objectId}: {beat.narration}
              </li>
            ))}
          </ol>
        </section>
      )}

      {pack?.videos?.length > 0 && (
        <section className="prepare-videos">
          <h2>Video clips (~{pack.videoDurationSec || 16}s total)</h2>
          <div className="prepare-video-row">
            {pack.videos.map((clip) => (
              <figure key={`${clip.id}-${clip.url}`} className="prepare-video-card">
                <video
                  key={clip.url}
                  src={clip.url.split("?")[0]}
                  controls
                  playsInline
                  preload="metadata"
                >
                  <source src={clip.url.split("?")[0]} type="video/mp4" />
                </video>
                <figcaption>
                  {clip.title} ({clip.durationSeconds}s) ·{" "}
                  <a href={clip.url.split("?")[0]} target="_blank" rel="noreferrer">
                    open file
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="prepare-grid">
        {(pack?.assets || []).map((asset) => {
          const stillUrl = asset.sourceImageUrl || asset.previewUrl;
          return (
            <article key={asset.id} className="prepare-card">
              <StillViewer stillUrl={stillUrl} label={asset.label} />
              {(asset.glbUrl || asset.mesh) && (
                <AssetViewer mesh={asset.mesh} label={asset.label} glbUrl={asset.glbUrl} />
              )}
              <div className="prepare-card-body">
                <h3>{asset.label}</h3>
                <p>{asset.reason}</p>
                <p className="prepare-status">
                  {asset.glbUrl && stillUrl
                    ? "Still + 3D ready (Gemini + Tripo)"
                    : asset.glbUrl
                      ? "3D ready (Tripo)"
                      : stillUrl
                        ? "Still ready (Gemini) — 3D pending / not run yet"
                        : "Waiting…"}
                </p>
                {asset.labels?.length > 0 && (
                  <ul className="prepare-labels">
                    {asset.labels.map((l) => (
                      <li key={l.id}>{l.text}</li>
                    ))}
                  </ul>
                )}
                <code>{asset.glbUrl || stillUrl || asset.meshUrl}</code>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
