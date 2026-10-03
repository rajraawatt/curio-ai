import { useEffect, useState } from "react";
import { useClassroom } from "./useClassroom.js";

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
  const engineLive = engine !== "lesson-scripts";

  return (
    <main className="g-lobby">
      <div className="g-lobby__glow" aria-hidden="true" />

      <header className="g-lobby__bar">
        <Wordmark />
        <span className={`g-lobby__status${connected ? " is-on" : ""}`}>
          {connected ? "Classroom live" : "Connecting"}
        </span>
      </header>

      <section className="g-lobby__hero">
        <p className="g-lobby__brand">CURIO</p>
        <h1>One shared lesson. Curiosity changes the view.</h1>
        <p className="g-lobby__lede">
          Students ask. The teacher chooses. The class sees the answer unfold together.
        </p>
        {engineLive && <p className="g-lobby__engine">{engine === "vertex" ? "Gemini on Vertex AI" : "Gemini API"} ready</p>}
      </section>

      <section className="g-lobby__doors" aria-label="Enter the classroom">
        <a className="g-lobby__door g-lobby__door--teacher" href="/teacher">
          <span className="g-lobby__door-kicker">Teacher</span>
          <strong>Lead the lesson</strong>
          <em>Pause, pick a question, explore with the class.</em>
        </a>

        <article className="g-lobby__door g-lobby__door--student">
          <span className="g-lobby__door-kicker">Student</span>
          <strong>Ask into the world</strong>
          <em>Join from another device or window.</em>
          <label className="g-lobby__name">
            Your name
            <input
              value={name}
              aria-label="Student name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <a className="g-lobby__join" href={`/student?name=${encodeURIComponent(name || "Student")}`}>
            Join as {name || "Student"}
          </a>
        </article>

        <a className="g-lobby__door g-lobby__door--studio" href="/prepare">
          <span className="g-lobby__door-kicker">Studio</span>
          <strong>Prepare assets</strong>
          <em>Build the lesson video and 3D pack before class.</em>
        </a>
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
