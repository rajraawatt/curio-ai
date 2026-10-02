import { useMemo, useState } from "react";
import { useClassroom } from "./useClassroom.js";
import { listen } from "./speech.js";
import { World } from "./World.jsx";
import { Wordmark } from "./Lobby.jsx";

const PROMPTS = [
  "What is this rock made of?",
  "How did the mountain become so tall?",
  "Why are some rocks black?",
  "Could we stand inside a crystal?",
];

export function Student() {
  const { state, connected, send } = useClassroom();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [name, setName] = useState(params.get("name") || "Aarav");
  const [text, setText] = useState("");
  const [panel, setPanel] = useState("ask");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  async function ask(value, source = "text") {
    const question = (value || text).trim();
    if (!question) return;
    setError("");
    try {
      await send("/api/questions", { name: name.trim() || "Student", text: question, source });
      setText("");
      setPanel("mine");
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleHand() {
    const up = !state?.hands?.some((hand) => hand.name === (name.trim() || "Student"));
    send("/api/control", { action: "raise", name: name.trim() || "Student", up }).catch((err) => setError(err.message));
  }

  function startVoice() {
    setListening(true);
    setError("");
    listen(
      state?.language || "en",
      (heard) => {
        setText(heard);
        ask(heard, "voice");
      },
      (message) => {
        setListening(false);
        if (message) setError(message);
      }
    );
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

      <World state={state} captions />

      <div className="student-status">
        {state.phase === "transforming" && exploring ? (
          <p>
            The class is inside <strong>{exploring.name}'s</strong> question.
          </p>
        ) : state.phase === "selected" ? (
          <p>The teacher has paused on a question.</p>
        ) : (
          <p>The lesson is live. Ask when something in the world makes you curious.</p>
        )}
      </div>

      <div className="actions">
        <button type="button" className={handUp ? "on" : ""} onClick={toggleHand}>
          {handUp ? "Hand is up" : "Raise hand"}
        </button>
        <button type="button" className={panel === "ask" ? "on" : ""} onClick={() => setPanel("ask")}>
          Ask question
        </button>
        <button type="button" className={panel === "chat" ? "on" : ""} onClick={() => setPanel("chat")}>
          Chat
        </button>
        <button type="button" className={panel === "mine" ? "on" : ""} onClick={() => setPanel("mine")}>
          My questions
        </button>
      </div>

      {panel !== "mine" && (
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            ask(text, panel === "chat" ? "chat" : "text");
          }}
        >
          <input
            value={text}
            placeholder={panel === "chat" ? "Send a thought to the class" : "Ask about something you see"}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="button" className={listening ? "mic on" : "mic"} onClick={startVoice}>
            Mic
          </button>
          <button type="submit" className="primary">
            Send
          </button>
        </form>
      )}

      {panel === "ask" && (
        <div className="prompts">
          {PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => ask(prompt, "text")}>
              {prompt}
            </button>
          ))}
        </div>
      )}

      {panel === "mine" && (
        <ul className="mine">
          {mine.length === 0 && <li>Your questions will show up here, and on the teacher's screen.</li>}
          {mine.map((question) => (
            <li key={question.id}>
              <strong>{question.text}</strong>
              <em>{question.status}</em>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
