export function AnalyticsPanel({ state }) {
  const counts = {};
  for (const question of state.questions) {
    counts[question.concept] = (counts[question.concept] || 0) + 1;
  }
  const max = Math.max(1, ...Object.values(counts));
  const explored = state.questions.filter((q) => q.status === "explored" || q.status === "exploring").length;

  return (
    <div className="analytics">
      <header>
        <h2>Curiosity in this class</h2>
        <p>These events are the BigQuery stream. The board works even before the warehouse is connected.</p>
      </header>
      <div className="stats">
        <article>
          <b>{state.questions.length}</b>
          <span>Questions</span>
        </article>
        <article>
          <b>{explored}</b>
          <span>Explored</span>
        </article>
        <article>
          <b>{state.hands.length}</b>
          <span>Hands up</span>
        </article>
        <article>
          <b>{state.bigquery.status === "streaming" ? "On" : "Local"}</b>
          <span>BigQuery</span>
        </article>
      </div>
      <div className="bars">
        {Object.entries(counts).map(([concept, count]) => (
          <div key={concept}>
            <span>{concept}</span>
            <i>
              <b style={{ width: `${(count / max) * 100}%` }} />
            </i>
            <em>{count}</em>
          </div>
        ))}
      </div>
      <ol className="log">
        {state.analytics
          .slice()
          .reverse()
          .map((event) => (
            <li key={event.insert_id}>
              <time>{new Date(event.event_time).toLocaleTimeString()}</time>
              <strong>{event.event_type}</strong>
              <span>{event.student_name}</span>
              <em>{event.question || event.concept}</em>
            </li>
          ))}
      </ol>
    </div>
  );
}
