import { useMemo, useState } from "react";

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
    <section className={`g-chat${open ? " is-open" : " is-collapsed"}`} aria-label="Class questions">
      <div className="g-chat__header">
        <h3>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 10h8M8 14h5" />
            <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          </svg>
          Class Chat
        </h3>
        <div className="g-chat__header-actions">
          <span className="g-chat__badge">{state.questions.length}</span>
          <button
            type="button"
            className="g-section-toggle"
            title={open ? "Collapse chat" : "Expand chat"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {open ? <path d="M6 9l6 6 6-6" /> : <path d="M6 15l6-6 6 6" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <>
          {state.hands.length > 0 && (
            <p className="g-chat__hands">{state.hands.map((hand) => hand.name).join(", ")} raised a hand</p>
          )}

          <div className="g-chat__pick">
            <span>{pickCount} picked</span>
            <button type="button" className="g-chat__link" onClick={selectAllNew}>
              Pick open
            </button>
            <button type="button" className="g-chat__link" onClick={clearPicks} disabled={!pickCount}>
              Clear
            </button>
          </div>

          <div className="g-chat__list no-scrollbar">
            {state.questions.length === 0 && <p className="g-chat__empty">No questions yet — students will appear here.</p>}
            {state.questions.map((question) => {
              const checked = picked.has(question.id);
              const inBatch = covered.has(question.id);
              const selected = question.id === state.selectedId;
              return (
                <div key={question.id} className={`g-chat__row${selected ? " is-active" : ""}`}>
                  <label className={`g-chat__check${checked ? " is-checked" : ""}`} title="Include for AI">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => togglePick(question.id, event)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span className="g-chat__check-box" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    </span>
                  </label>
                  <button type="button" className="g-chat__bubble" onClick={() => act("select", { questionId: question.id })}>
                    {question.region?.thumbnail ? (
                      <img className="g-chat__avatar" src={question.region.thumbnail} alt="" />
                    ) : (
                      <span className="g-chat__avatar" style={{ background: question.color }}>
                        {question.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="g-chat__msg">
                      <strong>
                        {question.name}
                        <em>{question.concept}</em>
                      </strong>
                      <span>{question.text}</span>
                      {inBatch && <em className="g-chat__tag">In AI batch</em>}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {aiClips?.clips?.length > 0 && (
            <div className="g-chat__batch">
              <header>
                <h4>AI clips</h4>
                <span>
                  {aiClips.sourceCount}→{aiClips.clips.length}
                </span>
              </header>
              <ol>
                {aiClips.clips.map((clip) => (
                  <li key={clip.id}>
                    <strong>{clip.title}</strong>
                    <p>{clip.summary}</p>
                  </li>
                ))}
              </ol>
              <div className="g-chat__batch-actions">
                <button type="button" className="g-btn g-btn--blue" onClick={() => act(aiClips.showing ? "hideAiClips" : "showAiClips")}>
                  {aiClips.showing ? "Hide" : "Show to class"}
                </button>
                <button type="button" className="g-btn" onClick={() => act("clearAiClips")}>
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="g-chat__footer">
            <button type="button" className="g-btn g-btn--red" disabled={!pickCount || planning} onClick={sendToAi}>
              {planning ? "Sending…" : `Send to AI${pickCount ? ` (${pickCount})` : ""}`}
            </button>
            <button type="button" className="g-btn g-btn--blue" disabled={!exploreId} onClick={() => act("explore", { questionId: exploreId })}>
              Explore
            </button>
            <button type="button" className="g-btn" onClick={() => act("reset")}>
              Reset
            </button>
          </div>
        </>
      )}
    </section>
  );
}
