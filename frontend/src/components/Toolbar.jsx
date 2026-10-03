import { useState } from "react";
import { ParticipantsPopover, useParticipants } from "./ParticipantsPanel.jsx";

function Lang({ state, act }) {
  return (
    <div className="g-toolbar__lang">
      {["en", "hi", "es"].map((code) => (
        <button
          key={code}
          type="button"
          className={state.language === code ? "is-on" : ""}
          onClick={() => act("language", { language: code })}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ state, act, captions, onCaptions, onUpload, uploadActive }) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const participants = useParticipants(state);
  const count = participants.length;

  return (
    <div className="g-toolbar">
      {state.phase === "transforming" ? (
        <>
          <button type="button" className="g-btn g-btn--blue" onClick={() => act("advance")} disabled={state.transform?.planning}>
            Next beat
          </button>
          <button type="button" className="g-btn" onClick={() => act(state.playing ? "pause" : "play")}>
            {state.playing ? "Pause" : "Resume"}
          </button>
          <button type="button" className="g-btn" onClick={() => act("return")}>
            Return
          </button>
        </>
      ) : state.phase === "selected" ? (
        <>
          <button type="button" className="g-btn g-btn--blue" onClick={() => act("explore", { questionId: state.selectedId })}>
            Explore
          </button>
          <button type="button" className="g-btn" onClick={() => act("return")}>
            Back
          </button>
        </>
      ) : (
        <button type="button" className="g-btn g-btn--blue" onClick={() => act(state.playing ? "pause" : "play")}>
          {state.playing ? "Pause" : "Resume"}
        </button>
      )}
      <button type="button" className={`g-btn${captions ? " is-on" : ""}`} onClick={onCaptions}>
        Captions
      </button>
      {onUpload && (
        <button type="button" className={`g-btn g-btn--yellow${uploadActive ? " is-on" : ""}`} onClick={onUpload}>
          Upload
        </button>
      )}

      <div className="g-toolbar__people">
        <button
          type="button"
          className={`g-toolbar__people-btn${peopleOpen ? " is-on" : ""}`}
          title="Participants"
          aria-expanded={peopleOpen}
          onClick={() => setPeopleOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" />
            <path d="M16 13c-2.5 0-4.5 1.4-4.5 3.2V18h9v-1.8c0-1.8-2-3.2-4.5-3.2zM8 13c-.4 0-.8 0-1.2.1C4.8 13.4 3 14.7 3 16.2V18h5.5v-1.8c0-.7.2-1.4.6-2A7 7 0 0 1 8 13z" />
          </svg>
          <span className="g-toolbar__people-count">{count}</span>
        </button>
        <ParticipantsPopover state={state} open={peopleOpen} onClose={() => setPeopleOpen(false)} />
      </div>

      <Lang state={state} act={act} />
    </div>
  );
}
