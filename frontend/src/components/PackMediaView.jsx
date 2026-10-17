import { useRef, useState } from "react";
import { AssetViewer, StillViewer } from "./AssetViewer.jsx";
import { clipAnalyticsMeta } from "../clipAnalyticsMeta.js";
import { LessonClipPlayer } from "./LessonClipPlayer.jsx";
import { stageClipFromPack } from "./ClassLessonStage.jsx";

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Shared video + still|3D row used by Prepare, Gallery, and student Learning. */
export function PackMediaView({
  pack,
  language = "en",
  captions = true,
  showVideo = true,
  trackAs = "Gallery",
  trackMode = "self_paced",
}) {
  const playbackRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  if (!pack) return null;
  const ageGroup = pack.ageGroup || "11-14";
  const lang = pack.language || language;
  const hasVideo = Boolean(stageClipFromPack(pack));
  const assets = Array.isArray(pack.assets) ? pack.assets : [];
  const clip = pack.mergedVideo || pack.videos?.[0];
  const chapters = Array.isArray(pack.mergedVideo?.chapters) ? pack.mergedVideo.chapters : [];
  const activeChapter = chapters.findIndex((chapter, index) => {
    const end = Number(chapter.endSeconds) || chapters[index + 1]?.startSeconds || Infinity;
    return currentTime >= (Number(chapter.startSeconds) || 0) && currentTime < end;
  });

  function jumpToChapter(chapter) {
    const time = Math.max(0, Number(chapter.startSeconds) || 0);
    playbackRef.current?.seek(time);
    setCurrentTime(time);
    playbackRef.current?.play?.();
  }

  return (
    <div className="grid gap-4 font-[Nunito,sans-serif]">
      {showVideo && hasVideo && (
        <section className="mt-3.5 rounded-[22px] border-2 border-[#F0EAE0] bg-white px-4 py-3.5 text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]">
          <h2 className="mb-2.5 text-[1.05rem] font-black text-[#1F2937]">
            Lesson video ({formatTime(pack.videoDurationSec || pack.mergedVideo?.durationSeconds || 16)})
          </h2>
          <div className="grid max-w-[720px] grid-cols-1 gap-3">
            <LessonClipPlayer
              key={pack.mergedVideo?.url || pack.videos?.[0]?.url}
              clip={clipAnalyticsMeta(clip, pack)}
              lang={lang}
              ageGroup={ageGroup}
              captions={captions}
              trackAs={trackAs}
              trackMode={trackMode}
              playbackRef={playbackRef}
              onTime={setCurrentTime}
            />
          </div>
          {chapters.length > 0 && (
            <nav className="mt-4 border-t border-[#F0EAE0] pt-3" aria-label="Lesson chapters">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="m-0 text-sm font-black">Lesson chapters</h3>
                <span className="text-xs font-bold text-[#6B7280]">{chapters.length} sections</span>
              </div>
              <ol className="m-0 grid list-none gap-2 p-0">
                {chapters.map((chapter, index) => {
                  const active = index === activeChapter;
                  return (
                    <li key={chapter.id || chapter.title || index}>
                      <button
                        type="button"
                        onClick={() => jumpToChapter(chapter)}
                        aria-current={active ? "step" : undefined}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-[#7C3AED] bg-[#F5F0FF]" : "border-[#F0EAE0] bg-white hover:bg-[#FAF7FF]"}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${active ? "bg-[#7C3AED] text-white" : "bg-[#F3EEE6] text-[#6B7280]"}`}>
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-extrabold">{chapter.title || `Chapter ${index + 1}`}</span>
                          {Array.isArray(chapter.concepts) && chapter.concepts.length > 0 && (
                            <span className="mt-0.5 block text-xs text-[#6B7280]">{chapter.concepts.join(" · ")}</span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-[#6B7280]">{formatTime(chapter.startSeconds)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </section>
      )}

      {assets.length > 0 && (
        <section className="mt-4 flex flex-col gap-4">
          <header className="mb-1">
            <h2 className="m-0 text-[1.05rem] font-black text-[#1F2937]">
              {assets.some((a) => a.glbUrl) ? "3D models" : "Lesson stills"}
            </h2>
            <p className="mt-1 text-[0.88rem] font-bold text-[#6B7280]">
              {assets.some((a) => a.glbUrl) ? "Each still sits beside its Tripo model." : "Stills from this pack (enable Tripo for 3D)."}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-3.5 items-stretch xl:grid-cols-2">
            {assets.map((asset) => {
              const stillUrl = asset.sourceImageUrl || asset.previewUrl;
              return (
                <article key={asset.id} className="relative flex min-w-0 flex-col isolate overflow-hidden rounded-[22px] border-2 border-[#F0EAE0] bg-white text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]">
                  <div className="grid min-h-[260px] grid-cols-1 items-stretch border-b-2 border-[#F0EAE0] sm:grid-cols-2">
                    <StillViewer stillUrl={stillUrl} label={asset.label} />
                    <AssetViewer mesh={asset.mesh} label={asset.label} glbUrl={asset.glbUrl} labels={asset.labels} />
                  </div>
                  <div className="relative z-[1] grid gap-2 p-3">
                    <h3 className="m-0 text-base font-black">{asset.label}</h3>
                    {asset.reason && <p className="m-0 text-[0.85rem] text-[#6B7280]">{asset.reason}</p>}
                    {asset.labels?.length > 0 && <ul className="m-0 list-disc pl-4 text-[0.8rem] text-[#1F2937]">{asset.labels.map((label) => <li key={label.id || label.text}>{label.text}</li>)}</ul>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {!hasVideo && !assets.length && <p className="font-bold text-[#6B7280]">This pack has no video or 3D assets yet.</p>}
    </div>
  );
}
