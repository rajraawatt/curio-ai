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
    <div className="class-stage" aria-label="Lesson stage">
      <header className="class-stage-head">
        <div>
          <p className="stage-empty-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        {!readOnly && onClear && (
          <button type="button" className="class-stage-clear" onClick={onClear}>
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
