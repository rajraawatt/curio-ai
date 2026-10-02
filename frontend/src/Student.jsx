import { useMemo, useState } from "react";
import { RegionMarker } from "./components/RegionMarker.jsx";
import { useClassroom } from "./useClassroom.js";
import { Wordmark } from "./Lobby.jsx";

const SAMPLE_FRAME = "/sample-lesson.svg";

export function Student() {
  const { state, connected, send } = useClassroom();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [name, setName] = useState(params.get("name") || "Aarav");
  const [text, setText] = useState("");
  const [panel, setPanel] = useState("ask");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");

  async function ask(value, source = "text") {
    const question = (value || text).trim();
    if (!question) return;
    setError("");
    try {
      await send("/api/questions", {
        name: name.trim() || "Student",
        text: question,
        source: selection ? "marker" : source,
        region: selection
          ? {
              x: selection.x,
              y: selection.y,
              w: selection.w,
              h: selection.h,
              label: selection.label,
              thumbnail: selection.thumbnail,
              frame: SAMPLE_FRAME,
            }
          : null,
      });
      setText("");
      setSelection(null);
      setPanel("mine");
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleHand() {
    const up = !state?.hands?.some((hand) => hand.name === (name.trim() || "Student"));
    send("/api/control", { action: "raise", name: name.trim() || "Student", up }).catch((err) => setError(err.message));
  }

  if (!state) return <main className="boot">Joining the classroom…</main>;

  const mine = state.questions.filter((q) => q.name.toLowerCase() === (name.trim() || "Student").toLowerCase());
  const handUp = state.hands.some((hand) => hand.name === (name.trim() || "Student"));
  const exploring = state.questions.find((q) => q.id === state.transform?.questionId);

  return (
    <main className="student">
      <header>
        <Wordmark />
        <label>
          Your name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <span className={connected ? "dot on" : "dot"}>{connected ? `Room ${state.room}` : "Reconnecting"}</span>
      </header>

      <RegionMarker
        src={SAMPLE_FRAME}
        alt="Lesson frame"
        selection={selection}
        onSelect={setSelection}
        onClear={() => setSelection(null)}
      />

      <div className="student-status">
        {state.phase === "transforming" && exploring ? (
          <p>
            The class is inside <strong>{exploring.name}'s</strong> question.
          </p>
        ) : state.phase === "selected" ? (
          <p>The teacher has paused on a question.</p>
        ) : (
          <p>Mark any part of the lesson frame, then ask what you are curious about.</p>
        )}
      </div>

      <div className="actions">
        <button type="button" className={handUp ? "on" : ""} onClick={toggleHand}>
          {handUp ? "Hand is up" : "Raise hand"}
        </button>
        <button type="button" className={panel === "ask" ? "on" : ""} onClick={() => setPanel("ask")}>
          Ask question
        </button>
        <button type="button" className={panel === "mine" ? "on" : ""} onClick={() => setPanel("mine")}>
          My questions
        </button>
      </div>

      {panel === "ask" && (
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            ask(text, "text");
          }}
        >
          {selection && (
            <div className="composer-region">
              {selection.thumbnail ? (
                <img src={selection.thumbnail} alt="Selected region" />
              ) : (
                <span className="composer-region-fallback">Marked</span>
              )}
              <div>
                <strong>Selected in frame</strong>
                <p>This mark will go with your question</p>
              </div>
              <button type="button" onClick={() => setSelection(null)}>
                Remove
              </button>
            </div>
          )}
          <div className="composer-row">
            <input
              value={text}
              placeholder={selection ? "Ask about the marked area…" : "Ask about something you see"}
              onChange={(event) => setText(event.target.value)}
            />
            <button type="submit" className="primary" disabled={!text.trim()}>
              Send
            </button>
          </div>
        </form>
      )}

      {panel === "mine" && (
        <ul className="mine">
          {mine.length === 0 && <li>Your questions will show up here, and on the teacher's screen.</li>}
          {mine.map((question) => (
            <li key={question.id}>
              <div className="mine-main">
                {question.region?.thumbnail && (
                  <img className="mine-thumb" src={question.region.thumbnail} alt="" />
                )}
                <strong>{question.text}</strong>
              </div>
              <em>{question.status}</em>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
