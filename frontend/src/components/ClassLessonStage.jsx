import { clipAnalyticsMeta } from "../clipAnalyticsMeta.js";
import { LessonClipPlayer } from "./LessonClipPlayer.jsx";

export function stageClipFromPack(pack) {
  if (pack?.mergedVideo?.url) return pack.mergedVideo;
  if (Array.isArray(pack?.videos)) {
    return pack.videos.find((clip) => clip?.url) || null;
  }
  return null;
}

export function ClassLessonStage({
  pack,
  language,
  captions,
  playing,
  onClear,
  readOnly = false,
  kicker = "Prepared lesson",
  trackMode = "live",
  trackAs = "Teacher desk",
}) {
  const raw = stageClipFromPack(pack);
  if (!raw) return null;
  const clip = clipAnalyticsMeta(raw, pack);
  const ageGroup = pack?.ageGroup || "11-14";
  const title = pack?.topic || pack?.lesson?.title || "Prepared lesson";

  return (
    <div
      className="grid min-h-[420px] flex-1 grid-rows-[auto_1fr] overflow-hidden rounded-xl border border-[#3c4043] bg-[#202124]"
      aria-label="Lesson stage"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[#3c4043] px-4 pt-3.5 pb-2.5">
        <div>
          <p className="m-0 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#9aa0a6]">{kicker}</p>
          <h2 className="m-0 text-[clamp(1.1rem,2vw,1.35rem)] font-medium text-white">{title}</h2>
        </div>
        {!readOnly && onClear && (
          <button
            type="button"
            className="cursor-pointer rounded-full border-0 bg-[#3c4043] px-3 py-1.5 font-medium text-[#e8eaed] hover:bg-[#5f6368]"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </header>
      <LessonClipPlayer
        clip={clip}
        lang={language}
        ageGroup={ageGroup}
        captions={captions}
        playing={playing}
        compact
        trackMode={trackMode}
        trackAs={trackAs}
      />
    </div>
  );
}
