import { useState } from "react";
import { btn, btnOn, btnViolet, btnYellow, cx } from "../ui.js";
import { ParticipantsPopover, useParticipants } from "./ParticipantsPanel.jsx";

function Lang({ state, act }) {
  return (
    <div className="ml-auto flex gap-0.5 rounded-full bg-hover p-1">
      {["en", "hi", "es"].map((code) => (
        <button
          key={code}
          type="button"
          className={cx(
            "cursor-pointer rounded-full border-0 px-3 py-2 text-[0.75rem] font-extrabold uppercase",
            state.language === code ? "bg-violet text-white" : "bg-transparent text-[#9ca3af]"
          )}
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
    <div className="relative z-30 flex flex-wrap items-center gap-2 rounded-full border-2 border-[rgba(124,58,237,0.08)] bg-white px-3 py-2.5 shadow-[0_8px_0_rgba(124,58,237,0.08)]">
      {state.phase === "transforming" ? (
        <>
          <button type="button" className={btnViolet} onClick={() => act("advance")} disabled={state.transform?.planning}>
            Next beat
          </button>
          <button type="button" className={btn} onClick={() => act(state.playing ? "pause" : "play")}>
            {state.playing ? "Pause" : "Resume"}
          </button>
          <button type="button" className={btn} onClick={() => act("return")}>
            Return
          </button>
        </>
      ) : state.phase === "selected" ? (
        <>
          <button type="button" className={btnViolet} onClick={() => act("explore", { questionId: state.selectedId })}>
            Explore
          </button>
          <button type="button" className={btn} onClick={() => act("return")}>
            Back
          </button>
        </>
      ) : (
        <button type="button" className={btnViolet} onClick={() => act(state.playing ? "pause" : "play")}>
          {state.playing ? "Pause" : "Resume"}
        </button>
      )}
      <button type="button" className={cx(btn, captions && btnOn)} onClick={onCaptions}>
        Captions
      </button>
      {onUpload && (
        <button type="button" className={cx(btnYellow, uploadActive && "ring-2 ring-violet/20")} onClick={onUpload}>
          Upload
        </button>
      )}

      <div className="relative">
        <button
          type="button"
          className={cx(
            "relative grid size-11 place-items-center rounded-full border-2 bg-white text-violet shadow-[0_3px_0_rgba(124,58,237,0.08)]",
            peopleOpen
              ? "border-[rgba(124,58,237,0.28)] bg-violet-soft"
              : "border-[rgba(124,58,237,0.12)] hover:border-[rgba(124,58,237,0.28)] hover:bg-violet-soft"
          )}
          title="Participants"
          aria-expanded={peopleOpen}
          onClick={() => setPeopleOpen((value) => !value)}
        >
          <svg className="size-[22px] fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" />
            <path d="M16 13c-2.5 0-4.5 1.4-4.5 3.2V18h9v-1.8c0-1.8-2-3.2-4.5-3.2zM8 13c-.4 0-.8 0-1.2.1C4.8 13.4 3 14.7 3 16.2V18h5.5v-1.8c0-.7.2-1.4.6-2A7 7 0 0 1 8 13z" />
          </svg>
          <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-violet px-[5px] text-[10px] font-extrabold text-white">
            {count}
          </span>
        </button>
        <ParticipantsPopover state={state} open={peopleOpen} onClose={() => setPeopleOpen(false)} />
      </div>

      <Lang state={state} act={act} />
    </div>
  );
}
