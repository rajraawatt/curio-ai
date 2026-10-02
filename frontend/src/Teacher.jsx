import { useEffect, useState } from "react";
import { AnalyticsPanel } from "./components/AnalyticsPanel.jsx";
import { QuestionPanel } from "./components/QuestionPanel.jsx";
import { SidePanel } from "./components/SidePanel.jsx";
import { ClassLessonStage, stageClipFromPack } from "./components/ClassLessonStage.jsx";
import { PrepareAssetPicker } from "./components/PrepareAssetPicker.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { VideoSettings } from "./components/VideoSettings.jsx";
import { useClassroom } from "./useClassroom.js";

export function Teacher() {
  const { state, connected, send } = useClassroom();
  const [nav, setNav] = useState("classroom");
  const [captions, setCaptions] = useState(true);
  const [projecting, setProjecting] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [health, setHealth] = useState(null);
  const [stagePack, setStagePack] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    return <main className="boot">Opening the teacher desk…</main>;
  }

  const selected = state.questions.find((q) => q.id === state.selectedId);
  const exploreId = selected?.id || state.questions.find((q) => q.status === "new")?.id;

  return (
    <main
      className={`teacher ${projecting ? "projecting" : ""} ${nav === "analytics" ? "analytics-focus" : ""} ${sideCollapsed ? "side-is-collapsed" : ""}`}
    >
      <SidePanel
        nav={nav}
        onNav={setNav}
        connected={connected}
        room={state.room}
        collapsed={sideCollapsed}
        onToggle={() => setSideCollapsed((value) => !value)}
      />

      <section className="desk">
        {state.notice && (
          <div className="notice">
            <p>{state.notice}</p>
            <button type="button" onClick={() => act("notice", { notice: null })}>
              Dismiss
            </button>
          </div>
        )}

        {(nav === "classroom" || nav === "questions") && (
          <div className="class-grid">
            <div>
              {stagePack && stageClipFromPack(stagePack) ? (
                <ClassLessonStage
                  pack={stagePack}
                  language={state.language}
                  captions={captions}
                  playing={state.playing}
                  onClear={() => setStagePack(null)}
                />
              ) : (
                <div className="stage-empty" aria-label="Lesson stage">
                  <img className="stage-sample" src="/sample-lesson.svg" alt="Lesson frame placeholder" />
                  <div className="stage-empty-copy">
                    <p className="stage-empty-kicker">Lesson stage</p>
                    <h2>{state.lesson?.title || "How mountains form"}</h2>
                    <p>Use Upload to load a lesson video from Prepare assets.</p>
                    <span className="stage-empty-meta">
                      {state.phase} · {state.playing ? "playing" : "paused"} · Room {state.room}
                    </span>
                  </div>
                </div>
              )}
              <Toolbar
                state={state}
                act={act}
                captions={captions}
                projecting={projecting}
                onCaptions={() => setCaptions((value) => !value)}
                onProject={() => setProjecting((value) => !value)}
                onUpload={() => setPickerOpen(true)}
                uploadActive={Boolean(stagePack)}
              />
              <PrepareAssetPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={(pack) => {
                  setStagePack(pack);
                  setPickerOpen(false);
                  act("notice", { notice: `Loaded ${pack.topic || "prepared lesson"}` });
                }}
              />
            </div>
            <QuestionPanel state={state} act={act} exploreId={exploreId} />
          </div>
        )}

        {nav === "analytics" && (
          <AnalyticsPanel state={state} connected={connected} onExit={() => setNav("classroom")} />
        )}
        {nav === "settings" && <VideoSettings state={state} health={health} act={act} send={send} />}
      </section>
    </main>
  );
}
