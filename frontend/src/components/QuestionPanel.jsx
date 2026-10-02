export function QuestionPanel({ state, act, exploreId }) {
  return (
    <aside className="questions">
      <header>
        <h2>Questions</h2>
        <span>{state.questions.length}</span>
      </header>
      {state.hands.length > 0 && (
        <p className="hands">{state.hands.map((hand) => hand.name).join(", ")} raised a hand</p>
      )}
      <ul>
        {state.questions.length === 0 && <li className="questions-empty">No questions yet</li>}
        {state.questions.map((question) => (
          <li key={question.id}>
            <button
              type="button"
              className={`${question.id === state.selectedId ? "on" : ""} ${question.status}`}
              onClick={() => act("select", { questionId: question.id })}
            >
              {question.region?.thumbnail ? (
                <img className="question-thumb" src={question.region.thumbnail} alt="" />
              ) : (
                <span className="avatar" style={{ background: question.color }}>
                  {question.name.slice(0, 1)}
                </span>
              )}
              <span>
                <strong>
                  {question.name}
                  <em>{question.concept}</em>
                </strong>
                {question.text}
                {question.region && <em className="region-tag">Marked on frame</em>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="quick">
        <button type="button" className="primary" disabled={!exploreId} onClick={() => act("explore", { questionId: exploreId })}>
          Explore
        </button>
        <button type="button" onClick={() => act("reset")}>
          Reset
        </button>
      </div>
    </aside>
  );
}
