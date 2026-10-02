import { LessonClipPlayer } from "./LessonClipPlayer.jsx";

export function stageClipFromPack(pack) {
  if (!pack) return null;
  if (pack.mergedVideo?.url) return pack.mergedVideo;
  if (pack.videos?.[0]?.url) return pack.videos[0];
  return null;
}

export function ClassLessonStage({ pack, language, captions, playing, onClear }) {
  const clip = stageClipFromPack(pack);
  if (!clip) return null;
  const ageGroup = pack?.ageGroup || "11-14";
  const title = pack?.topic || pack?.lesson?.title || "Prepared lesson";

  return (
    <div className="class-stage" aria-label="Lesson stage">
      <header className="class-stage-head">
        <div>
          <p className="stage-empty-kicker">Prepared lesson</p>
          <h2>{title}</h2>
        </div>
        <button type="button" className="class-stage-clear" onClick={onClear}>
          Clear
        </button>
      </header>
      <LessonClipPlayer
        clip={clip}
        lang={language}
        ageGroup={ageGroup}
        captions={captions}
        playing={playing}
        compact
      />
    </div>
  );
}
