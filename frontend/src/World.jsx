import { Scene } from "./scenes.jsx";
import { cx } from "./ui.js";
import { stageAt, textOf, visualOf } from "./text.js";

const pillBase =
  "rounded-full border-0 px-3 py-2 text-sm font-medium";

const PILL = {
  transform: `${pillBase} bg-amber-300 text-[#3c4043]`,
  live: `${pillBase} bg-emerald-500 text-white`,
  paused: `${pillBase} bg-amber-300 text-[#3c4043]`,
  gemini: `${pillBase} bg-violet-soft text-violet-deep`,
  script: `${pillBase} bg-white/90 text-ink`,
};

export function World({ state, captions = true, onJump }) {
  if (!state) {
    return (
      <div className="relative flex min-h-[460px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-[#3c4043] bg-[#202124] font-sans font-bold text-white">
        Opening the classroom…
      </div>
    );
  }

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
    <div className="relative min-h-[460px] flex-1 overflow-hidden rounded-xl border border-[#3c4043] bg-[#202124] font-sans text-white">
      <div className="absolute inset-x-4 top-4 z-[3] flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[0.75rem] uppercase tracking-[0.08em] opacity-85">Today&apos;s lesson</p>
          <h2 className="m-0.5 mt-0.5 text-[1.35rem] tracking-[-0.03em] [text-shadow:0_8px_24px_rgba(0,0,0,0.35)]">
            {state.lesson.title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.phase === "transforming" ? (
            <span className={PILL.transform}>World transforming</span>
          ) : state.playing ? (
            <span className={PILL.live}>Live</span>
          ) : (
            <span className={PILL.paused}>Paused</span>
          )}
          {state.transform?.source === "gemini" && <span className={PILL.gemini}>Gemini</span>}
          {state.transform?.source === "script" && <span className={PILL.script}>Lesson scene</span>}
        </div>
      </div>

      <Scene key={`${visual}-${stage ? state.transform.index : state.phase}`} visual={visual} stage={stage} />

      {state.diagram?.image && state.diagram.stageIndex === state.transform?.index && (
        <img
          className="absolute bottom-[72px] right-[18px] z-[4] w-[min(280px,36%)] rounded-2xl shadow-lg"
          alt="Generated classroom diagram"
          src={state.diagram.image}
        />
      )}
      {state.diagram?.pending && (
        <div className="absolute bottom-[72px] right-[18px] z-[4] rounded-2xl bg-white px-3 py-2.5 font-bold text-ink shadow-lg">
          Imagen is drawing this idea…
        </div>
      )}

      {showQuestion && (
        <aside className="absolute bottom-16 left-[18px] z-[3] flex max-w-[min(460px,80%)] flex-col gap-1 rounded-2xl bg-white/95 px-3.5 py-3 text-ink shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <p className="m-0 text-[0.8rem] font-bold text-violet">{selected.name}&apos;s question</p>
          <strong className="text-[1.15rem]">{selected.text}</strong>
        </aside>
      )}

      {captions && caption && !showQuestion && (
        <div className="absolute bottom-16 left-[18px] z-[3] flex max-w-[min(460px,80%)] items-start gap-2.5 rounded-2xl bg-white/95 px-3.5 py-3 text-ink shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <span className="mt-0.5 size-4 shrink-0 rounded-full bg-violet" aria-hidden="true" />
          <p className="m-0 font-bold">{caption}</p>
        </div>
      )}

      {state.phase === "transforming" && stages.length > 0 && (
        <ol className="absolute inset-x-4 bottom-3.5 z-[3] m-0 flex list-none gap-1.5 p-0">
          {stages.map((item, index) => (
            <li key={`${item.visual}-${index}`} className="flex-1">
              <button
                type="button"
                className={cx(
                  "w-full rounded-full border-0 px-1.5 py-2 text-[0.75rem] text-white disabled:cursor-default",
                  index === state.transform.index && "bg-white font-bold text-ink",
                  index < state.transform.index && "bg-white/70 font-medium text-ink",
                  index > state.transform.index && "bg-white/30"
                )}
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
        <div
          className="absolute inset-x-[18px] bottom-4 z-[3] h-1 overflow-hidden rounded-full bg-white/35"
          aria-hidden="true"
        >
          <i
            className={cx(
              "block h-full rounded-full bg-white not-italic",
              state.playing ? "w-[38%] animate-[playhead_48s_linear_infinite]" : "w-[38%]"
            )}
          />
        </div>
      )}
    </div>
  );
}
