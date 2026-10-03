import { AssetViewer, StillViewer } from "./AssetViewer.jsx";
import { clipAnalyticsMeta } from "../clipAnalyticsMeta.js";
import { LessonClipPlayer } from "./LessonClipPlayer.jsx";
import { stageClipFromPack } from "./ClassLessonStage.jsx";

/** Shared video + still|3D row used by Prepare, Gallery, and student Learning. */
export function PackMediaView({
  pack,
  language = "en",
  captions = true,
  showVideo = true,
  trackAs = "Gallery",
  trackMode = "self_paced",
}) {
  if (!pack) return null;
  const ageGroup = pack.ageGroup || "11-14";
  const lang = pack.language || language;
  const hasVideo = Boolean(stageClipFromPack(pack));
  const assets = Array.isArray(pack.assets) ? pack.assets : [];

  return (
    <div className="grid gap-4 font-[Nunito,sans-serif]">
      {showVideo && hasVideo && (
        <section className="mt-3.5 rounded-[22px] border-2 border-[#F0EAE0] bg-white px-4 py-3.5 text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]">
          <h2 className="mb-2.5 text-[1.05rem] font-black text-[#1F2937]">
            Lesson video (~{Math.round(pack.videoDurationSec || pack.mergedVideo?.durationSeconds || 16)}s)
          </h2>
          <div className="grid max-w-[720px] grid-cols-1 gap-3">
            <LessonClipPlayer
              key={pack.mergedVideo?.url || pack.videos?.[0]?.url}
              clip={clipAnalyticsMeta(pack.mergedVideo || pack.videos[0], pack)}
              lang={lang}
              ageGroup={ageGroup}
              captions={captions}
              trackAs={trackAs}
              trackMode={trackMode}
            />
          </div>
        </section>
      )}

      {assets.length > 0 && (
        <section className="mt-4 flex flex-col gap-4">
          <header className="mb-1">
            <h2 className="m-0 text-[1.05rem] font-black text-[#1F2937]">
              {assets.some((a) => a.glbUrl) ? "3D models" : "Lesson stills"}
            </h2>
            <p className="mt-1 text-[0.88rem] font-bold text-[#6B7280]">
              {assets.some((a) => a.glbUrl)
                ? "Each still sits beside its Tripo model."
                : "Stills from this pack (enable Tripo for 3D)."}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-3.5 items-stretch xl:grid-cols-2">
            {assets.map((asset) => {
              const stillUrl = asset.sourceImageUrl || asset.previewUrl;
              return (
                <article
                  key={asset.id}
                  className="relative flex min-w-0 flex-col isolate overflow-hidden rounded-[22px] border-2 border-[#F0EAE0] bg-white text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]"
                >
                  <div className="grid min-h-[260px] grid-cols-1 items-stretch border-b-2 border-[#F0EAE0] sm:grid-cols-2">
                    <StillViewer stillUrl={stillUrl} label={asset.label} />
                    <AssetViewer mesh={asset.mesh} label={asset.label} glbUrl={asset.glbUrl} />
                  </div>
                  <div className="relative z-[1] grid gap-2 p-3">
                    <h3 className="m-0 text-base font-black">{asset.label}</h3>
                    {asset.reason && <p className="m-0 text-[0.85rem] text-[#6B7280]">{asset.reason}</p>}
                    {asset.labels?.length > 0 && (
                      <ul className="m-0 list-disc pl-4 text-[0.8rem] text-[#1F2937]">
                        {asset.labels.map((l) => (
                          <li key={l.id || l.text}>{l.text}</li>
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

      {!hasVideo && !assets.length && (
        <p className="font-bold text-[#6B7280]">This pack has no video or 3D assets yet.</p>
      )}
    </div>
  );
}
