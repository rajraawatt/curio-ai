import { useEffect, useRef, useState } from "react";
import { AnalyticsPanel } from "./components/AnalyticsPanel.jsx";
import { QuestionPanel } from "./components/QuestionPanel.jsx";
import { SidePanel } from "./components/SidePanel.jsx";
import { Toolbar } from "./components/Toolbar.jsx";
import { VideoSettings } from "./components/VideoSettings.jsx";
import { narrate, stopNarration } from "./speech.js";
import { stageAt, textOf } from "./text.js";
import { useClassroom } from "./useClassroom.js";
import { World } from "./World.jsx";

export function Teacher() {
  const { state, connected, send } = useClassroom();
  const [nav, setNav] = useState("classroom");
  const [audioOn, setAudioOn] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [projecting, setProjecting] = useState(false);
  const [health, setHealth] = useState(null);
  const spoken = useRef("");

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

  useEffect(() => {
    if (!state || !audioOn) return;
    const lang = state.language;
    let line = "";
    let key = "";
    if (state.phase === "transforming" && state.transform && !state.transform.planning) {
      const stage = stageAt(state);
      line = textOf(stage?.narration, lang);
      key = `t-${state.transform.index}-${lang}`;
    } else if (state.phase === "returning") {
      line = textOf(
        {
          en: "Back to the mountain. The lesson continues.",
          hi: "पहाड़ पर वापस। पाठ जारी है।",
          es: "De vuelta a la montaña. La lección continúa.",
        },
        lang
      );
      key = `return-${lang}`;
    } else if (state.phase === "live" && state.playing) {
      line = textOf(state.lesson.narration, lang);
      key = `live-${lang}`;
    }
    if (!line || spoken.current === key) return;
    spoken.current = key;
    narrate(line, lang, key);
  }, [state, audioOn]);

  useEffect(() => () => stopNarration(), []);

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
    <main className={`teacher ${projecting ? "projecting" : ""}`}>
      <SidePanel nav={nav} onNav={setNav} connected={connected} />

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
              <World state={state} captions={captions} onJump={(index) => act("jump", { index })} />
              <Toolbar
                state={state}
                act={act}
                audioOn={audioOn}
                captions={captions}
                projecting={projecting}
                onAudio={() => setAudioOn((value) => !value)}
                onCaptions={() => setCaptions((value) => !value)}
                onProject={() => setProjecting((value) => !value)}
              />
            </div>
            <QuestionPanel state={state} act={act} exploreId={exploreId} />
          </div>
        )}

        {nav === "analytics" && <AnalyticsPanel state={state} />}
        {nav === "settings" && <VideoSettings state={state} health={health} act={act} send={send} />}
      </section>
    </main>
  );
}
