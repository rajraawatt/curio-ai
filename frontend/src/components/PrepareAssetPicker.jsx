import { useEffect, useState } from "react";
import { clipAnalyticsMeta } from "../clipAnalyticsMeta.js";

function mergedLabel(pack) {
  const topic = pack?.topic || "Prepared lesson";
  const seconds = Math.round(pack?.videoDurationSec || pack?.mergedVideo?.durationSeconds || 16);
  return `${topic} — full merged lesson (~${seconds}s)`;
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
        if (!data.pack.mergedVideo?.url) {
          throw new Error("No merged lesson video yet. Finish Prepare and wait for the merge step.");
        }
        setPack(data.pack);
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, [open]);

  if (!open) return null;

  const merged = pack?.mergedVideo?.url ? clipAnalyticsMeta(pack.mergedVideo, pack) : null;

  return (
    <div className="prepare-picker-backdrop" role="presentation" onClick={onClose}>
      <div
        className="prepare-picker"
        role="dialog"
        aria-labelledby="prepare-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="prepare-picker-head">
          <h3 id="prepare-picker-title">Load merged lesson</h3>
          <button type="button" className="prepare-picker-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="prepare-picker-note">
          Only the <strong>full merged video</strong> (~16s) is shown in class. Separate clips and 3D assets stay on
          Prepare.
        </p>
        {busy && <p className="prepare-picker-status">Loading pack…</p>}
        {error && <p className="error">{error}</p>}
        {!busy && !error && pack && merged && (
          <ul className="prepare-picker-list">
            <li>
              <button type="button" className="prepare-picker-item" onClick={() => onSelect(pack)}>
                <strong>{mergedLabel(pack)}</strong>
                <span>{merged.displayLabel}</span>
                <code className="prepare-picker-file">{merged.fileHint}</code>
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
