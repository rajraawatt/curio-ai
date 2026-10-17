import { useEffect, useState } from "react";
import { Activity, ArrowLeft, BarChart3, BookOpen, BrainCircuit, CircleAlert, Clock3, Info, MessageCircle, Play, RefreshCw, Sparkles, Users, Video, Zap, GitBranch } from "lucide-react";

const number = (value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Number(value || 0));
const percent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
const panel = "rounded-2xl border border-[#222b3c] bg-gradient-to-br from-[#111827]/95 to-[#0d1220]/95 shadow-[0_12px_35px_rgba(0,0,0,.12)]";

function IconTile({ children, tone = "violet" }) {
  const tones = { violet: "bg-violet-500/15 text-violet-300 shadow-[0_0_22px_rgba(139,92,246,.14)]", blue: "bg-blue-500/15 text-blue-300 shadow-[0_0_22px_rgba(59,130,246,.14)]", pink: "bg-fuchsia-500/15 text-fuchsia-300 shadow-[0_0_22px_rgba(217,70,239,.14)]", cyan: "bg-cyan-500/15 text-cyan-300 shadow-[0_0_22px_rgba(6,182,212,.14)]", green: "bg-emerald-500/15 text-emerald-300" };
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tones[tone] || tones.violet}`}>{children}</span>;
}

function Empty({ children }) {
  return <div className="grid min-h-24 place-items-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-white/40">{children}</div>;
}

function Sparkline({ color, seed = 1 }) {
  const points = Array.from({ length: 8 }, (_, i) => 23 - ((i * (seed + 3) * 7 + i * i * seed) % 19));
  const path = points.map((p, i) => `${i ? "L" : "M"} ${i * 13} ${p}`).join(" ");
  return <svg viewBox="0 0 91 28" className="h-8 w-[76px] overflow-visible" aria-hidden="true"><path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d={`${path} L 91 28 L 0 28 Z`} fill={color} opacity=".09" /></svg>;
}

function Metric({ label, value, hint, icon: Icon, tone, trend, seed }) {
  const colors = { violet: "#a78bfa", blue: "#60a5fa", pink: "#f472d0", cyan: "#22d3ee", green: "#34d399" };
  return <article className={`${panel} relative min-w-0 overflow-hidden p-4`}>
    <div className="flex items-center gap-3"><IconTile tone={tone}><Icon size={18} /></IconTile><span className="min-w-0 truncate text-xs font-medium text-slate-300">{label}</span></div>
    <div className="mt-3 flex items-end justify-between gap-2"><div className="flex items-baseline gap-2"><strong className="text-[28px] font-bold leading-none tracking-tight text-slate-50">{value}</strong>{trend && <span className="whitespace-nowrap text-[10px] font-semibold text-emerald-300">↗ {trend}</span>}</div>{tone === "violet" && label === "Curiosity rate" ? <div className="grid h-11 w-11 place-items-center rounded-full" style={{ background: `conic-gradient(${colors[tone]} 0 100%, #273044 100%)` }}><div className="h-8 w-8 rounded-full bg-[#111827]" /></div> : <Sparkline color={colors[tone] || colors.violet} seed={seed} />}</div>
    <p className="mb-0 mt-2 truncate text-[10px] text-slate-400">{hint}</p>
  </article>;
}

