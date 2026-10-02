import { useEffect, useState } from "react";
import { useClassroom } from "./useClassroom.js";

const STEPS = [
  ["Teacher opens the world", "The class enters one shared mountain lesson."],
  ["Students ask", "Voice or text, from a phone or a classroom mic."],
  ["Teacher chooses", "CURIO does not take the lesson away."],
  ["The world answers", "The scene itself changes, then the class returns."],
];

export function Lobby() {
  const { state, connected } = useClassroom();
  const [name, setName] = useState("Aarav");
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const engine = health?.engine || state?.engine || "lesson-scripts";
  const engineLabel =
    engine === "vertex"
      ? "Gemini on Vertex AI"
      : engine === "gemini-api-key"
        ? "Gemini API"
        : "Lesson scenes ready";

  return (
    <main className="lobby">
      <header className="lobby-bar">
        <Wordmark />
        <span className={connected ? "dot on" : "dot"}>{connected ? "Classroom live" : "Connecting"}</span>
      </header>

      <section className="hero">
        <p className="kicker">Media, digital experience, entertainment</p>
        <h1>
          What if a student's question could change the world the entire class is learning in?
        </h1>
        <p className="lede">
          CURIO turns a lesson into a shared cinematic world. Students ask in their own words.
          The teacher chooses what to explore. The scene transforms to explain it, then the class returns to the lesson.
        </p>
        <div className="doors">
          <a className="door teacher" href="/teacher">
            <span>Teacher</span>
            <strong>Lead the lesson</strong>
            <em>Pause, choose a question, transform the world, resume.</em>
          </a>
          <article className="door student">
            <span>Student</span>
            <strong>Ask into the world</strong>
            <em>Use another device, a phone, or a second window.</em>
            <input
              value={name}
              aria-label="Student name"
              onChange={(event) => setName(event.target.value)}
            />
            <a href={`/student?name=${encodeURIComponent(name || "Student")}`}>Join as {name || "Student"}</a>
          </article>
          <a className="door prepare" href="/prepare">
            <span>Studio</span>
            <strong>Prepare assets</strong>
            <em>Topic, age, and language for the video you will show next class.</em>
          </a>
        </div>
      </section>

      <section className="flow">
        {STEPS.map(([title, copy], index) => (
          <article key={title}>
            <b>{index + 1}</b>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="stack">
        <div>
          <h2>Two rooms, one world</h2>
          <p>
            On a projector, the teacher screen is the room. In a video class, students join from their own devices.
            The controls are the same: the teacher decides when the world changes.
          </p>
        </div>
        <ul>
          <li className={engine === "lesson-scripts" ? "" : "ready"}>{engineLabel}</li>
          <li>Scene engine for the live transformation</li>
          <li>Speech in the browser, Cloud Text-to-Speech when configured</li>
          <li>Imagen diagrams and Veo clips on demand</li>
          <li>BigQuery curiosity analytics</li>
          <li>English, Hindi, and Spanish</li>
        </ul>
      </section>
    </main>
  );
}

export function Wordmark() {
  return (
    <a className="wordmark" href="/">
      CURIO<sup>+</sup>
    </a>
  );
}
