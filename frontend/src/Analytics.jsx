import { useEffect, useState } from "react";
import { Activity, ArrowLeft, BarChart3, BookOpen, BrainCircuit, CircleAlert, Clock3, MessageCircle, RefreshCw, Sparkles, Users } from "lucide-react";

const number = (value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Number(value || 0));
const percent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

function Metric({ label, value, hint, icon: Icon }) {
  return <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
    <div className="flex items-center justify-between gap-2 text-sm text-white/55"><span>{label}</span><Icon size={17} className="text-violet-300" /></div>
    <p className="m-0 mt-3 text-3xl font-black tracking-tight">{value}</p>
    <p className="m-0 mt-1 text-xs text-white/40">{hint}</p>
  </article>;
}

function Empty({ children }) {
  return <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-white/45">{children}</div>;
}

function BarList({ items, labelKey, valueKey, color = "from-violet-500 to-fuchsia-400" }) {
  if (!items?.length) return <Empty>No events in this period yet. Use CURIO and the charts will populate.</Empty>;
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey] || 0)));
  return <div className="grid gap-3">{items.map((item, index) => <div key={item[labelKey] || index}>
    <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate text-white/75">{item[labelKey] || "Other"}</span><span className="shrink-0 tabular-nums text-white/55">{number(item[valueKey])}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(0, Number(item[valueKey] || 0) / max * 100)}%` }} /></div>
  </div>)}</div>;
}

function TrendChart({ data }) {
  if (!data?.length) return <Empty>No daily activity yet. Events will appear here after the first sessions.</Empty>;
  const max = Math.max(1, ...data.flatMap((item) => [Number(item.lessons_started || 0), Number(item.questions_asked || 0), Number(item.moments_explored || 0)]));
  const width = 620, height = 210, padX = 26, padY = 18;
  const x = (i) => padX + (data.length <= 1 ? (width - 2 * padX) / 2 : i * (width - 2 * padX) / (data.length - 1));
  const y = (value) => height - padY - (Number(value || 0) / max) * (height - padY * 2);
  const line = (key) => data.map((item, i) => `${i ? "L" : "M"} ${x(i)} ${y(item[key])}`).join(" ");
  return <div className="w-full overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily lesson starts, questions and moment selections" className="h-52 min-w-[480px] w-full overflow-visible">
    {[0, .25, .5, .75, 1].map((step) => <line key={step} x1={padX} x2={width - padX} y1={y(max * step)} y2={y(max * step)} stroke="rgba(255,255,255,.09)" strokeDasharray="3 5" />)}
    <path d={line("lessons_started")} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d={line("questions_asked")} fill="none" stroke="#f0abfc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d={line("moments_explored")} fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {data.map((item, i) => <text key={item.date} x={x(i)} y={height - 1} fill="rgba(255,255,255,.42)" fontSize="9" textAnchor="middle">{String(item.date).slice(5)}</text>)}
  </svg><div className="mt-2 flex flex-wrap gap-4 text-xs text-white/60"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-violet-300" />Lesson starts</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-fuchsia-300" />Questions</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-cyan-300" />Moments explored</span></div></div>;
}

