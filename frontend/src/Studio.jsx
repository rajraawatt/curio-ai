import { useEffect, useRef, useState } from "react";
import { LessonClipPlayer } from "./components/LessonClipPlayer.jsx";

const HISTORY_KEY = "curio-studio-history";

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id) : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 24)));
}

async function readStudioStream(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let event = "message";
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      try {
        onEvent(event, JSON.parse(dataLines.join("\n")));
      } catch {
        // ignore a partial chunk
      }
    }
  }
}

export function Studio() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [momentIndex, setMomentIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [labelId, setLabelId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [panelView, setPanelView] = useState("model");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [tutorBusy, setTutorBusy] = useState(false);
  const [history, setHistory] = useState(() => readHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const playbackRef = useRef(null);
  const momentIndexRef = useRef(0);

  const moment = session?.moments?.[momentIndex] || null;
  const images = moment?.images || [];
  const image = images[imageIndex] || images.find((item) => item.url) || null;
  const viewImage =
    panelView === "exploded" ? moment?.exploded : panelView === "inside" ? moment?.inside : image;
  const label = moment?.labels?.find((item) => item.id === labelId) || null;

  useEffect(() => {
    momentIndexRef.current = momentIndex;
  }, [momentIndex]);

  useEffect(() => {
    if (!session?.id) return;
    setHistory((prev) => {
      const next = [session, ...prev.filter((item) => item.id !== session.id)].slice(0, 24);
      writeHistory(next);
      return next;
    });
  }, [session]);

  function applyMoment(index, seek) {
    const next = session?.moments?.[index];
    if (!next) return;
    setMomentIndex(index);
    setImageIndex(0);
    setLabelId(null);
    setHoverId(null);
    setMessages([]);
    setQuestion("");
    if (seek && next.seekSec != null) playbackRef.current?.seek(next.seekSec);
  }

  function onTime(time) {
    const moments = session?.moments || [];
    let index = -1;
    moments.forEach((item, i) => {
      if (item.seekSec != null && time + 0.05 >= item.seekSec) index = i;
    });
    if (index >= 0 && index !== momentIndexRef.current) {
      const next = moments[index];
      setMomentIndex(index);
      setImageIndex(0);
      setLabelId(null);
      setHoverId(null);
      setMessages([]);
    }
  }

  async function generate(event) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;
    setHistoryOpen(false);
    setPanelView("model");
    setBusy(true);
    setError("");
    setNotice("Starting…");
    setSession(null);
    setMomentIndex(0);
    setImageIndex(0);
    setLabelId(null);
    setMessages([]);
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Studio failed (${res.status})`);
      }
      await readStudioStream(res, (eventName, data) => {
        if (eventName === "status" && data.notice) setNotice(data.notice);
        if ((eventName === "session" || eventName === "done") && data.session) {
          setSession(data.session);
        }
        if (eventName === "error") setError(data.error || "Studio failed");
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function askTutor(text) {
    const ask = String(text || "").trim();
    if (!ask || !label || tutorBusy) return;
    const history = messages;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: ask }]);
    setTutorBusy(true);
    try {
      const res = await fetch("/api/model-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: ask,
          modelLabel: moment?.title,
          modelId: moment?.id,
          partId: label.id,
          partLabel: label.text,
          topic: session?.topic,
          reason: label.blurb,
          history,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tutor failed");
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer, followUp: data.followUp }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: err.message }]);
    } finally {
      setTutorBusy(false);
    }
  }

  function openChat(item) {
    setSession(item);
    setPrompt(item.prompt || item.topic || "");
    setNotice("");
    setError("");
    setMomentIndex(0);
    setImageIndex(0);
    setLabelId(null);
    setHoverId(null);
    setMessages([]);
    setQuestion("");
    setHistoryOpen(false);
  }

  function newChat() {
    setSession(null);
    setPrompt("");
    setNotice("");
    setError("");
    setMomentIndex(0);
    setImageIndex(0);
    setLabelId(null);
    setMessages([]);
    setHistoryOpen(false);
  }

  const showWorkspace = Boolean(session) || busy;
  const clip = session?.video?.url
    ? {
        id: "studio-lesson",
        merged: true,
        title: session.topic,
        url: session.video.url,
        posterUrl: session.video.posterUrl,
        durationSeconds: session.video.durationSeconds,
        captions: session.video.captions,
        packId: "studio",
      }
    : null;

  return (
    <main className="flex h-screen overflow-hidden bg-[#0e1116] font-sans text-[#e8eaed]">
      <aside
        className={`shrink-0 overflow-hidden border-white/10 bg-[#12161c] transition-[width] duration-200 ${
          historyOpen ? "w-72 border-r" : "w-0"
        }`}
        aria-hidden={!historyOpen}
      >
        <div className="flex h-full w-72 flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <p className="m-0 text-sm font-black">Chats</p>
            <button
              type="button"
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black"
              onClick={() => setHistoryOpen(false)}
            >
              Hide
            </button>
          </div>
          <button
            type="button"
            className="mx-3 mb-3 rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-black"
            onClick={newChat}
          >
            New chat
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {history.length === 0 && (
              <p className="px-2 text-sm font-bold text-white/40">Lessons you generate show up here.</p>
            )}
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mb-1 w-full truncate rounded-xl px-3 py-2 text-left text-sm font-bold hover:bg-white/10 ${
                  item.id === session?.id ? "bg-white/10" : ""
                }`}
                onClick={() => openChat(item)}
              >
                {item.topic || item.prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <form
        className={showWorkspace ? "border-b border-white/10 px-4 py-3" : "m-auto w-full max-w-2xl px-4"}
        onSubmit={generate}
      >
        {!showWorkspace && (
          <h1 className="mb-6 text-center text-2xl font-black tracking-[-0.03em]">What should the lesson explain?</h1>
        )}
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-3xl border border-white/10 bg-[#1a1f27] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
          <button
            type="button"
            className="mb-1 rounded-full px-3 py-2 text-sm font-black text-white/70 hover:bg-white/10"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
          >
            Chats
          </button>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={showWorkspace ? 1 : 3}
            placeholder="Explain how a rocket launch works…"
            className="min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2 text-[0.95rem] font-bold text-white outline-none placeholder:text-white/40"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={busy || !prompt.trim()}
            className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            {busy ? "Working…" : "Generate"}
          </button>
        </div>
        {!showWorkspace && (
          <p className="mt-3 text-center text-sm font-bold text-white/45">
            One prompt becomes a five-moment video, four stills each, plus an exploded view and an inside view.
          </p>
        )}
      </form>

      {showWorkspace && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              ["Video", null],
              ["3D Model", "model"],
              ["Exploded View", "exploded"],
              ["Inside View", "inside"],
              ["Compare", null],
              ["Quiz", null],
            ].map(([name, view]) => (
              <button
                key={name}
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
                  view && panelView === view ? "bg-[#2563eb] text-white" : "bg-white/5 text-white/45"
                }`}
                onClick={(event) => {
                  event.preventDefault();
                  if (view) setPanelView(view);
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <section className="grid min-h-0 content-start gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#121826] p-4">
            <div>
              <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-white/45">Lesson video</p>
              <h2 className="m-0 mt-1 text-lg font-black">{session?.topic || "Building the lesson"}</h2>
              {notice && <p className="m-0 mt-1 text-sm font-bold text-[#c4b5fd]">{notice}</p>}
              {error && <p className="m-0 mt-1 text-sm font-bold text-[#f9a8d4]">{error}</p>}
            </div>
            {clip ? (
              <LessonClipPlayer
                clip={clip}
                lang="en"
                ageGroup="11-14"
                captions
                playbackRef={playbackRef}
                onTime={onTime}
                trackPlayback={false}
                compact
              />
            ) : (
              <div className="grid min-h-[220px] place-items-center rounded-xl bg-black/40 px-6 text-center text-sm font-bold text-white/60">
                {busy ? "The video appears after the stills." : "No video yet."}
              </div>
            )}
            <div className="grid grid-cols-5 gap-2">
              {(session?.moments?.length ? session.moments : [0, 1, 2, 3, 4]).map((item, index) => {
                const active = index === momentIndex;
                const thumb = item?.images?.find((imageItem) => imageItem.url);
                return (
                  <button
                    key={item?.id || index}
                    type="button"
                    className={`overflow-hidden rounded-xl border text-left ${
                      active ? "border-[#7C3AED]" : "border-white/10"
                    }`}
                    onClick={() => applyMoment(index, true)}
                    disabled={!item?.id}
                  >
                    <div className="aspect-video bg-black/50">
                      {thumb?.url && <img src={thumb.url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className="block truncate px-2 py-1 text-[0.72rem] font-extrabold">
                      {item?.title || `Moment ${index + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
            {moment?.points?.length > 0 && (
              <div>
                <p className="m-0 text-sm font-black">Key concepts</p>
                <ul className="m-0 mt-2 grid list-disc gap-1 pl-5 text-sm font-bold leading-relaxed text-white/70">
                  {moment.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#121826] p-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                ["3D Model", "model"],
                ["Exploded View", "exploded"],
                ["Inside View", "inside"],
              ].map(([name, view]) => (
                <button
                  key={name}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    panelView === view ? "bg-[#2563eb] text-white" : "text-white/45"
                  }`}
                  onClick={() => setPanelView(view)}
                >
                  {name}
                </button>
              ))}
            </div>
            {panelView === "model" && images.length > 0 && (
              <div className="flex gap-2">
                {images.map((item, index) => (
                  <button
                    key={`${item.id}-${index}`}
                    type="button"
                    className={`overflow-hidden rounded-lg border ${
                      index === imageIndex ? "border-[#2563eb]" : "border-white/10"
                    }`}
                    onClick={() => setImageIndex(index)}
                  >
                    {item.url ? (
                      <img src={item.url} alt="" className="h-14 w-20 object-cover" />
                    ) : (
                      <span className="grid h-14 w-20 place-items-center text-[0.65rem] font-extrabold text-white/40">
                        {item.error ? "Failed" : busy ? "…" : index + 1}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-xl bg-[#0b1220]">
              {viewImage?.url ? (
                <img src={viewImage.url} alt={moment?.title || "Lesson still"} className="h-full max-h-[420px] w-full object-contain" />
              ) : (
                <div className="grid h-full min-h-[240px] place-items-center px-4 text-center text-sm font-bold text-white/50">
                  {viewImage?.error || (busy ? "Gemini is drawing this view." : "Pick a moment.")}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {["Reset", "Rotate", "Zoom", "Isolate", "X-Ray"].map((name) => (
                <button
                  key={name}
                  type="button"
                  className="rounded-full bg-white/5 px-3 py-1 text-[0.7rem] font-extrabold text-white/35"
                  onClick={(event) => event.preventDefault()}
                >
                  {name}
                </button>
              ))}
            </div>
            {moment?.labels?.length > 0 && (
              <div>
                <p className="m-0 mb-2 text-xs font-extrabold uppercase tracking-[0.06em] text-white/45">Explore other parts</p>
                <div className="flex flex-wrap gap-2">
                  {moment.labels.map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                        label?.id === part.id ? "bg-[#2563eb] text-white" : "bg-white/10 text-white hover:bg-white/15"
                      }`}
                      onClick={() => {
                        setLabelId(part.id);
                        setMessages([]);
                        setQuestion("");
                      }}
                    >
                      {part.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          </div>

          {label && (
            <aside className="grid shrink-0 content-start gap-3 rounded-2xl border border-white/10 bg-[#121826] p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="m-0 text-lg font-black">{label.text}</h3>
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-2 py-1 text-xs font-black"
                  onClick={() => setLabelId(null)}
                >
                  Close
                </button>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-[#2563eb] px-3 py-1 text-xs font-extrabold">Overview</span>
                {["Function", "Structure", "Related"].map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="rounded-full px-2 py-1 text-xs font-extrabold text-white/40"
                    onClick={(event) => event.preventDefault()}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <p className="m-0 text-sm font-bold leading-relaxed text-white/75">{label.blurb}</p>
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                {messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      msg.role === "user" ? "bg-white/10" : "bg-[#2563eb]"
                    }`}
                  >
                    <p className="m-0">{msg.text}</p>
                    {msg.followUp && (
                      <button
                        type="button"
                        className="mt-2 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black"
                        onClick={() => askTutor(msg.followUp)}
                      >
                        Ask: {msg.followUp}
                      </button>
                    )}
                  </div>
                ))}
                {tutorBusy && <p className="m-0 text-sm font-bold text-[#93c5fd]">Thinking…</p>}
              </div>
              <p className="m-0 text-xs font-extrabold text-white/50">Ask about {label.text}</p>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  askTutor(question);
                }}
              >
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={`Ask about ${label.text}…`}
                  disabled={tutorBusy}
                  className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#0e1116] px-3 py-2 text-sm font-bold outline-none"
                />
                <button
                  type="submit"
                  disabled={tutorBusy || !question.trim()}
                  className="rounded-full bg-[#2563eb] px-3 py-2 text-sm font-black text-white disabled:opacity-40"
                >
                  Ask
                </button>
              </form>
            </aside>
          )}
        </div>
      )}

      {session?.errors?.length > 0 && (
        <p className="m-0 px-4 pb-3 text-xs font-bold text-[#f9a8d4]">{session.errors[session.errors.length - 1]}</p>
      )}
      </div>
    </main>
  );
}
