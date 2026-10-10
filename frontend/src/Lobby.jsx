import { useEffect, useState } from "react";
import { useClassroom } from "./useClassroom.js";
import { btnViolet, cx, field } from "./ui.js";

const FALLBACK_CLASSES = [
  { id: "6a", label: "Class 6A" },
  { id: "7b", label: "Class 7B" },
  { id: "8c", label: "Class 8C" },
];

export function Lobby() {
  const { state, connected } = useClassroom();
  const [name, setName] = useState("Aarav");
  const [classId, setClassId] = useState("6a");
  const [classes, setClasses] = useState(FALLBACK_CLASSES);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth(null));
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.classes) && data.classes.length) setClasses(data.classes);
      })
      .catch(() => {});
  }, []);

  const engine = health?.engine || state?.engine || "lesson-scripts";
  const engineLive = engine !== "lesson-scripts";
  const studentHref = `/student?name=${encodeURIComponent(name || "Student")}&class=${encodeURIComponent(classId)}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-cream font-sans text-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_10%_0%,rgba(124,58,237,0.12),transparent_55%),radial-gradient(800px_400px_at_90%_10%,rgba(236,72,153,0.1),transparent_50%)]"
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between gap-4 px-6 py-4">
        <Wordmark />
        <span
          className={cx(
            "rounded-full px-3.5 py-2 text-xs font-extrabold",
            connected ? "bg-violet-soft text-violet" : "bg-[#f3f4f6] text-muted"
          )}
        >
          {connected ? "Classroom live" : "Connecting"}
        </span>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-4 pt-8 text-center md:pt-14">
        <p className="text-[clamp(2.8rem,8vw,4.5rem)] font-black leading-none tracking-[-0.04em] text-violet">CURIO</p>
        <h1 className="mt-4 text-[clamp(1.35rem,3vw,1.85rem)] font-black tracking-[-0.02em]">
          One shared lesson. Curiosity changes the view.
        </h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-base font-bold text-muted">
          Students ask. The teacher chooses. The class sees the answer unfold together.
        </p>
        {engineLive && (
          <p className="mt-3 text-sm font-extrabold text-pink">
            {engine === "vertex" ? "Gemini on Vertex AI" : "Gemini API"} ready
          </p>
        )}
      </section>

      <section className="relative z-10 mx-auto grid max-w-6xl gap-4 px-6 pb-10 pt-6 md:grid-cols-2 xl:grid-cols-4" aria-label="Enter the classroom">
        <a
          className="flex min-h-[280px] flex-col rounded-[32px] border-[3px] border-[rgba(124,58,237,0.18)] bg-gradient-to-br from-violet-soft to-[#f8f4ed] p-6 text-ink no-underline shadow-[0_10px_0_rgba(124,58,237,0.08)] transition hover:-translate-y-0.5"
          href="/teacher"
        >
          <span className="text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-violet">Teacher</span>
          <strong className="mt-3 text-xl font-black">Lead the lesson</strong>
          <em className="mt-2 font-bold not-italic text-muted">Pause, pick a question, explore with the class.</em>
        </a>

        <article className="flex min-h-[280px] flex-col rounded-[32px] border-[3px] border-[rgba(236,72,153,0.2)] bg-gradient-to-br from-pink-soft to-violet-soft p-6 shadow-[0_10px_0_rgba(236,72,153,0.08)]">
          <span className="text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-pink">Student</span>
          <strong className="mt-3 text-xl font-black">Ask into the world</strong>
          <em className="mt-2 font-bold not-italic text-muted">Join from another device or window.</em>
          <label className="mt-auto grid gap-1.5 text-xs font-extrabold text-muted">
            Your name
            <input className={field} value={name} aria-label="Student name" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="mt-2 grid gap-1.5 text-xs font-extrabold text-muted">
            Class
            <select className={field} value={classId} aria-label="Class" onChange={(e) => setClassId(e.target.value)}>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.label}
                </option>
              ))}
            </select>
          </label>
          <a className={cx(btnViolet, "mt-3 w-full no-underline")} href={studentHref}>
            Join as {name || "Student"}
          </a>
        </article>

        <a
          className="flex min-h-[280px] flex-col rounded-[32px] border-[3px] border-[rgba(236,72,153,0.2)] bg-gradient-to-br from-pink-soft to-violet-soft p-6 text-ink no-underline shadow-[0_10px_0_rgba(236,72,153,0.08)] transition hover:-translate-y-0.5"
          href="/prepare"
        >
          <span className="text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-pink">Studio</span>
          <strong className="mt-3 text-xl font-black">Prepare assets</strong>
          <em className="mt-2 font-bold not-italic text-muted">Build the lesson video and 3D pack before class.</em>
        </a>

        <a
          className="flex min-h-[280px] flex-col rounded-[32px] border-[3px] border-[rgba(124,58,237,0.18)] bg-gradient-to-br from-[#1f2937] to-[#111827] p-6 text-white no-underline shadow-[0_10px_0_rgba(17,24,39,0.2)] transition hover:-translate-y-0.5"
          href="/studio"
        >
          <span className="text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-lilac">Chat studio</span>
          <strong className="mt-3 text-xl font-black">Ask for a lesson</strong>
          <em className="mt-2 font-bold not-italic text-white/70">A video, stills, and labelled parts from one prompt.</em>
        </a>
      </section>
    </main>
  );
}

export function Wordmark() {
  return (
    <a className="font-sans text-lg font-black tracking-[-0.02em] text-ink no-underline" href="/">
      CURIO<sup className="text-violet">+</sup>
    </a>
  );
}