export function Analytics() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState("14");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics/dashboard?days=${days}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not load analytics.");
      setData(payload);
    } catch (err) {
      setError(err.message || "Could not load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [days]);
  return <main className="min-h-screen bg-[#080810] font-[Inter,sans-serif] text-[#e8eaed]">
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-[#080810]/90 px-4 py-3 backdrop-blur-xl sm:px-7">
      <a href="/studio" className="flex items-center gap-2 text-sm font-bold text-white/70 no-underline hover:text-white"><ArrowLeft size={17} /> Back to CURIO</a>
      <div className="flex items-center gap-2"><span className="hidden text-xs text-white/40 sm:inline">Content performance & business impact</span><img src="/curio-logo.png" alt="" className="h-8 w-8" /></div>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-7 sm:px-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-violet-300"><Sparkles size={14} /> CURIO intelligence</p><h1 className="m-0 mt-2 text-3xl font-black tracking-tight sm:text-4xl">Content Insights</h1><p className="m-0 mt-2 max-w-2xl text-sm leading-relaxed text-white/55">Understand what sparks curiosity, where learners need help, and how content performs.</p></div>
        <div className="flex items-center gap-2"><select aria-label="Date range" value={days} onChange={(event) => setDays(event.target.value)} className="rounded-xl border border-white/15 bg-[#14141f] px-3 py-2 text-sm"><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><button onClick={load} className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"><RefreshCw size={15} /> Refresh</button></div>
      </div>
      {loading && <div className="mt-8 rounded-2xl border border-white/10 p-8 text-sm text-white/50"><RefreshCw size={16} className="mr-2 inline animate-spin" />Loading BigQuery insights…</div>}
      {!loading && error && <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-5"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 shrink-0 text-amber-200" /><div><h2 className="m-0 text-lg font-bold">Analytics needs setup</h2><p className="m-0 mt-2 text-sm leading-relaxed text-white/65">{error}</p><p className="m-0 mt-2 text-sm text-white/55">Enable the BigQuery API, create the dataset/table from <code>sql/bigquery_setup.sql</code>, then grant the Cloud Run service identity permission to insert events and run queries. This dashboard intentionally does not substitute mock numbers for live data.</p></div></div></section>}
      {!loading && data && <>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active sessions" value={number(data.kpis.active_sessions)} hint="Distinct sessions with activity" icon={Users} />
          <Metric label="Lessons started" value={number(data.kpis.lessons_started)} hint="New learning journeys" icon={BookOpen} />
          <Metric label="Questions asked" value={number(data.kpis.questions_asked)} hint="Signals of learner curiosity" icon={MessageCircle} />
          <Metric label="Moments explored" value={number(data.kpis.moments_explored)} hint="Timestamped content interactions" icon={Activity} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-violet-300" /><div><h2 className="m-0 text-base font-bold">Engagement over time</h2><p className="m-0 mt-1 text-xs text-white/40">Daily lesson starts, questions and moments selected</p></div></div><TrendChart data={data.trend} /></section>
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5"><h2 className="m-0 text-base font-bold">What people do</h2><p className="m-0 mb-4 mt-1 text-xs text-white/40">Event mix in the selected period</p><BarList items={data.eventBreakdown} labelKey="event_type" valueKey="total" /></section>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5"><h2 className="m-0 text-base font-bold">Top lessons</h2><p className="m-0 mb-4 mt-1 text-xs text-white/40">Lessons that attract starts, questions and exploration</p>{data.topLessons?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs text-white/40"><tr><th className="pb-2 font-medium">Lesson</th><th className="pb-2 font-medium">Starts</th><th className="pb-2 font-medium">Questions</th><th className="pb-2 font-medium">Moments</th></tr></thead><tbody>{data.topLessons.map((item) => <tr key={item.lesson_id} className="border-t border-white/10"><td className="max-w-52 py-3 pr-3"><span className="block truncate font-semibold">{item.lesson_title}</span><span className="block truncate text-xs text-white/35">{item.lesson_id}</span></td><td className="py-3">{number(item.starts)}</td><td className="py-3">{number(item.questions)}</td><td className="py-3">{number(item.moments_explored)}</td></tr>)}</tbody></table></div> : <Empty>No lessons yet.</Empty>}</section>
          <section className="rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:p-5"><h2 className="m-0 text-base font-bold">Moments that spark curiosity</h2><p className="m-0 mb-4 mt-1 text-xs text-white/40">Chapters with the most questions and selections</p><BarList items={data.topChapters} labelKey="chapter_title" valueKey="questions" color="from-cyan-500 to-violet-400" /></section>
        </div>
        <section className="mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between"><span>Source: BigQuery · `{data.config.projectId}.{data.config.dataset}.{data.config.table}`</span><span>Updated {new Date(data.generatedAt).toLocaleString()}</span></section>
      </>}
      <div className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-white/35"><BrainCircuit size={15} className="mt-0.5 shrink-0" /><p className="m-0">These are behavioral signals, not proof of learning gains. To measure learning effectiveness, add assessments and compare outcomes between comparable learner groups.</p></div>
    </div>
  </main>;
}
