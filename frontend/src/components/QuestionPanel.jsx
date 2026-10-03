import { useMemo, useState } from "react";
import { btn, btnPink, btnViolet, cx, noScrollbar } from "../ui.js";

export function QuestionPanel({ state, act, exploreId }) {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState(() => new Set());
  const aiClips = state.aiClips;
  const planning = aiClips?.status === "planning";
  const pickCount = picked.size;

  const covered = useMemo(() => {
    const ids = new Set();
    for (const clip of aiClips?.clips || []) {
      for (const id of clip.coversQuestionIds || []) ids.add(id);
    }
    return ids;
  }, [aiClips]);

  function togglePick(questionId, event) {
    event.stopPropagation();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function selectAllNew() {
    setPicked(new Set(state.questions.filter((q) => q.status === "new" || q.status === "selected").map((q) => q.id)));
  }

  function clearPicks() {
    setPicked(new Set());
  }

  async function sendToAi() {
    if (!pickCount || planning) return;
    await act("generateAiClips", { questionIds: [...picked] });
  }

  return (
    <section
      className={cx("flex w-auto flex-col overflow-hidden border-0 bg-white shadow-none", open ? "h-full min-h-0 flex-1" : "h-auto shrink-0 grow-0")}
      aria-label="Class questions"
    >
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-b-2 border-[#f3f4f6] px-[18px] py-4">
        <h3 className="m-0 flex items-center gap-2 text-base font-extrabold text-ink">
          <svg
            className="size-6 fill-none stroke-violet stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 10h8M8 14h5" />
            <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          </svg>
          Class Chat
        </h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-pink px-3 py-1 text-xs font-extrabold text-white">{state.questions.length}</span>
          <button
            type="button"
            className="grid size-[34px] shrink-0 place-items-center rounded-full border-0 bg-violet-soft text-violet hover:bg-[#E4D4FF]"
            title={open ? "Collapse chat" : "Expand chat"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <svg
              className="size-[18px] fill-none stroke-current stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {open ? <path d="M6 9l6 6 6-6" /> : <path d="M6 15l6-6 6 6" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <>
          {state.hands.length > 0 && (
            <p className="m-0 px-6 pt-2 text-[0.8rem] font-bold text-violet">
              {state.hands.map((hand) => hand.name).join(", ")} raised a hand
            </p>
          )}

          <div className="flex items-center gap-2.5 px-6 pt-2.5 text-[0.78rem] font-bold text-muted">
            <span>{pickCount} picked</span>
            <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[0.78rem] font-extrabold text-violet" onClick={selectAllNew}>
              Pick open
            </button>
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-[0.78rem] font-extrabold text-violet disabled:opacity-40"
              onClick={clearPicks}
              disabled={!pickCount}
            >
              Clear
            </button>
          </div>

          <div className={cx("flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-[rgba(249,250,251,0.6)] px-5 py-4", noScrollbar)}>
            {state.questions.length === 0 && (
              <p className="my-6 text-center text-[0.9rem] font-bold text-[#9ca3af]">No questions yet — students will appear here.</p>
            )}
            {state.questions.map((question) => {
              const checked = picked.has(question.id);
              const inBatch = covered.has(question.id);
              const selected = question.id === state.selectedId;
              return (
                <div key={question.id} className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-2">
                  <label className="relative mt-3 grid size-[22px] cursor-pointer place-items-center" title="Include for AI">
                    <input
                      type="checkbox"
                      className="absolute inset-0 z-[1] m-0 cursor-pointer opacity-0"
                      checked={checked}
                      onChange={(event) => togglePick(question.id, event)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span
                      className={cx(
                        "grid size-[22px] place-items-center rounded-lg border-2 transition-[background,border-color,box-shadow] duration-150",
                        checked
                          ? "border-violet bg-violet shadow-[0_3px_0_rgba(124,58,237,0.25)]"
                          : "border-line bg-white shadow-[0_2px_0_rgba(124,58,237,0.06)] hover:border-lilac hover:bg-violet-soft"
                      )}
                      aria-hidden="true"
                    >
                      <svg
                        className={cx(
                          "size-3.5 fill-none stroke-white stroke-[3] [stroke-linecap:round] [stroke-linejoin:round] transition-[opacity,transform] duration-100",
                          checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
                        )}
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    </span>
                  </label>
                  <button
                    type="button"
                    className={cx(
                      "flex w-full cursor-pointer gap-2.5 rounded-3xl rounded-tl-md border-2 bg-white p-3 text-left font-sans shadow-[0_2px_0_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-150",
                      selected ? "border-[rgba(124,58,237,0.35)] shadow-[0_4px_0_rgba(124,58,237,0.15)]" : "border-[#f3f4f6]"
                    )}
                    onClick={() => act("select", { questionId: question.id })}
                  >
                    {question.region?.thumbnail ? (
                      <img
                        className="size-10 shrink-0 rounded-full border-2 border-white object-cover shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                        src={question.region.thumbnail}
                        alt=""
                      />
                    ) : (
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-white text-[0.72rem] font-extrabold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                        style={{ background: question.color }}
                      >
                        {question.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="grid min-w-0 gap-1">
                      <strong className="flex justify-between gap-1.5 text-[0.8rem] font-extrabold text-muted">
                        {question.name}
                        <em className="text-[0.68rem] font-bold not-italic text-[#9ca3af]">{question.concept}</em>
                      </strong>
                      <span className="text-[0.92rem] font-bold leading-[1.35] text-[#374151]">{question.text}</span>
                      {inBatch && <em className="text-[0.7rem] font-extrabold not-italic text-pink">In AI batch</em>}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {aiClips?.clips?.length > 0 && (
            <div className="mx-4 mb-2 grid max-h-40 gap-2 overflow-auto rounded-[20px] border-2 border-[rgba(236,72,153,0.3)] bg-pink-soft p-3">
              <header className="flex items-center justify-between">
                <h4 className="m-0 text-[0.85rem] font-extrabold">AI clips</h4>
                <span className="text-[0.75rem] font-extrabold text-pink">
                  {aiClips.sourceCount}→{aiClips.clips.length}
                </span>
              </header>
              <ol className="m-0 grid gap-1.5 pl-[18px]">
                {aiClips.clips.map((clip) => (
                  <li key={clip.id}>
                    <strong className="block text-[0.8rem]">{clip.title}</strong>
                    <p className="mt-0.5 mb-0 text-[0.72rem] font-semibold text-muted">{clip.summary}</p>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnViolet} onClick={() => act(aiClips.showing ? "hideAiClips" : "showAiClips")}>
                  {aiClips.showing ? "Hide" : "Show to class"}
                </button>
                <button type="button" className={btn} onClick={() => act("clearAiClips")}>
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t-2 border-[#f3f4f6] bg-white px-5 pt-4 pb-5">
            <button type="button" className={btnPink} disabled={!pickCount || planning} onClick={sendToAi}>
              {planning ? "Sending…" : `Send to AI${pickCount ? ` (${pickCount})` : ""}`}
            </button>
            <button type="button" className={btnViolet} disabled={!exploreId} onClick={() => act("explore", { questionId: exploreId })}>
              Explore
            </button>
            <button type="button" className={btn} onClick={() => act("reset")}>
              Reset
            </button>
          </div>
        </>
      )}
    </section>
  );
}
