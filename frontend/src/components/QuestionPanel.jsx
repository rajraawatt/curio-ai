export function QuestionPanel({ state, act, exploreId }) {
  return (
    <aside className="questions">
      <header>
        <h2>Student questions</h2>
        <span>{state.questions.length}</span>
      </header>
      {state.hands.length > 0 && (
        <p className="hands">{state.hands.map((hand) => hand.name).join(", ")} raised a hand</p>
      )}
      <ul>
        {state.questions.map((question) => (
          <li key={question.id}>
            <button
              type="button"
              className={`${question.id === state.selectedId ? "on" : ""} ${question.status}`}
              onClick={() => act("select", { questionId: question.id })}
            >
              <span className="avatar" style={{ background: question.color }}>
                {question.name.slice(0, 1)}
              </span>
              <span>
                <strong>
                  {question.name}
                  <em>{question.concept}</em>
                </strong>
                {question.text}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="quick">
        <button type="button" className="primary" disabled={!exploreId} onClick={() => act("explore", { questionId: exploreId })}>
          Explore question
        </button>
        <button type="button" onClick={() => act("reset")}>
          Reset class
        </button>
      </div>
    </aside>
  );
}
