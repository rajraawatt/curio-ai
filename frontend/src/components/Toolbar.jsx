function Lang({ state, act }) {
  return (
    <div className="lang">
      {["en", "hi", "es"].map((code) => (
        <button
          key={code}
          type="button"
          className={state.language === code ? "on" : ""}
          onClick={() => act("language", { language: code })}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ state, act, captions, projecting, onCaptions, onProject, onUpload, uploadActive }) {
  return (
    <div className="transport">
      {state.phase === "transforming" ? (
        <>
          <button type="button" className="primary" onClick={() => act("advance")} disabled={state.transform?.planning}>
            Next beat
          </button>
          <button type="button" onClick={() => act(state.playing ? "pause" : "play")}>
            {state.playing ? "Pause" : "Resume"}
          </button>
          <button type="button" onClick={() => act("return")}>
            Return to lesson
          </button>
        </>
      ) : state.phase === "selected" ? (
        <>
          <button type="button" className="primary" onClick={() => act("explore", { questionId: state.selectedId })}>
            Explore question
          </button>
          <button type="button" onClick={() => act("return")}>
            Back to lesson
          </button>
        </>
      ) : (
        <button type="button" className="primary" onClick={() => act(state.playing ? "pause" : "play")}>
          {state.playing ? "Pause" : "Resume"}
        </button>
      )}
      <button type="button" className={captions ? "on" : ""} onClick={onCaptions}>
        Captions
      </button>
      <button type="button" className={projecting ? "on" : ""} onClick={onProject}>
        Project
      </button>
      {onUpload && (
        <button type="button" className={uploadActive ? "on" : ""} onClick={onUpload}>
          Upload
        </button>
      )}
      <Lang state={state} act={act} />
    </div>
  );
}
