import { Scene } from "./scenes.jsx";
import { stageAt, textOf, visualOf } from "./text.js";

export function World({ state, captions = true, onJump }) {
  if (!state) return <div className="world loading">Opening the classroom…</div>;

  const lang = state.language || "en";
  const visual = visualOf(state);
  const stage = state.phase === "transforming" ? stageAt(state) : null;
  const selected = state.questions.find((q) => q.id === state.selectedId);
  const caption =
    state.phase === "returning"
      ? textOf(
          {
            en: "Back to the mountain.",
            hi: "पहाड़ पर वापस।",
            es: "De vuelta a la montaña.",
          },
          lang
        )
      : stage
        ? textOf(stage.caption, lang)
        : textOf(state.lesson.narration, lang);

  const showQuestion = state.phase === "selected" && selected;
  const stages = state.transform?.stages || [];

  return (
    <div className={`world phase-${state.phase} ${state.playing ? "is-playing" : "is-paused"}`}>
      <div className="world-top">
        <div>
          <p className="eyebrow">Today's lesson</p>
          <h2>{state.lesson.title}</h2>
        </div>
        <div className="pills">
          {state.phase === "transforming" ? (
            <span className="pill transform">World transforming</span>
          ) : state.playing ? (
            <span className="pill live">Live</span>
          ) : (
            <span className="pill paused">Paused</span>
          )}
          {state.transform?.source === "gemini" && <span className="pill gemini">Gemini</span>}
          {state.transform?.source === "script" && <span className="pill script">Lesson scene</span>}
        </div>
      </div>

      <Scene key={`${visual}-${stage ? state.transform.index : state.phase}`} visual={visual} stage={stage} />

      {state.diagram?.image && state.diagram.stageIndex === state.transform?.index && (
        <img className="diagram" alt="Generated classroom diagram" src={state.diagram.image} />
      )}
      {state.diagram?.pending && <div className="diagram pending">Imagen is drawing this idea…</div>}

      {showQuestion && (
        <aside className="qcard">
          <p>{selected.name}'s question</p>
          <strong>{selected.text}</strong>
        </aside>
      )}

      {captions && caption && !showQuestion && (
        <div className="caption">
          <span className="speaker" aria-hidden="true" />
          <p>{caption}</p>
        </div>
      )}

      {state.phase === "transforming" && stages.length > 0 && (
        <ol className="rail">
          {stages.map((item, index) => (
            <li key={`${item.visual}-${index}`}>
              <button
                type="button"
                className={index === state.transform.index ? "now" : index < state.transform.index ? "done" : ""}
                onClick={onJump ? () => onJump(index) : undefined}
                disabled={!onJump}
              >
                {textOf(item.label, lang)}
              </button>
            </li>
          ))}
        </ol>
      )}

      {state.phase !== "transforming" && (
        <div className={`scrubber ${state.playing ? "run" : ""}`} aria-hidden="true">
          <i />
        </div>
      )}
    </div>
  );
}
