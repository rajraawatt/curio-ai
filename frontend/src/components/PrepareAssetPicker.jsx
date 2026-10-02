import { useEffect, useState } from "react";

function packLabel(pack) {
  const topic = pack?.topic || pack?.summary?.split("\n")[0]?.replace(/^Topic:\s*/, "") || "Prepared lesson";
  const seconds = Math.round(pack?.videoDurationSec || pack?.mergedVideo?.durationSeconds || 16);
  return `${topic} · ${seconds}s`;
}

export function PrepareAssetPicker({ open, onClose, onSelect }) {
  const [pack, setPack] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusy(true);
    setError("");
    fetch("/api/prepare/assets")
      .then((res) => res.json())
      .then((data) => {
        if (!data.pack) throw new Error("No prepared pack found yet.");
        setPack(data.pack);
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, [open]);

  if (!open) return null;

  const clip = pack?.mergedVideo?.url
    ? pack.mergedVideo
    : pack?.videos?.[0]
      ? pack.videos[0]
      : null;

  return (
    <div className="prepare-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="prepare-picker"
        role="dialog"
        aria-labelledby="prepare-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="prepare-picker-head">
          <h3 id="prepare-picker-title">Load prepared asset</h3>
          <button type="button" className="prepare-picker-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="prepare-picker-note">Choose the lesson video you built on the Prepare assets page.</p>
        {busy && <p className="prepare-picker-status">Loading pack…</p>}
        {error && <p className="error">{error}</p>}
        {!busy && !error && pack && (
          <ul className="prepare-picker-list">
            {clip ? (
              <li>
                <button
                  type="button"
                  className="prepare-picker-item"
                  onClick={() => onSelect(pack)}
                >
                  <strong>{packLabel(pack)}</strong>
                  <span>{clip.title || "Lesson video"}</span>
                </button>
              </li>
            ) : (
              <li className="prepare-picker-empty">No video in this pack yet. Generate one on Prepare assets first.</li>
            )}
            {(pack.assets || []).map((asset) => (
              <li key={asset.id}>
                <div className="prepare-picker-asset">
                  <strong>{asset.label}</strong>
                  <span>{asset.reason}</span>
                  {asset.sourceImageUrl && (
                    <img src={asset.sourceImageUrl.split("?")[0]} alt="" loading="lazy" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
