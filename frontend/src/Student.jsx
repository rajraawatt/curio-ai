import { useEffect, useMemo, useRef, useState } from "react";
import { trackAnalytics } from "./analyticsClient.js";
import { ClassLessonStage, stageClipFromPack } from "./components/ClassLessonStage.jsx";
import { LearningBrowser } from "./components/LearningBrowser.jsx";
import { SidePanel } from "./components/SidePanel.jsx";
import { btn, btnOn, btnPink, btnViolet, cx, noScrollbar } from "./ui.js";
import { useClassroom } from "./useClassroom.js";

const STUDENT_NAV = [
  { id: "live", label: "Live class", icon: "live", tint: "violet" },
  { id: "learning", label: "Learning", icon: "learn", tint: "pink" },
];

const STUDENT_TABS = new Set(["live", "learning"]);
const DEFAULT_CLASSES = [
  { id: "6a", label: "Class 6A" },
  { id: "7b", label: "Class 7B" },
  { id: "8c", label: "Class 8C" },
];

const FIELD =
  "min-w-[140px] rounded-full border-2 border-line bg-cream px-3.5 py-2 font-sans font-bold text-ink outline-none focus:border-lilac focus:bg-white";

const BADGE = {
  cream: "bg-cream-deep text-ink",
  violet: "bg-violet-soft text-violet",
  pink: "bg-pink-soft text-pink",
  muted: "bg-[#f3f4f6] text-muted",
};

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
    <section className="w-full max-w-[720px] border-0 bg-transparent p-0 shadow-none">
      <h2 className="mb-2.5 mt-0 text-[0.95rem] font-extrabold text-ink">Class clips</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
        {aiClips.clips.map((clip) => (
          <article key={clip.id} className="grid gap-1 rounded-[10px] border border-[#3c4043] bg-[#0b1220] p-2">
            <div
              className="grid h-[72px] place-items-center rounded-lg bg-gradient-to-br from-[#1a237e] to-[#0b1220] text-[0.72rem] text-[#c6dafc]"
              aria-hidden="true"
            />
            <h3 className="m-0 text-[0.8rem] font-medium text-[#e8eaed]">{clip.title}</h3>
            <p className="m-0 text-[0.7rem] text-[#bdc1c6]">{clip.summary}</p>
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
  const [classId, setClassId] = useState(params.get("class") || "6a");
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
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
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.classes) && data.classes.length) setClasses(data.classes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("class", classId);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [classId]);

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
    return (
      <main className="grid min-h-screen place-items-center bg-cream font-sans font-bold text-ink">
        Joining the classroom…
      </main>
    );
  }

  const mine = state.questions.filter((q) => q.name.toLowerCase() === studentName.toLowerCase());
  const handUp = state.hands.some((hand) => hand.name.toLowerCase() === studentName.toLowerCase());
  const livePack = state.liveLesson;
  const hasLiveVideo = Boolean(livePack && stageClipFromPack(livePack));
  const showClips = state.aiClips?.showing && state.aiClips.clips?.length > 0;
  const showChat = nav === "live";

  return (
    <main className="flex h-screen w-full overflow-hidden bg-cream font-sans text-ink max-[980px]:flex-col">
      <SidePanel
        nav={nav}
        onNav={goNav}
        connected={connected}
        room={state.room}
        items={STUDENT_NAV}
        brandHref="/student"
      />

      <section className="z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-visible px-5 py-4">
        {state.notice && (
          <div className="flex items-center justify-between gap-3 rounded-[20px] border-2 border-[rgba(196,181,253,0.55)] bg-white px-4 py-3 text-ink shadow-[0_4px_0_rgba(0,0,0,0.05)]">
            <p className="m-0 font-bold">{state.notice}</p>
          </div>
        )}

        <header className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[0.85rem] font-bold text-muted">
            Your name
            <input className={FIELD} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-[0.85rem] font-bold text-muted">
            Class
            <select className={FIELD} value={classId} onChange={(event) => setClassId(event.target.value)}>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={cx(btn, captions && btnOn)}
            onClick={() => setCaptions((value) => !value)}
          >
            Captions {captions ? "on" : "off"}
          </button>
        </header>

        {nav === "live" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible">
            {hasLiveVideo ? (
              <div className="relative">
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
              <div
                className="relative grid min-h-[280px] flex-1 place-items-center rounded-[32px] border-[3px] border-dashed border-[rgba(124,58,237,0.2)] bg-white/55 p-7"
                aria-label="Live class stage"
              >
                {!showClips && (
                  <div className="grid max-w-[34ch] gap-2 text-center">
                    <p className="m-0 text-[1.15rem] font-black tracking-[-0.02em] text-violet">Live class</p>
                    <p className="m-0 text-[0.95rem] font-bold leading-[1.45] text-muted">
                      The teacher&apos;s shared video will appear here when class starts.
                    </p>
                  </div>
                )}
                <AiClipsOverlay aiClips={state.aiClips} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 rounded-full border-2 border-[rgba(124,58,237,0.08)] bg-white px-3 py-2.5 shadow-[0_8px_0_rgba(124,58,237,0.08)]">
              <button type="button" className={handUp ? btnPink : btn} onClick={toggleHand}>
                {handUp ? "Hand is up" : "Raise hand"}
              </button>
              <button type="button" className={cx(btn, panel === "ask" && btnOn)} onClick={() => setPanel("ask")}>
                Ask question
              </button>
              <button type="button" className={cx(btn, panel === "mine" && btnOn)} onClick={() => setPanel("mine")}>
                My questions{mine.length ? ` (${mine.length})` : ""}
              </button>
            </div>
          </div>
        )}

        {nav === "learning" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-visible">
            <LearningBrowser
              classId={classId}
              learningByClass={state.learningByClass}
              galleryRevision={state.galleryRevision}
              captions={captions}
            />
          </div>
        )}
      </section>

      {showChat && (
        <aside
          className="flex h-full min-h-0 w-[340px] shrink-0 flex-col self-stretch overflow-hidden rounded-l-[40px] border-l-4 border-[rgba(236,72,153,0.25)] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.04)] max-[980px]:h-auto max-[980px]:max-h-[42vh] max-[980px]:w-full max-[980px]:rounded-t-[28px] max-[980px]:rounded-b-none max-[980px]:border-l-0 max-[980px]:border-t-4 max-[980px]:border-[rgba(236,72,153,0.25)]"
          aria-label="Student panel"
        >
          <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-2.5 border-b-2 border-[#f3f4f6] px-[18px] py-4">
              <h3 className="m-0 flex items-center gap-2 text-base font-extrabold text-ink">
                <svg
                  className="size-6 fill-none stroke-violet stroke-[2.5] [stroke-linecap:round] [stroke-linejoin:round]"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 10h8M8 14h5" />
                  <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                </svg>
                {panel === "mine" ? "My questions" : "Ask the class"}
              </h3>
              <span className="rounded-full bg-pink px-3 py-1 text-xs font-extrabold text-white">
                {panel === "mine" ? mine.length : state.questions.length}
              </span>
            </div>

            {panel === "ask" ? (
              <form
                className="flex min-h-0 flex-1 flex-col gap-3 px-[18px] pt-4 pb-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  ask(text, "text");
                }}
              >
                <textarea
                  className="min-h-[120px] flex-1 resize-none rounded-[18px] border-2 border-line bg-[#FBF8F3] p-3.5 font-sans font-semibold text-ink outline-none focus:border-lilac focus:bg-white"
                  value={text}
                  rows={4}
                  placeholder="Ask about something in the lesson…"
                  onChange={(event) => setText(event.target.value)}
                />
                <button type="submit" className={btnViolet} disabled={!text.trim()}>
                  Send to teacher
                </button>
                {error && <p className="m-0 text-[0.82rem] font-bold text-pink">{error}</p>}
              </form>
            ) : (
              <div
                className={cx(
                  "flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-[rgba(249,250,251,0.6)] px-4 pt-3.5 pb-5",
                  noScrollbar
                )}
              >
                {mine.length === 0 && (
                  <p className="my-6 text-center text-[0.9rem] font-bold text-[#9ca3af]">
                    Your questions will show up here, and on the teacher&apos;s Class Chat.
                  </p>
                )}
                {mine.map((question) => {
                  const badge = questionBadge(question, state);
                  return (
                    <article
                      key={question.id}
                      className="flex flex-col gap-2 rounded-[18px] border-2 border-line bg-white p-3 shadow-[0_3px_0_rgba(124,58,237,0.05)]"
                    >
                      <div className="flex items-start gap-2.5">
                        {question.region?.thumbnail && (
                          <img
                            className="size-11 shrink-0 rounded-xl object-cover"
                            src={question.region.thumbnail}
                            alt=""
                          />
                        )}
                        <div>
                          <strong className="block text-[0.88rem] text-ink">{question.text}</strong>
                          {question.concept && (
                            <span className="mt-0.5 block text-[0.72rem] font-bold text-muted">
                              {question.concept}
                            </span>
                          )}
                        </div>
                      </div>
                      <em
                        className={cx(
                          "self-start rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold not-italic",
                          BADGE[badge.tone]
                        )}
                      >
                        {badge.label}
                      </em>
                    </article>
                  );
                })}
                {error && <p className="m-0 text-[0.82rem] font-bold text-pink">{error}</p>}
              </div>
            )}
          </section>
        </aside>
      )}
    </main>
  );
}
