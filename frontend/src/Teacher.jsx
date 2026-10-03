import { useEffect, useState } from "react";
import { AnalyticsPanel } from "./components/AnalyticsPanel.jsx";
import { SidePanel } from "./components/SidePanel.jsx";
import { ClassLessonStage, stageClipFromPack } from "./components/ClassLessonStage.jsx";
import { PrepareAssetPicker } from "./components/PrepareAssetPicker.jsx";
import { TeacherRightRail } from "./components/TeacherRightRail.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { VideoSettings } from "./components/VideoSettings.jsx";
import { PrepareStudio } from "./Prepare.jsx";
import { useClassroom } from "./useClassroom.js";

const TEACHER_TABS = new Set(["classroom", "prepare", "analytics", "settings"]);

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
    <div className="ai-clips-stage">
      <p className="ai-clips-kicker">AI clips for the class</p>
      <div className="ai-clips-row">
        {aiClips.clips.map((clip) => (
          <article key={clip.id} className="ai-clip-card">
            <div className="ai-clip-poster" aria-hidden="true" />
            <h3>{clip.title}</h3>
            <p>{clip.summary}</p>
            <span>
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

  function goNav(next) {
    const tab = TEACHER_TABS.has(next) ? next : "classroom";
    setNav(tab);
    setTabInUrl(tab);
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
    return <main className="boot g-boot">Opening the teacher desk…</main>;
  }

  const selected = state.questions.find((q) => q.id === state.selectedId);
  const exploreId = selected?.id || state.questions.find((q) => q.status === "new")?.id;
  const livePack = stagePack || state.liveLesson;
  const hasLessonVideo = Boolean(livePack && stageClipFromPack(livePack));
  const showChat = nav === "classroom";
  const widePanel = nav === "analytics" || nav === "prepare";

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
    <main className={`g-teacher${widePanel ? " is-analytics" : ""}`}>
      <SidePanel nav={nav} onNav={goNav} connected={connected} room={state.room} />

      <section className="g-teacher__center">
        {state.notice && (
          <div className="g-notice">
            <p>{state.notice}</p>
            <button type="button" className="g-btn" onClick={() => act("notice", { notice: null })}>
              Dismiss
            </button>
          </div>
        )}

        {nav === "classroom" && (
          <div className="g-teacher__stage-wrap">
            {hasLessonVideo ? (
              <div className="stage-with-overlay">
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
              <div className="g-stage-blank" aria-label="Lesson stage">
                {!(state.aiClips?.showing && state.aiClips.clips?.length) && (
                  <div className="g-stage-blank__copy">
                    <p className="g-stage-blank__title">Lesson stage</p>
                    <p>Upload a prepared pack to show the class video here.</p>
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
            <PrepareAssetPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onSelect={shareLiveLesson}
            />
          </div>
        )}

        {nav === "prepare" && (
          <div className="g-teacher__panel g-teacher__panel--prepare">
            <PrepareStudio embedded />
          </div>
        )}

        {nav === "analytics" && (
          <div className="g-teacher__panel g-teacher__panel--analytics">
            <AnalyticsPanel state={state} connected={connected} onExit={() => goNav("classroom")} />
          </div>
        )}
        {nav === "settings" && (
          <div className="g-teacher__panel">
            <VideoSettings state={state} health={health} act={act} send={send} />
          </div>
        )}
      </section>

      {showChat && <TeacherRightRail state={state} act={act} exploreId={exploreId} />}
    </main>
  );
}
