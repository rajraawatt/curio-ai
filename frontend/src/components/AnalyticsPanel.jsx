import { useMemo, useState } from "react";

const TABS = [
  ["overview", "Overview"],
  ["live", "Live class"],
  ["self", "Self-paced"],
  ["lang", "Merged lesson"],
  ["stream", "Event stream"],
];

const LANG_META = {
  en: { label: "English", color: "#8ab4f8" },
  hi: { label: "Hindi", color: "#f28b82" },
  es: { label: "Spanish", color: "#81c995" },
};

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
  return parts.length ? parts.join(", ") : "#3c4043 0deg 360deg";
}

function LangPieCard({ video, compact, selected, onSelect }) {
  const total = video.total || 0;
  const dominant = ["en", "hi", "es"].reduce(
    (best, code) => ((video.byLang[code] || 0) > (video.byLang[best] || 0) ? code : best),
    "en"
  );
  return (
    <article
      className={`dash-lang-card ${compact ? "compact" : ""} ${selected ? "selected" : ""}`}
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
      <header className="dash-video-head">
        <div>
          <p className="dash-video-kicker">Merged lesson · narration language</p>
          <h4>{video.label}</h4>
          {!compact && (
            <code className="dash-video-file" title="Analytics id / file">
              {video.fileHint || video.id}
            </code>
          )}
        </div>
        {!compact && total > 0 && (
          <span className="dash-video-top-lang">
            Top: {LANG_META[dominant]?.label || dominant}
          </span>
        )}
      </header>
      <div className="dash-lang-pie-wrap">
        <div className="dash-lang-pie" style={{ background: `conic-gradient(${pieGradient(video.byLang)})` }}>
          <div className="dash-lang-pie-hole">
            <b>{total}</b>
            <span>plays</span>
          </div>
        </div>
        <ul className="dash-lang-legend">
          {["en", "hi", "es"].map((code) => {
            const n = video.byLang[code] || 0;
            const p = total ? Math.round((n / total) * 100) : 0;
            return (
              <li key={code}>
                <i style={{ background: LANG_META[code].color }} aria-hidden />
                <span>{LANG_META[code].label}</span>
                <em>
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
    <div className={`dash-ring ${large ? "large" : ""}`} style={{ "--ring-deg": `${deg}deg` }}>
      <div className="dash-ring-inner">
        <strong>{pct(ratio)}</strong>
        <span>{label}</span>
        {sub && <em>{sub}</em>}
      </div>
    </div>
  );
}

function BarRow({ label, value, max, suffix = "", accent }) {
  const width = max ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="dash-bar-row">
      <span className="dash-bar-label" title={label}>
        {label}
      </span>
      <i className="dash-bar-track">
        <b style={{ width: `${width}%`, background: accent || "var(--dash-accent)" }} />
      </i>
      <em>
        {value}
        {suffix}
      </em>
    </div>
  );
}

function SparkTimeline({ buckets, max }) {
  return (
    <div className="dash-spark" aria-hidden>
      {buckets.map((bucket) => (
        <div
          key={bucket.t}
          className="dash-spark-col"
          style={{ height: `${Math.max(8, (bucket.count / max) * 100)}%` }}
          title={`${bucket.count} events`}
        />
      ))}
      <span className="dash-spark-caption">Last 2 hours · 5 min buckets</span>
    </div>
  );
}

function LessonVideoBanner({ lesson, bq }) {
  if (!lesson?.id) return null;
  return (
    <section className="dash-lesson-banner">
      <div>
        <p className="dash-video-kicker">Metrics scoped to this video</p>
        <h2>{lesson.label}</h2>
        <p className="dash-lesson-meta">
          <code>{lesson.fileHint}</code> · id <code>{lesson.id}</code> · pack <code>{lesson.packId}</code>
        </p>
      </div>
      <div className="dash-bq-note">
        <span className={bq === "Streaming" ? "live" : ""}>BigQuery {bq}</span>
        <p>
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
    <div className="analytics dash dash-fullscreen">
      <header className="dash-hero">
        <div className="dash-hero-main">
          <button type="button" className="dash-exit" onClick={onExit}>
            ← Back to classroom
          </button>
          <h1>Class analytics</h1>
          <p>
            Room <strong>{state.room}</strong> · {connected ? "Live sync" : "Reconnecting"} · BigQuery {bq}
          </p>
        </div>
        <div className="dash-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "on" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="dash-scroll">
        <LessonVideoBanner lesson={lesson} bq={bq} />

        {tab === "overview" && (
          <div className="dash-pane">
            <div className="dash-kpis">
              <article>
                <b>{digest.overview.questionTotal}</b>
                <span>Questions asked</span>
              </article>
              <article>
                <b>{digest.overview.exploredTotal}</b>
                <span>Explorations</span>
              </article>
              <article>
                <b>{digest.overview.conceptsExplored}</b>
                <span>Concepts touched</span>
              </article>
              <article>
                <b>{lesson.total || 0}</b>
                <span>Merged lesson plays</span>
              </article>
              <article>
                <b>{digest.selfPaced.rewindTotal}</b>
                <span>Rewinds (merged)</span>
              </article>
              <article>
                <b>{pct(digest.live.activeRatio)}</b>
                <span>Active on roster</span>
              </article>
              <article>
                <b>{digest.overview.eventTotal}</b>
                <span>Events logged</span>
              </article>
            </div>

            <div className="dash-grid-3">
              <section className="dash-card glass">
                <h3>Activity pulse</h3>
                <SparkTimeline buckets={digest.timeline} max={digest.timelineMax} />
              </section>
              <section className="dash-card glass dash-span-2">
                <h3>What the class was curious about</h3>
                <div className="dash-bars">
                  {digest.curiosity.concepts.length === 0 && <p className="dash-muted">No concept tags yet.</p>}
                  {digest.curiosity.concepts.map(({ concept, count }) => (
                    <BarRow key={concept} label={concept} value={count} max={digest.curiosity.maxConcept} />
                  ))}
                </div>
              </section>
            </div>

            <section className="dash-card glass">
              <h3>Language mix — merged lesson only</h3>
              <LangPieCard video={mergedVideo} />
            </section>
          </div>
        )}

        {tab === "live" && (
          <div className="dash-pane dash-pane-live">
            <section className="dash-card glass dash-live-hero">
              <div>
                <h3>Live engagement</h3>
                <p className="dash-lede">Students active in the last 15 minutes vs roster size.</p>
              </div>
              <Ring
                large
                ratio={digest.live.activeRatio}
                label="of roster active"
                sub={`${digest.live.activeCount} / ${digest.live.rosterSize} students`}
              />
              <ul className="dash-chips">
                {digest.live.activeStudents.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </section>

            <div className="dash-grid-2">
              <section className="dash-card glass">
                <h3>Teacher response time</h3>
                <p className="dash-lede">Question submitted → teacher select or explore.</p>
                <div className="dash-stat-pair">
                  <div>
                    <b>{formatSec(digest.live.avgResponseSec)}</b>
                    <span>Average</span>
                  </div>
                  <div>
                    <b>{formatSec(digest.live.medianResponseSec)}</b>
                    <span>Median</span>
                  </div>
                  <div>
                    <b>{digest.live.responseSamples}</b>
                    <span>Samples</span>
                  </div>
                </div>
                <div className="dash-mini-bars">
                  {digest.live.responseTimes.map((sec, i) => (
                    <BarRow
                      key={`rt-${i}`}
                      label={`Response ${i + 1}`}
                      value={sec}
                      max={Math.max(...digest.live.responseTimes, 1)}
                      suffix="s"
                      accent="linear-gradient(90deg, #81c995, #8ab4f8)"
                    />
                  ))}
                </div>
              </section>

              <section className="dash-card glass">
                <h3>Questions by student</h3>
                <div className="dash-bars">
                  {digest.live.questionsByStudent.length === 0 && (
                    <p className="dash-muted">Questions will appear as students ask.</p>
                  )}
                  {digest.live.questionsByStudent.map(({ name, count }) => (
                    <BarRow key={name} label={name} value={count} max={digest.live.maxQuestions} accent="#c58af9" />
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "self" && (
          <div className="dash-pane">
            <div className="dash-grid-2">
              <section className="dash-card glass">
                <h3>Opens — merged lesson</h3>
                <p className="dash-lede">Clicks to open the full merged video (not separate clips or 3D).</p>
                <div className="dash-bars interactive">
                  {digest.selfPaced.topItems.map(({ label, count }) => (
                    <BarRow key={label} label={label} value={count} max={digest.selfPaced.maxItemClicks} accent="#81c995" />
                  ))}
                </div>
              </section>

              <section className="dash-card glass">
                <h3>Time on merged lesson</h3>
                <div className="dash-bars">
                  {digest.selfPaced.studentTime.map(({ name, seconds }) => (
                    <BarRow
                      key={name}
                      label={name}
                      value={Math.round(seconds / 60)}
                      max={Math.ceil(digest.selfPaced.maxTimeSec / 60)}
                      suffix=" min"
                      accent="#f28b82"
                    />
                  ))}
                </div>
              </section>

              <section className="dash-card glass dash-span-2">
                <h3>Rewinds &amp; replay</h3>
                <div className="dash-rewind-grid">
                  <article>
                    <b>{digest.selfPaced.rewindTotal}</b>
                    <span>Total rewinds</span>
                  </article>
                  {digest.selfPaced.rewindsByStudent.map(({ name, count }) => (
                    <article key={name}>
                      <b>{count}</b>
                      <span>{name}</span>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === "lang" && (
          <div className="dash-pane">
            <section className="dash-card glass dash-lang-intro">
              <h3>Narration language — full merged video</h3>
              <p className="dash-lede">
                English, Hindi, and Spanish plays for <strong>{lesson.label}</strong>. Only the merged{" "}
                <code>{lesson.fileHint}</code> file is tracked in class and in BigQuery (<code>item_id=lesson-merged</code>
                ).
              </p>
            </section>
            <div className="dash-lang-single">
              {mergedVideo.total > 0 ? (
                <LangPieCard video={mergedVideo} />
              ) : (
                <p className="dash-muted">Play the merged lesson on Prepare or Upload in class to collect language data.</p>
              )}
            </div>
          </div>
        )}

        {tab === "stream" && (
          <div className="dash-pane">
            <div className="dash-filters">
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
                <button key={id} type="button" className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="dash-table-wrap">
              <ol className="log dash-log dash-table">
                <li className="dash-table-head">
                  <span>Time</span>
                  <span>Type</span>
                  <span>Mode</span>
                  <span>Who</span>
                  <span>Detail</span>
                </li>
                {displayed.map((event) => (
                  <li key={event.insert_id}>
                    <time>{new Date(event.event_time).toLocaleTimeString()}</time>
                    <strong>{event.event_type}</strong>
                    <span>{event.mode || "live"}</span>
                    <span>{event.student_name || "—"}</span>
                    <em>
                      {event.event_type === "video_play" && event.item_label ? (
                        <>
                          <b className="dash-stream-video">{event.item_label}</b>
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