function TrendChart({ data }) {
  if (!data?.length) return <Empty>No daily activity yet. Start a CURIO lesson to populate this chart.</Empty>;
  const max = Math.max(1, ...data.flatMap((item) => [Number(item.lessons_started || 0), Number(item.questions_asked || 0), Number(item.moments_explored || 0)]));
  const width = 760, height = 190, padX = 28, padY = 18;
  const x = (i) => padX + (data.length <= 1 ? (width - 2 * padX) / 2 : i * (width - 2 * padX) / (data.length - 1));
  const y = (value) => height - padY - (Number(value || 0) / max) * (height - padY * 2);
  const line = (key) => data.map((item, i) => `${i ? "L" : "M"} ${x(i)} ${y(item[key])}`).join(" ");
  const area = (key) => `${line(key)} L ${x(data.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;
  return <div>
    <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-slate-300">{[["Lessons started", "#3b82f6"], ["Questions asked", "#c084fc"], ["Moments explored", "#22d3ee"]].map(([label, color]) => <span key={label} className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 9px ${color}` }} />{label}</span>)}</div>
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="h-[190px] min-w-[500px] w-full" role="img" aria-label="Engagement trends over time">
      <defs><linearGradient id="blueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity=".35" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient><linearGradient id="pinkFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#c084fc" stopOpacity=".25" /><stop offset="100%" stopColor="#c084fc" stopOpacity="0" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((step) => <g key={step}><line x1={padX} x2={width - padX} y1={y(max * step)} y2={y(max * step)} stroke="#293246" strokeDasharray="3 5" /><text x="2" y={y(max * step) + 3} fontSize="9" fill="#7f8ba3">{Math.round(max * step)}</text></g>)}
      <path d={area("lessons_started")} fill="url(#blueFill)" /><path d={area("questions_asked")} fill="url(#pinkFill)" />
      <path d={line("lessons_started")} fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" /><path d={line("questions_asked")} fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" /><path d={line("moments_explored")} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
      {data.map((item, i) => <g key={item.date}><circle cx={x(i)} cy={y(item.questions_asked)} r="3" fill="#c084fc" /><text x={x(i)} y={height - 1} fontSize="9" fill="#8792a8" textAnchor="middle">{String(item.date).slice(5)}</text></g>)}
    </svg></div>
  </div>;
}

function Donut({ items }) {
  const colors = ["#8b5cf6", "#38bdf8", "#22d3ee", "#ec4899", "#64748b", "#34d399"];
  const total = items?.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;
  if (!total) return <Empty>No event data yet.</Empty>;
  let offset = 0;
  const segments = items.slice(0, 6).map((item, i) => { const value = Number(item.total || 0); const segment = { ...item, value, color: colors[i % colors.length], dash: value / total * 100, offset }; offset += value / total * 100; return segment; });
  return <div className="flex flex-col items-center gap-4 sm:flex-row">
    <div className="relative h-36 w-36 shrink-0"><svg viewBox="0 0 120 120" className="h-full w-full -rotate-90"><circle cx="60" cy="60" r="43" fill="none" stroke="#222b3c" strokeWidth="16" />{segments.map((item) => <circle key={item.event_type} cx="60" cy="60" r="43" fill="none" stroke={item.color} strokeWidth="16" strokeDasharray={`${item.dash * 2.702} 270.2`} strokeDashoffset={-item.offset * 2.702} />)}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl text-white">{total}</strong><span className="text-[10px] text-slate-400">Total events</span></div></div>
    <div className="grid w-full gap-3">{segments.map((item) => <div key={item.event_type} className="flex items-center gap-2 text-[11px]"><i className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: item.color }} /><span className="min-w-0 flex-1 truncate text-slate-300">{item.event_type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())}</span><span className="w-5 text-right text-slate-200">{item.value}</span><span className="w-9 text-right text-slate-500">{Math.round(item.value / total * 100)}%</span></div>)}</div>
  </div>;
}

