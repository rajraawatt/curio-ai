import { useEffect, useMemo, useRef, useState } from "react";
import { trackAnalytics } from "./analyticsClient.js";
import { ClassLessonStage, stageClipFromPack } from "./components/ClassLessonStage.jsx";
import { SidePanel } from "./components/SidePanel.jsx";
import { useClassroom } from "./useClassroom.js";

const STUDENT_NAV = [
  { id: "live", label: "Live class", icon: "live", tint: "violet" },
  { id: "learning", label: "Learning", icon: "learn", tint: "pink" },
];

const STUDENT_TABS = new Set(["live", "learning"]);

function tabFromUrl() {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return STUDENT_TABS.has(tab) ? tab : "live";
}

function setTabInUrl(tab) {
  const url = new URL(window.location.href);
  if (tab === "live") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function questionBadge(question, state) {
  if (state.transform?.questionId === question.id && state.phase === "transforming") {
    return { label: "Exploring", tone: "pink" };
  }
  if (question.id === state.selectedId || question.status === "selected") {
    return { label: "Selected", tone: "violet" };
  }
  if (question.status === "answered" || question.status === "done" || question.status === "explored") {
    return { label: "Answered", tone: "muted" };
  }
  return { label: "New", tone: "cream" };
}

function AiClipsOverlay({ aiClips }) {
  if (!aiClips?.showing || !aiClips.clips?.length) return null;
  return (
    <section className="g-student__clips g-student__clips--stage">
      <h2>Class clips</h2>
      <div className="ai-clips-row">
        {aiClips.clips.map((clip) => (
          <article key={clip.id} className="ai-clip-card">
            <div className="ai-clip-poster" aria-hidden="true" />
            <h3>{clip.title}</h3>
            <p>{clip.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Student() {
  const { state, connected, send } = useClassroom();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [name, setName] = useState(params.get("name") || "Aarav");
  const [text, setText] = useState("");
  const [panel, setPanel] = useState("ask");
  const [nav, setNav] = useState(tabFromUrl);
  const [captions, setCaptions] = useState(true);
  const [error, setError] = useState("");
  const joinedNameRef = useRef(null);
  const studentName = name.trim() || "Student";

  function goNav(next) {
    const tab = STUDENT_TABS.has(next) ? next : "live";
    setNav(tab);
    setTabInUrl(tab);
  }

  useEffect(() => {
    const onPopState = () => setNav(tabFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    trackAnalytics({ event_type: "session_start", name: studentName, mode: "self_paced", source: "student" });
    const timer = setInterval(() => {
      trackAnalytics({
        event_type: "time_spent",
        name: studentName,
        item_id: "lesson-merged",
        item_label: "Merged lesson (student session)",
        value_num: 60,
        mode: "self_paced",
        source: "heartbeat",
        pack_id: "cell-mvp",
      });
    }, 60000);
    return () => clearInterval(timer);
  }, [studentName]);

  useEffect(() => {
    if (!connected) return;
    const student = studentName;
    const previous = joinedNameRef.current;

    if (previous && previous.toLowerCase() !== student.toLowerCase()) {
      send("/api/control", { action: "leave", name: previous }).catch(() => {});
    }

    send("/api/control", { action: "join", name: student }).catch(() => {});
    joinedNameRef.current = student;

    return () => {
      const leaving = joinedNameRef.current;
      if (leaving) {
        send("/api/control", { action: "leave", name: leaving }).catch(() => {});
        joinedNameRef.current = null;
      }
    };
  }, [connected, studentName, send]);

  async function ask(value, source = "text") {
    const question = (value || text).trim();
    if (!question) return;
    setError("");
    try {
      await send("/api/questions", {
        name: studentName,
        text: question,
        source,
        region: null,
      });
      setText("");
      setPanel("mine");
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleHand() {
    const up = !state?.hands?.some((hand) => hand.name.toLowerCase() === studentName.toLowerCase());
    send("/api/control", { action: "raise", name: studentName, up }).catch((err) => setError(err.message));
  }

  if (!state) {
    return <main className="boot g-boot">Joining the classroom…</main>;
  }

  const mine = state.questions.filter((q) => q.name.toLowerCase() === studentName.toLowerCase());
  const handUp = state.hands.some((hand) => hand.name.toLowerCase() === studentName.toLowerCase());
  const livePack = state.liveLesson;
  const learningPack = state.learningLesson;
  const hasLiveVideo = Boolean(livePack && stageClipFromPack(livePack));
  const hasLearningVideo = Boolean(learningPack && stageClipFromPack(learningPack));
  const showClips = state.aiClips?.showing && state.aiClips.clips?.length > 0;
  const showChat = nav === "live";

  return (
    <main className="g-student g-student--desk">
      <SidePanel
        nav={nav}
        onNav={goNav}
        connected={connected}
        room={state.room}
        items={STUDENT_NAV}
        brandHref="/student"
      />

      <section className="g-student__center">
        {state.notice && (
          <div className="g-notice">
            <p>{state.notice}</p>
          </div>
        )}

        <header className="g-student__desk-bar">
          <label className="g-student__name">
            Your name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <button
            type="button"
            className={`g-btn${captions ? " g-btn--blue is-on" : ""}`}
            onClick={() => setCaptions((value) => !value)}
          >
            Captions {captions ? "on" : "off"}
          </button>
        </header>

        {nav === "live" && (
          <div className="g-student__stage-wrap">
            {hasLiveVideo ? (
              <div className="stage-with-overlay">
                <ClassLessonStage
                  pack={livePack}
                  language={state.language}
                  captions={captions}
                  playing={state.playing}
                  readOnly
                  kicker="Live class"
                  trackMode="live"
                  trackAs="Student live"
                />
                <AiClipsOverlay aiClips={state.aiClips} />
              </div>
            ) : (
              <div className="g-stage-blank g-student__stage-blank" aria-label="Live class stage">
                {!showClips && (
                  <div className="g-stage-blank__copy">
                    <p className="g-stage-blank__title">Live class</p>
                    <p>The teacher&apos;s shared video will appear here when class starts.</p>
                  </div>
                )}
                <AiClipsOverlay aiClips={state.aiClips} />
              </div>
            )}

            <div className="g-student__toolbar">
              <button type="button" className={`g-btn${handUp ? " g-btn--red is-on" : ""}`} onClick={toggleHand}>
                {handUp ? "Hand is up" : "Raise hand"}
              </button>
              <button type="button" className={`g-btn${panel === "ask" ? " g-btn--blue is-on" : ""}`} onClick={() => setPanel("ask")}>
                Ask question
              </button>
              <button type="button" className={`g-btn${panel === "mine" ? " g-btn--blue is-on" : ""}`} onClick={() => setPanel("mine")}>
                My questions{mine.length ? ` (${mine.length})` : ""}
              </button>
            </div>
          </div>
        )}

        {nav === "learning" && (
          <div className="g-student__stage-wrap">
            {hasLearningVideo ? (
              <ClassLessonStage
                pack={learningPack}
                language={learningPack.language || state.language}
                captions={captions}
                playing
                readOnly
                kicker="Learning"
                trackMode="self_paced"
                trackAs="Student learning"
              />
            ) : (
              <div className="g-stage-blank g-student__stage-blank" aria-label="Learning stage">
                <div className="g-stage-blank__copy">
                  <p className="g-stage-blank__title">Learning</p>
                  <p>When the teacher shares a prepared lesson for Learning, it will play here.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {showChat && (
        <aside className="g-student__rail" aria-label="Student panel">
          <section className="g-chat g-student__chat">
            <div className="g-chat__header">
              <h3>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 10h8M8 14h5" />
                  <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
                {panel === "mine" ? "My questions" : "Ask the class"}
              </h3>
              <span className="g-chat__badge">{panel === "mine" ? mine.length : state.questions.length}</span>
            </div>

            {panel === "ask" ? (
              <form
                className="g-student__composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  ask(text, "text");
                }}
              >
                <textarea
                  value={text}
                  rows={4}
                  placeholder="Ask about something in the lesson…"
                  onChange={(event) => setText(event.target.value)}
                />
                <button type="submit" className="g-btn g-btn--blue" disabled={!text.trim()}>
                  Send to teacher
                </button>
                {error && <p className="g-student__error">{error}</p>}
              </form>
            ) : (
              <div className="g-student__mine no-scrollbar">
                {mine.length === 0 && (
                  <p className="g-chat__empty">Your questions will show up here, and on the teacher&apos;s Class Chat.</p>
                )}
                {mine.map((question) => {
                  const badge = questionBadge(question, state);
                  return (
                    <article key={question.id} className="g-student__mine-card">
                      <div className="g-student__mine-main">
                        {question.region?.thumbnail && (
                          <img className="g-student__mine-thumb" src={question.region.thumbnail} alt="" />
                        )}
                        <div>
                          <strong>{question.text}</strong>
                          {question.concept && <span>{question.concept}</span>}
                        </div>
                      </div>
                      <em className={`g-student__badge is-${badge.tone}`}>{badge.label}</em>
                    </article>
                  );
                })}
                {error && <p className="g-student__error">{error}</p>}
              </div>
            )}
          </section>
        </aside>
      )}
    </main>
  );
}
