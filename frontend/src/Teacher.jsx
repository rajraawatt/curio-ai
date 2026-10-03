import { useEffect, useState } from "react";
import { AnalyticsPanel } from "./components/AnalyticsPanel.jsx";
import { GalleryPanel } from "./components/GalleryPanel.jsx";
import { SidePanel } from "./components/SidePanel.jsx";
import { ClassLessonStage, stageClipFromPack } from "./components/ClassLessonStage.jsx";
import { PrepareAssetPicker } from "./components/PrepareAssetPicker.jsx";
import { TeacherRightRail } from "./components/TeacherRightRail.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { VideoSettings } from "./components/VideoSettings.jsx";
import { PrepareStudio } from "./Prepare.jsx";
import { prefetchGallery } from "./galleryCache.js";
import { btn, cx } from "./ui.js";
import { useClassroom } from "./useClassroom.js";

const TEACHER_TABS = new Set(["classroom", "prepare", "gallery", "analytics", "settings"]);

function tabFromUrl() {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return TEACHER_TABS.has(tab) ? tab : "classroom";
}

function setTabInUrl(tab) {
  const url = new URL(window.location.href);
  if (tab === "classroom") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function AiClipsOverlay({ aiClips }) {
  if (!aiClips?.showing || !aiClips.clips?.length) return null;
  return (
    <div className="absolute inset-x-3 bottom-3 z-[2] rounded-xl border border-[#5f6368] bg-[rgba(32,33,36,0.92)] p-3 backdrop-blur-[6px]">
      <p className="mb-2 mt-0 text-[0.72rem] uppercase tracking-[0.04em] text-[#8ab4f8]">AI clips for the class</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
        {aiClips.clips.map((clip) => (
          <article key={clip.id} className="grid gap-1 rounded-[10px] border border-[#3c4043] bg-[#0b1220] p-2">
            <div
              className="grid h-[72px] place-items-center rounded-lg bg-gradient-to-br from-[#1a237e] to-[#0b1220] text-[0.72rem] text-[#c6dafc]"
              aria-hidden="true"
            />
            <h3 className="m-0 text-[0.8rem] font-medium text-[#e8eaed]">{clip.title}</h3>
            <p className="m-0 text-[0.7rem] text-[#bdc1c6]">{clip.summary}</p>
            <span className="text-[0.68rem] text-[#8ab4f8]">
              {clip.durationSeconds}s · {clip.status}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Teacher() {
  const { state, connected, send } = useClassroom();
  const [nav, setNav] = useState(tabFromUrl);
  const [captions, setCaptions] = useState(true);
  const [health, setHealth] = useState(null);
  const [stagePack, setStagePack] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prepareMounted, setPrepareMounted] = useState(() => tabFromUrl() === "prepare");
  const [galleryMounted, setGalleryMounted] = useState(true);

  function goNav(next) {
    const tab = TEACHER_TABS.has(next) ? next : "classroom";
    setNav(tab);
    setTabInUrl(tab);
    if (tab === "prepare") setPrepareMounted(true);
    if (tab === "gallery") setGalleryMounted(true);
  }

  useEffect(() => {
    const onPopState = () => setNav(tabFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => {});
    prefetchGallery().catch(() => {});
  }, []);

  useEffect(() => {
    if (!state || state.phase !== "transforming" || !state.playing || state.transform?.planning) return;
    if (state.transform.index >= state.transform.stages.length - 1) return;
    const timer = setTimeout(() => {
      send("/api/control", { action: "advance" }).catch(() => {});
    }, 8000);
    return () => clearTimeout(timer);
  }, [state?.phase, state?.playing, state?.transform?.index, state?.transform?.planning, state?.transform?.stages?.length, send]);

  async function act(action, extra = {}) {
    try {
      await send("/api/control", { action, ...extra });
    } catch (err) {
      await send("/api/control", { action: "notice", notice: err.message }).catch(() => {});
    }
  }

  if (!state) {
    return <main className="grid min-h-screen place-items-center bg-cream font-sans font-bold text-ink">Opening the teacher desk…</main>;
  }

  const selected = state.questions.find((q) => q.id === state.selectedId);
  const exploreId = selected?.id || state.questions.find((q) => q.status === "new")?.id;
  const livePack = stagePack || state.liveLesson;
  const hasLessonVideo = Boolean(livePack && stageClipFromPack(livePack));
  const showChat = nav === "classroom";
  const widePanel = nav === "analytics" || nav === "prepare" || nav === "gallery";

  async function shareLiveLesson(pack) {
    setStagePack(pack);
    setPickerOpen(false);
    await act("setLiveLesson", { pack });
  }

  async function clearLiveLesson() {
    setStagePack(null);
    await act("clearLiveLesson");
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-cream font-sans">
      <SidePanel nav={nav} onNav={goNav} connected={connected} room={state.room} />

      <section className={cx("z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-3", widePanel ? "overflow-hidden p-0" : "overflow-visible px-5 py-4")}>
        {state.notice && (
          <div className="flex items-center justify-between gap-3 rounded-[20px] border-2 border-[rgba(196,181,253,0.55)] bg-white px-4 py-3 text-ink shadow-[0_4px_0_rgba(0,0,0,0.05)]">
            <p className="m-0 font-bold">{state.notice}</p>
            <button type="button" className={btn} onClick={() => act("notice", { notice: null })}>
              Dismiss
            </button>
          </div>
        )}

        {nav === "classroom" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible">
            {hasLessonVideo ? (
              <div className="relative">
                <ClassLessonStage
                  pack={livePack}
                  language={state.language}
                  captions={captions}
                  playing={state.playing}
                  onClear={clearLiveLesson}
                />
                <AiClipsOverlay aiClips={state.aiClips} />
              </div>
            ) : (
              <div
                className="relative grid min-h-[360px] flex-1 place-items-center rounded-[32px] border-[3px] border-dashed border-[rgba(124,58,237,0.2)] bg-white/55 p-7"
                aria-label="Lesson stage"
              >
                {!(state.aiClips?.showing && state.aiClips.clips?.length) && (
                  <div className="grid max-w-[34ch] gap-2 text-center">
                    <p className="m-0 text-[1.15rem] font-black tracking-[-0.02em] text-violet">Lesson stage</p>
                    <p className="m-0 text-[0.95rem] font-bold leading-[1.45] text-muted">
                      Upload a prepared pack to show the class video here.
                    </p>
                  </div>
                )}
                <AiClipsOverlay aiClips={state.aiClips} />
              </div>
            )}
            <Toolbar
              state={state}
              act={act}
              captions={captions}
              onCaptions={() => setCaptions((value) => !value)}
              onUpload={() => setPickerOpen(true)}
              uploadActive={Boolean(livePack)}
            />
            <PrepareAssetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={shareLiveLesson} />
          </div>
        )}

        {prepareMounted && (
          <div
            className={cx(
              "min-h-0 flex-1 bg-transparent p-0 shadow-none",
              nav === "prepare" ? "overflow-y-auto" : "hidden",
            )}
            aria-hidden={nav !== "prepare"}
          >
            <PrepareStudio embedded />
          </div>
        )}

        {galleryMounted && (
          <div
            className={cx(
              "min-h-0 flex-1 bg-transparent p-0 shadow-none",
              nav === "gallery" ? "overflow-y-auto" : "hidden",
            )}
            aria-hidden={nav !== "gallery"}
          >
            <GalleryPanel onExit={() => goNav("classroom")} />
          </div>
        )}

        {nav === "analytics" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent p-0 shadow-none">
            <AnalyticsPanel state={state} connected={connected} onExit={() => goNav("classroom")} />
          </div>
        )}
        {nav === "settings" && (
          <div className="min-h-0 flex-1 overflow-auto rounded-[32px] bg-white p-4 shadow-panel">
            <VideoSettings state={state} health={health} act={act} send={send} />
          </div>
        )}
      </section>

      {showChat && <TeacherRightRail state={state} act={act} exploreId={exploreId} />}
    </main>
  );
}