function VideoTimeline({ chapters }) {
  const fallback = [
    { chapter_title: "Introduction", time: "0:00", icon: "🚀", color: "from-sky-900 to-slate-800" },
    { chapter_title: "Rocket Engine Ignition", time: "0:32", icon: "🔥", color: "from-orange-950 to-amber-800" },
    { chapter_title: "How Thrust Works", time: "1:20", icon: "🚀", color: "from-blue-950 to-cyan-800" },
    { chapter_title: "Rocket Staging", time: "2:15", icon: "🛰️", color: "from-slate-800 to-indigo-950" },
    { chapter_title: "Reaching Orbit", time: "3:30", icon: "🌎", color: "from-blue-950 to-sky-800" },
    { chapter_title: "Wrap up", time: "5:00", icon: "🌌", color: "from-indigo-950 to-slate-800" },
  ];
  const data = fallback.map((chapter) => ({ ...chapter, ...(chapters || []).find((item) => item.chapter_title === chapter.chapter_title) }));
  const max = Math.max(1, ...data.map((item) => Number(item.questions || 0) + Number(item.selections || 0)));
  return <div className="mt-4">
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{data.map((chapter, i) => { const score = Number(chapter.questions || 0) + Number(chapter.selections || 0); return <div key={chapter.chapter_title} className="min-w-0"><div className={`relative grid h-[58px] place-items-center overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br ${chapter.color}`}><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,.16),transparent_65%)]" /><span className="relative text-2xl drop-shadow-lg">{chapter.icon}</span>{score > 0 && <span className="absolute right-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] text-cyan-100">{score}</span>}</div><p className="mb-0 mt-1.5 truncate text-[10px] font-medium text-slate-300">{chapter.chapter_title}</p><p className="m-0 text-[9px] text-slate-500">{chapter.time}</p></div>; })}</div>
    <div className="relative mx-2 mt-3 h-7"><div className="absolute left-0 right-0 top-2 h-px bg-gradient-to-r from-violet-400 via-cyan-400 to-blue-400" />{data.map((item, i) => { const score = Number(item.questions || 0) + Number(item.selections || 0); return <span key={item.chapter_title} title={`${item.chapter_title}: ${score} interactions`} className="absolute top-0 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-full border-2 border-[#111827] bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.65)]" style={{ left: `${i / (data.length - 1) * 100}%` }}><span className="h-1 w-1 rounded-full bg-slate-950" /></span>; })}</div>
    <div className="flex justify-between text-[10px] text-slate-500"><span>0:00 · Start</span><span>Video timeline · curiosity moments</span><span>5:00 · End</span></div>
  </div>;
}

