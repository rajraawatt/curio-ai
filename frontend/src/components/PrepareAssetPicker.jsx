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
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-[rgba(32,33,36,0.72)] p-4 font-[Nunito,sans-serif]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[min(80vh,560px)] w-[min(440px,100%)] overflow-auto rounded-xl bg-white px-[18px] pb-[18px] pt-4 shadow-[0_8px_28px_rgba(0,0,0,0.28)]"
        role="dialog"
        aria-labelledby="asset-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2">
          <h3 id="asset-picker-title" className="m-0 text-[1.05rem] font-black text-[#1F2937]">
            Load merged lesson
          </h3>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent text-[1.5rem] leading-none text-[#6B7280]"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <p className="my-2 mb-3 text-[0.88rem] text-[#6B7280]">
          Only the <strong className="text-[#1F2937]">full merged video</strong> (~16s) is shown in class. Separate
          clips and 3D assets stay on Prepare.
        </p>
        {busy && <p className="font-bold text-[#6B7280]">Loading pack…</p>}
        {error && <p className="font-bold text-[#EC4899]">{error}</p>}
        {!busy && !error && pack && merged && (
          <ul className="m-0 grid list-none gap-2 p-0">
            <li>
              <button
                type="button"
                className="grid w-full cursor-pointer gap-1 rounded-[10px] border border-[#dadce0] bg-[#F8F4ED] px-3.5 py-3 text-left hover:border-[#7C3AED] hover:bg-[#EDE4FF]"
                onClick={() => onSelect(pack)}
              >
                <strong className="text-[0.95rem] text-[#1F2937]">{mergedLabel(pack)}</strong>
                <span className="text-[0.82rem] text-[#6B7280]">{merged.displayLabel}</span>
                <code className="text-[0.72rem] text-[#7C3AED]">{merged.fileHint}</code>
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
