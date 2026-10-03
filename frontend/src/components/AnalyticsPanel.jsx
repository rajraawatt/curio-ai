import { useMemo, useState } from "react";

const TABS = [
  ["overview", "Overview"],
  ["live", "Live class"],
  ["self", "Self-paced"],
  ["lang", "Merged lesson"],
  ["stream", "Event stream"],
];

const LANG_META = {
  en: { label: "English", color: "#7C3AED" },
  hi: { label: "Hindi", color: "#EC4899" },
  es: { label: "Spanish", color: "#C4B5FD" },
};

const cardClass =
  "rounded-[22px] border-2 border-[#F0EAE0] bg-white p-4 shadow-[0_6px_0_rgba(124,58,237,0.05)]";
const pillBtn =
  "rounded-full border-2 border-[#F0EAE0] bg-white px-4 py-2 text-[0.85rem] font-extrabold text-[#6B7280] shadow-[0_3px_0_rgba(124,58,237,0.06)] hover:bg-[#EDE4FF] hover:text-[#7C3AED]";
const pillBtnOn =
  "rounded-full border-2 border-transparent bg-[#7C3AED] px-4 py-2 text-[0.85rem] font-extrabold text-white shadow-[0_4px_0_rgba(124,58,237,0.28)]";

function pieGradient(byLang) {
  const total = ["en", "hi", "es"].reduce((sum, code) => sum + (byLang[code] || 0), 0) || 1;
  let deg = 0;
  const parts = ["en", "hi", "es"]
    .filter((code) => byLang[code])
    .map((code) => {
      const slice = ((byLang[code] || 0) / total) * 360;
      const start = deg;
      deg += slice;
      return `${LANG_META[code].color} ${start}deg ${deg}deg`;
    });
  return parts.length ? parts.join(", ") : "#E8E2D8 0deg 360deg";
}