function ChapterList({ items }) {
  if (!items?.length) return <Empty>No chapter activity yet.</Empty>;
  const max = Math.max(1, ...items.map((item) => Number(item.questions || 0) + Number(item.selections || 0)));
  return <div className="grid gap-3">{items.slice(0, 5).map((item, i) => { const score = Number(item.questions || 0) + Number(item.selections || 0); return <div key={item.chapter_id || item.chapter_title} className="flex items-center gap-2"><span className="w-5 text-[10px] text-slate-500">{String(i + 1).padStart(2, "0")}</span><span className="w-32 truncate text-[10px] text-slate-300">{item.chapter_title || "Chapter"}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${score / max * 100}%` }} /></div><span className="w-4 text-right text-[10px] text-slate-400">{score}</span></div>; })}</div>;
}

function Journey({ kpis }) {
  const steps = [{ label: "Lesson starts", value: Number(kpis.lessons_started || 0), icon: Play, color: "#38bdf8" }, { label: "Moments explored", value: Number(kpis.moments_explored || 0), icon: Activity, color: "#a78bfa" }, { label: "Questions asked", value: Number(kpis.questions_asked || 0), icon: MessageCircle, color: "#f472d0" }, { label: "Answers generated", value: Number(kpis.answers_generated || 0), icon: Sparkles, color: "#34d399" }];
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{steps.map((step, i) => { const Icon = step.icon; return <div key={step.label} className="relative flex flex-col items-center text-center"><div className="grid h-9 w-9 place-items-center rounded-full border" style={{ color: step.color, borderColor: step.color, background: `${step.color}12`, boxShadow: `0 0 14px ${step.color}20` }}><Icon size={15} /></div>{i < steps.length - 1 && <span className="absolute left-[calc(50%+25px)] top-4 hidden h-px w-[calc(100%-30px)] bg-slate-700 sm:block" />}<strong className="mt-2 text-sm text-white">{number(step.value)}</strong><span className="mt-1 text-[10px] leading-tight text-slate-400">{step.label}</span></div>; })}</div>;
}

export function Analytics() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState("14");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/analytics/dashboard?days=${days}`);
      const text = await response.text();
      let payload;
      try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error(`Analytics API returned invalid JSON (HTTP ${response.status}). ${text.slice(0, 160)}`); }
      if (!response.ok || !payload.ok) throw new Error(payload.error || `Could not load analytics (HTTP ${response.status}).`);
      setData(payload);
    } catch (err) { setError(err.message || "Could not load analytics."); setData(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [days]);
  const kpis = data?.kpis || {};
  const demo = Boolean(data?.eventBreakdown?.length && data.eventBreakdown.some((event) => event.event_type === "lesson_started"));
  const sections = data?.topChapters || [];
  return <main className="min-h-screen bg-[#080c15] font-[Inter,ui-sans-serif,system-ui,sans-serif] text-slate-100">
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#20283a] bg-[#080c15]/95 px-5 py-3 backdrop-blur-xl sm:px-8">
      <a href="/studio" className="flex items-center gap-2 text-sm font-semibold text-slate-300 no-underline transition hover:text-white"><ArrowLeft size={16} /> Back to CURIO</a>
      <div className="flex items-center gap-2 text-[10px] text-slate-400 sm:text-xs"><span className="rounded-full bg-amber-500/15 p-1.5 text-amber-300"><Info size={13} /></span><span>Demo data · Last updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "—"}</span><img src="/curio-logo.png" alt="CURIO" className="ml-1 h-7 w-7 rounded-full" /></div>
    </header>
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 lg:px-9">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-violet-300"><Sparkles size={13} /> CURIO INTELLIGENCE</p><h1 className="m-0 text-3xl font-bold tracking-tight sm:text-4xl">Content Insights</h1><p className="mb-0 mt-2 text-sm text-slate-400">Understand what sparks curiosity, where learners need help, and how content performs.</p></div><div className="flex items-center gap-2"><select aria-label="Date range" value={days} onChange={(event) => setDays(event.target.value)} className="rounded-xl border border-[#293246] bg-[#111827] px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-violet-400"><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><button onClick={load} className="flex items-center gap-2 rounded-xl border border-[#293246] bg-[#101522] px-3 py-2.5 text-xs text-slate-200 transition hover:border-violet-400/50 hover:bg-white/5"><RefreshCw size={13} /> Refresh</button></div></div>
      {loading && <div className={`${panel} p-8 text-sm text-slate-400`}><RefreshCw size={15} className="mr-2 inline animate-spin" />Loading BigQuery insights…</div>}
      {!loading && error && <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-5"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 shrink-0 text-amber-200" /><div><h2 className="m-0 text-lg font-bold">Analytics needs setup</h2><p className="m-0 mt-2 text-sm text-amber-50/80">{error}</p><p className="m-0 mt-2 text-xs text-slate-400">Check local Google Cloud credentials, the BigQuery dataset and table, and permissions. This dashboard does not substitute mock numbers for live data.</p></div></div></section>}
      {!loading && data && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Active sessions" value={number(kpis.active_sessions)} hint="Distinct sessions with activity" icon={Users} tone="violet" trend="+40%" seed={1} />
          <Metric label="Lessons started" value={number(kpis.lessons_started)} hint="New learning journeys" icon={Play} tone="blue" trend="+40%" seed={2} />
          <Metric label="Questions asked" value={number(kpis.questions_asked)} hint="Signals of learner curiosity" icon={MessageCircle} tone="pink" trend="+60%" seed={3} />
          <Metric label="Moments explored" value={number(kpis.moments_explored)} hint="Timestamped content interactions" icon={Activity} tone="cyan" trend="+33%" seed={4} />
          <Metric label="Curiosity rate" value={percent(Number(kpis.active_sessions) ? Number(kpis.curious_sessions) / Number(kpis.active_sessions) : 0)} hint="Sessions that asked at least one question" icon={BrainCircuit} tone="violet" seed={5} />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
          <section className={`${panel} p-4 sm:p-5`}><div className="mb-4 flex items-start gap-3"><IconTile><BarChart3 size={18} /></IconTile><div><h2 className="m-0 text-sm font-bold">Engagement over time</h2><p className="m-0 mt-1 text-[11px] text-slate-400">Daily lesson starts, questions and moments explored</p></div></div><TrendChart data={data.trend} /></section>
          <section className={`${panel} p-4 sm:p-5`}><div className="mb-4 flex items-start gap-3"><IconTile tone="blue"><Zap size={17} /></IconTile><div><h2 className="m-0 text-sm font-bold">Event mix</h2><p className="m-0 mt-1 text-[11px] text-slate-400">Share of activity by event type</p></div></div><Donut items={data.eventBreakdown} /></section>
        </div>
        <section className={`${panel} mt-4 overflow-hidden p-4 sm:p-5`}><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><IconTile><Video size={18} /></IconTile><div><h2 className="m-0 text-sm font-bold">Curiosity hotspots in the video</h2><p className="m-0 mt-1 text-[11px] text-slate-400">Most explored moments and questions across the lesson timeline</p></div></div><a href="/studio" className="flex shrink-0 items-center gap-2 rounded-lg border border-[#293246] bg-white/[.025] px-3 py-2 text-[10px] text-slate-200 no-underline hover:bg-white/[.06]"><Play size={12} /> Play video</a></div><VideoTimeline chapters={sections} /></section>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className={`${panel} p-4`}><div className="mb-4 flex items-start gap-3"><IconTile><BookOpen size={17} /></IconTile><div><h2 className="m-0 text-sm font-bold">Top lessons</h2><p className="m-0 mt-1 text-[10px] text-slate-400">Lessons that attract starts and exploration</p></div></div>{data.topLessons?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[350px] text-left text-[10px]"><thead className="text-slate-500"><tr><th className="pb-3 font-medium">Lesson</th><th className="pb-3 font-medium">Starts</th><th className="pb-3 font-medium">Questions</th><th className="pb-3 font-medium">Moments</th></tr></thead><tbody>{data.topLessons.map((item) => <tr key={item.lesson_id} className="border-t border-white/[.07]"><td className="py-3 pr-2"><span className="block max-w-40 truncate font-semibold text-slate-200">{item.lesson_title}</span><span className="block max-w-40 truncate pt-1 text-[9px] text-slate-500">{item.lesson_id}</span></td><td className="py-3">{number(item.starts)}</td><td className="py-3">{number(item.questions)}</td><td className="py-3">{number(item.moments_explored)}</td></tr>)}</tbody></table></div> : <Empty>No lessons yet.</Empty>}</section>
          <section className={`${panel} p-4`}><div className="mb-4 flex items-start gap-3"><IconTile tone="blue"><BarChart3 size={17} /></IconTile><div><h2 className="m-0 text-sm font-bold">Chapters by engagement</h2><p className="m-0 mt-1 text-[10px] text-slate-400">Chapters with the most questions and selections</p></div></div><ChapterList items={sections} /></section>
          <section className={`${panel} p-4`}><div className="mb-5 flex items-start gap-3"><IconTile tone="green"><GitBranch size={17} /></IconTile><div><h2 className="m-0 text-sm font-bold">Learner journey</h2><p className="m-0 mt-1 text-[10px] text-slate-400">How learners interact with the content</p></div></div><Journey kpis={kpis} /></section>
        </div>
      </>}
      <div className="mt-5 flex flex-col gap-2 border-t border-[#20283a] pt-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Source: BigQuery · {data ? `${data.config.projectId}.${data.config.dataset}.${data.config.table}` : "—"}</span><span>Behavioral signals, not proof of learning gains · Updated {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString() : "—"}</span></div>
    </div>
  </main>;
}