function LangPieCard({ video, compact, selected, onSelect }) {
  const total = video.total || 0;
  const dominant = ["en", "hi", "es"].reduce(
    (best, code) => ((video.byLang[code] || 0) > (video.byLang[best] || 0) ? code : best),
    "en"
  );
  return (
    <article
      className={`rounded-[20px] border-2 bg-white p-3.5 shadow-[0_5px_0_rgba(124,58,237,0.05)] ${
        selected ? "border-[rgba(124,58,237,0.35)] shadow-[0_6px_0_rgba(124,58,237,0.12)]" : "border-[#F0EAE0]"
      } ${onSelect ? "cursor-pointer" : ""} ${compact ? "p-3" : ""}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(video.id) : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(video.id);
            }
          : undefined
      }
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[0.7rem] font-extrabold uppercase tracking-[0.06em] text-[#EC4899]">
            Merged lesson · narration language
          </p>
          <h4 className="m-0 mt-1 font-black text-[#1F2937]">{video.label}</h4>
          {!compact && (
            <code className="mt-1 block text-[0.72rem] text-[#6B7280]" title="Analytics id / file">
              {video.fileHint || video.id}
            </code>
          )}
        </div>
        {!compact && total > 0 && (
          <span className="rounded-full bg-[#EDE4FF] px-2.5 py-1 text-[0.72rem] font-extrabold text-[#7C3AED]">
            Top: {LANG_META[dominant]?.label || dominant}
          </span>
        )}
      </header>
      <div className="mt-2.5 grid grid-cols-1 items-center gap-3.5 sm:grid-cols-[120px_1fr]">
        <div
          className="mx-auto grid h-[110px] w-[110px] place-items-center rounded-full"
          style={{ background: `conic-gradient(${pieGradient(video.byLang)})` }}
        >
          <div className="grid h-[58%] w-[58%] place-items-center rounded-full bg-white text-center">
            <b className="text-[1.1rem] text-[#7C3AED]">{total}</b>
            <span className="text-[0.65rem] font-extrabold text-[#6B7280]">plays</span>
          </div>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {["en", "hi", "es"].map((code) => {
            const n = video.byLang[code] || 0;
            const p = total ? Math.round((n / total) * 100) : 0;
            return (
              <li key={code} className="flex items-center gap-2 text-[0.82rem] font-extrabold">
                <i
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: LANG_META[code].color }}
                  aria-hidden
                />
                <span>{LANG_META[code].label}</span>
                <em className="not-italic text-[0.78rem] text-[#6B7280]">
                  {n} · {p}%
                </em>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function pct(ratio) {
  return `${Math.round((ratio || 0) * 100)}%`;
}

function formatSec(sec) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

function Ring({ ratio, label, sub, large }) {
  const deg = Math.round(Math.min(1, ratio || 0) * 360);
  return (
    <div
      className={`grid place-items-center rounded-full ${large ? "h-40 w-40" : "h-[120px] w-[120px]"}`}
      style={{ background: `conic-gradient(#7C3AED ${deg}deg, #EDE4FF 0)` }}
    >
      <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_2px_#F0EAE0]">
        <strong className="text-[1.4rem] text-[#7C3AED]">{pct(ratio)}</strong>
        <span className="text-[0.7rem] font-extrabold text-[#6B7280]">{label}</span>
        {sub && <em className="not-italic text-[0.7rem] text-[#6B7280]">{sub}</em>}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, suffix = "", accent }) {
  const width = max ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[minmax(80px,140px)_1fr_auto] items-center gap-2">
      <span className="truncate text-[0.78rem] font-extrabold text-[#1F2937]" title={label}>
        {label}
      </span>
      <i className="block h-2.5 overflow-hidden rounded-full bg-[#F3EEE6] not-italic">
        <b
          className="block h-full rounded-full"
          style={{
            width: `${width}%`,
            background: accent || "linear-gradient(90deg, #7C3AED, #EC4899)",
          }}
        />
      </i>
      <em className="not-italic text-[0.78rem] font-bold text-[#6B7280]">
        {value}
        {suffix}
      </em>
    </div>
  );
}

function SparkTimeline({ buckets, max }) {
  return (
    <div>
      <div className="flex h-16 items-end gap-1" aria-hidden>
        {buckets.map((bucket) => (
          <div
            key={bucket.t}
            className="min-h-1 flex-1 rounded-t bg-gradient-to-b from-[#C4B5FD] to-[#7C3AED]"
            style={{ height: `${Math.max(8, (bucket.count / max) * 100)}%` }}
            title={`${bucket.count} events`}
          />
        ))}
      </div>
      <span className="mt-2 block text-[0.72rem] font-bold text-[#6B7280]">Last 2 hours · 5 min buckets</span>
    </div>
  );
}

function LessonVideoBanner({ lesson, bq }) {
  if (!lesson?.id) return null;
  return (
    <section className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-[18px] border-2 border-[rgba(124,58,237,0.15)] bg-white px-4 py-3.5">
      <div>
        <p className="m-0 text-[0.7rem] font-extrabold uppercase tracking-[0.06em] text-[#EC4899]">
          Metrics scoped to this video
        </p>
        <h2 className="m-0 mt-1 font-black text-[#1F2937]">{lesson.label}</h2>
        <p className="m-0 mt-1 text-[0.82rem] font-bold text-[#6B7280]">
          <code>{lesson.fileHint}</code> · id <code>{lesson.id}</code> · pack <code>{lesson.packId}</code>
        </p>
      </div>
      <div className="text-[0.82rem] font-bold text-[#6B7280]">
        <span className={bq === "Streaming" ? "text-[#7C3AED]" : ""}>BigQuery {bq}</span>
        <p className="m-0 mt-1">
          Rows stream to <code>curiosity_events</code> with <code>item_id = &apos;lesson-merged&apos;</code>. See{" "}
          <code>sql/curiosity_merged_lesson_queries.sql</code> for warehouse reports.
        </p>
      </div>
    </section>
  );
}

function emptyDigest() {
  return {
    overview: { questionTotal: 0, exploredTotal: 0, conceptsExplored: 0, handsUp: 0, eventTotal: 0, mergedEventTotal: 0 },
    lessonVideo: {
      id: "lesson-merged",
      label: "Merged lesson video",
      fileHint: "lesson-merged.mp4",
      packId: "cell-mvp",
      total: 0,
      byLang: { en: 0, hi: 0, es: 0 },
      rewindsTotal: 0,
      opensTotal: 0,
    },
    live: {
      rosterSize: 24,
      activeCount: 0,
      activeRatio: 0,
      activeStudents: [],
      avgResponseSec: null,
      medianResponseSec: null,
      responseSamples: 0,
      responseTimes: [],
      questionsByStudent: [],
      maxQuestions: 1,
    },
    selfPaced: { topItems: [], maxItemClicks: 1, studentTime: [], maxTimeSec: 1, rewindsByStudent: [], rewindTotal: 0 },
    curiosity: { concepts: [], maxConcept: 1 },
    timeline: [],
    timelineMax: 1,
    videoLanguages: [],
    langTotals: { en: 0, hi: 0, es: 0 },
  };
}

export function AnalyticsPanel({ state, connected, onExit }) {
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState("all");

  const digest = state.analyticsDigest || emptyDigest();
  const lesson = digest.lessonVideo || emptyDigest().lessonVideo;
  const bq = state.bigquery?.status === "streaming" ? "Streaming" : state.bigquery?.status === "error" ? "Error" : "Local only";

  const events = useMemo(() => {
    const list = state.analytics || [];
    if (filter === "all") return list;
    if (filter === "live") return list.filter((e) => (e.mode || "live") === "live");
    if (filter === "self_paced") return list.filter((e) => e.mode === "self_paced");
    return list.filter((e) => e.event_type === filter);
  }, [state.analytics, filter]);

  const displayed = useMemo(() => events.slice().reverse(), [events]);
  const mergedVideo = digest.videoLanguages?.[0] || {
    ...lesson,
    total: lesson.total,
    byLang: lesson.byLang,
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(1000px_480px_at_8%_-10%,rgba(124,58,237,0.12),transparent_55%),radial-gradient(800px_420px_at_95%_0%,rgba(236,72,153,0.1),transparent_50%),#F8F4ED] font-[Nunito,sans-serif] text-[#1F2937]">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 border-b-2 border-[#F0EAE0] bg-white/85 px-6 pb-3.5 pt-[18px]">
        <div>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 text-[0.85rem] font-extrabold text-[#7C3AED] hover:underline"
            onClick={onExit}
          >
            ← Back to classroom
          </button>
          <h1 className="m-0 mt-2 text-[clamp(1.4rem,2.6vw,1.85rem)] font-black tracking-[-0.02em] text-[#1F2937]">
            Class analytics
          </h1>
          <p className="m-0 text-[0.88rem] font-bold text-[#6B7280]">
            Room <strong className="text-[#7C3AED]">{state.room}</strong> · {connected ? "Live sync" : "Reconnecting"} ·
            BigQuery {bq}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? pillBtnOn : pillBtn}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 pb-9 pt-[18px]">
        <LessonVideoBanner lesson={lesson} bq={bq} />

        {tab === "overview" && (
          <div className="grid gap-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {[
                [digest.overview.questionTotal, "Questions asked"],
                [digest.overview.exploredTotal, "Explorations"],
                [digest.overview.conceptsExplored, "Concepts touched"],
                [lesson.total || 0, "Merged lesson plays"],
                [digest.selfPaced.rewindTotal, "Rewinds (merged)"],
                [pct(digest.live.activeRatio), "Active on roster"],
                [digest.overview.eventTotal, "Events logged"],
              ].map(([value, label]) => (
                <article
                  key={label}
                  className="rounded-[18px] border-2 border-[#F0EAE0] bg-white p-4 shadow-[0_6px_0_rgba(124,58,237,0.06)]"
                >
                  <b className="block text-[clamp(1.4rem,2.4vw,1.9rem)] font-black tracking-[-0.04em] text-[#7C3AED]">
                    {value}
                  </b>
                  <span className="text-[0.78rem] font-bold text-[#6B7280]">{label}</span>
                </article>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              <section className={cardClass}>
                <h3 className="mb-2 font-black text-[#1F2937]">Activity pulse</h3>
                <SparkTimeline buckets={digest.timeline} max={digest.timelineMax} />
              </section>
              <section className={`${cardClass} md:col-span-2`}>
                <h3 className="mb-2 font-black text-[#1F2937]">What the class was curious about</h3>
                <div className="grid gap-2.5">
                  {digest.curiosity.concepts.length === 0 && (
                    <p className="m-0 mb-2.5 text-[0.85rem] font-bold text-[#6B7280]">No concept tags yet.</p>
                  )}
                  {digest.curiosity.concepts.map(({ concept, count }) => (
                    <BarRow key={concept} label={concept} value={count} max={digest.curiosity.maxConcept} />
                  ))}
                </div>
              </section>
            </div>

            <section className={cardClass}>
              <h3 className="mb-2 font-black text-[#1F2937]">Language mix — merged lesson only</h3>
              <LangPieCard video={mergedVideo} />
            </section>
          </div>
        )}

        {tab === "live" && (
          <div className="grid gap-4">
            <section className={`${cardClass} grid grid-cols-1 items-center gap-[18px] md:grid-cols-[auto_1fr]`}>
              <div>
                <h3 className="m-0 mb-2 font-black text-[#1F2937]">Live engagement</h3>
                <p className="m-0 mb-2.5 text-[0.85rem] font-bold text-[#6B7280]">
                  Students active in the last 15 minutes vs roster size.
                </p>
              </div>
              <Ring
                large
                ratio={digest.live.activeRatio}
                label="of roster active"
                sub={`${digest.live.activeCount} / ${digest.live.rosterSize} students`}
              />
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0 md:col-span-2">
                {digest.live.activeStudents.map((name) => (
                  <li
                    key={name}
                    className="rounded-full bg-[#EDE4FF] px-3 py-1.5 text-[0.78rem] font-extrabold text-[#7C3AED]"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <section className={cardClass}>
                <h3 className="m-0 mb-2 font-black text-[#1F2937]">Teacher response time</h3>
                <p className="m-0 mb-2.5 text-[0.85rem] font-bold text-[#6B7280]">
                  Question submitted → teacher select or explore.
                </p>
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border-2 border-[#F0EAE0] bg-[#F8F4ED] p-3">
                    <b className="block text-[1.4rem] text-[#7C3AED]">{formatSec(digest.live.avgResponseSec)}</b>
                    <span className="text-[0.78rem] font-bold text-[#6B7280]">Average</span>
                  </div>
                  <div className="rounded-2xl border-2 border-[#F0EAE0] bg-[#F8F4ED] p-3">
                    <b className="block text-[1.4rem] text-[#7C3AED]">{formatSec(digest.live.medianResponseSec)}</b>
                    <span className="text-[0.78rem] font-bold text-[#6B7280]">Median</span>
                  </div>
                  <div className="rounded-2xl border-2 border-[#F0EAE0] bg-[#F8F4ED] p-3">
                    <b className="block text-[1.4rem] text-[#7C3AED]">{digest.live.responseSamples}</b>
                    <span className="text-[0.78rem] font-bold text-[#6B7280]">Samples</span>
                  </div>
                </div>
                <div className="grid gap-2.5">
                  {digest.live.responseTimes.map((sec, i) => (
                    <BarRow
                      key={`rt-${i}`}
                      label={`Response ${i + 1}`}
                      value={sec}
                      max={Math.max(...digest.live.responseTimes, 1)}
                      suffix="s"
                      accent="linear-gradient(90deg, #C4B5FD, #7C3AED)"
                    />
                  ))}
                </div>
              </section>

              <section className={cardClass}>
                <h3 className="m-0 mb-2 font-black text-[#1F2937]">Questions by student</h3>
                <div className="grid gap-2.5">
                  {digest.live.questionsByStudent.length === 0 && (
                    <p className="m-0 mb-2.5 text-[0.85rem] font-bold text-[#6B7280]">
                      Questions will appear as students ask.
                    </p>
                  )}
                  {digest.live.questionsByStudent.map(({ name, count }) => (
                    <BarRow key={name} label={name} value={count} max={digest.live.maxQuestions} accent="#C4B5FD" />
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "self" && (
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <section className={cardClass}>
                <h3 className="m-0 mb-2 font-black text-[#1F2937]">Opens — merged lesson</h3>
                <p className="m-0 mb-2.5 text-[0.85rem] font-bold text-[#6B7280]">
                  Clicks to open the full merged video (not separate clips or 3D).
                </p>
                <div className="grid gap-2.5">
                  {digest.selfPaced.topItems.map(({ label, count }) => (
                    <BarRow key={label} label={label} value={count} max={digest.selfPaced.maxItemClicks} accent="#A78BFA" />
                  ))}
                </div>
              </section>

              <section className={cardClass}>
                <h3 className="m-0 mb-2 font-black text-[#1F2937]">Time on merged lesson</h3>
                <div className="grid gap-2.5">
                  {digest.selfPaced.studentTime.map(({ name, seconds }) => (
                    <BarRow
                      key={name}
                      label={name}
                      value={Math.round(seconds / 60)}
                      max={Math.ceil(digest.selfPaced.maxTimeSec / 60)}
                      suffix=" min"
                      accent="#EC4899"
                    />
                  ))}
                </div>
              </section>

              <section className={`${cardClass} md:col-span-2`}>
                <h3 className="m-0 mb-2 font-black text-[#1F2937]">Rewinds &amp; replay</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
                  <article className="rounded-2xl border-2 border-[#F0EAE0] bg-[#F8F4ED] p-3">
                    <b className="block text-[1.4rem] text-[#7C3AED]">{digest.selfPaced.rewindTotal}</b>
                    <span className="text-[0.78rem] font-bold text-[#6B7280]">Total rewinds</span>
                  </article>
                  {digest.selfPaced.rewindsByStudent.map(({ name, count }) => (
                    <article key={name} className="rounded-2xl border-2 border-[#F0EAE0] bg-[#F8F4ED] p-3">
                      <b className="block text-[1.4rem] text-[#7C3AED]">{count}</b>
                      <span className="text-[0.78rem] font-bold text-[#6B7280]">{name}</span>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "lang" && (
          <div className="grid gap-4">
            <section className={cardClass}>
              <h3 className="m-0 mb-2 font-black text-[#1F2937]">Narration language — full merged video</h3>
              <p className="m-0 max-w-[60ch] text-[0.85rem] font-bold text-[#6B7280]">
                English, Hindi, and Spanish plays for <strong className="text-[#1F2937]">{lesson.label}</strong>. Only
                the merged <code>{lesson.fileHint}</code> file is tracked in class and in BigQuery (
                <code>item_id=lesson-merged</code>).
              </p>
            </section>
            <div className="max-w-[520px]">
              {mergedVideo.total > 0 ? (
                <LangPieCard video={mergedVideo} />
              ) : (
                <p className="m-0 text-[0.85rem] font-bold text-[#6B7280]">
                  Play the merged lesson on Prepare or Upload in class to collect language data.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "stream" && (
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["live", "Live"],
                ["self_paced", "Self-paced"],
                ["question", "Questions"],
                ["teacher_response", "Responses"],
                ["content_click", "Clicks"],
                ["rewind", "Rewinds"],
                ["video_play", "Video plays"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={
                    filter === id
                      ? "rounded-full border-2 border-transparent bg-[#7C3AED] px-3 py-2 text-[0.8rem] font-extrabold text-white"
                      : "cursor-pointer rounded-full border-2 border-[#F0EAE0] bg-white px-3 py-2 text-[0.8rem] font-extrabold text-[#7C3AED]"
                  }
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="overflow-auto">
              <ol className="m-0 list-none p-0">
                <li className="grid grid-cols-[90px_110px_90px_minmax(80px,1fr)_minmax(120px,2fr)] gap-2 border-b border-[#F0EAE0] py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#6B7280]">
                  <span>Time</span>
                  <span>Type</span>
                  <span>Mode</span>
                  <span>Who</span>
                  <span>Detail</span>
                </li>
                {displayed.map((event) => (
                  <li
                    key={event.insert_id}
                    className="grid grid-cols-[90px_110px_90px_minmax(80px,1fr)_minmax(120px,2fr)] gap-2 border-b border-[#F0EAE0] py-2.5 text-[0.85rem] font-bold"
                  >
                    <time>{new Date(event.event_time).toLocaleTimeString()}</time>
                    <strong>{event.event_type}</strong>
                    <span>{event.mode || "live"}</span>
                    <span>{event.student_name || "—"}</span>
                    <em className="not-italic">
                      {event.event_type === "video_play" && event.item_label ? (
                        <>
                          <b className="text-[#7C3AED]">{event.item_label}</b>
                          {event.concept ? ` · ${event.concept}` : ""}
                        </>
                      ) : (
                        event.item_label || event.question || event.concept || event.source
                      )}
                      {event.language ? ` · ${LANG_META[event.language]?.label || event.language}` : ""}
                      {Number.isFinite(event.value_num) ? ` · ${event.value_num}` : ""}
                    </em>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
