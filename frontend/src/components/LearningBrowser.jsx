import { useEffect, useMemo, useState } from "react";
import { btn } from "../ui.js";
import { PackMediaView } from "./PackMediaView.jsx";

const PACK_CARD =
  "grid gap-1.5 rounded-[18px] border-2 border-line bg-cream p-4 text-left font-sans text-ink hover:border-lilac hover:bg-white";

/** Student Learning: Class → Subject folders → pack (video + 3D). */
export function LearningBrowser({ classId = "6a", learningByClass, galleryRevision, captions = true }) {
  const [learning, setLearning] = useState(null);
  const [error, setError] = useState("");
  const [subjectId, setSubjectId] = useState(null);
  const [packId, setPackId] = useState(null);

  const packsFromSse = learningByClass?.[classId] || [];

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/gallery/learning?classId=${encodeURIComponent(classId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setLearning(data);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, galleryRevision, packsFromSse.length]);

  const subjects = useMemo(() => {
    let list = [];
    if (learning?.subjects?.length) list = learning.subjects;
    else {
      const bySubject = new Map();
      for (const pack of packsFromSse) {
        const sid = pack.subjectId || "science";
        if (!bySubject.has(sid)) bySubject.set(sid, { id: sid, label: sid, packs: [] });
        bySubject.get(sid).packs.push(pack);
      }
      list = [...bySubject.values()];
    }
    return list.filter((s) => (s.packs?.length || 0) > 0);
  }, [learning, packsFromSse]);

  const subject = subjects.find((s) => s.id === subjectId) || subjects[0] || null;
  const packs = subject?.packs || [];
  const selected = packs.find((p) => p.id === packId) || null;

  useEffect(() => {
    setPackId(null);
    setSubjectId(null);
  }, [classId]);

  if (error && !subjects.length) {
    return (
      <div className="grid gap-3.5">
        <p className="font-bold text-muted">{error}</p>
      </div>
    );
  }

  if (!subjects.length) {
    return (
      <div
        className="relative grid min-h-[280px] flex-1 place-items-center rounded-[32px] border-[3px] border-dashed border-[rgba(124,58,237,0.2)] bg-white/55 p-7"
        aria-label="Learning stage"
      >
        <div className="grid max-w-[34ch] gap-2 text-center">
          <p className="m-0 text-[1.15rem] font-black tracking-[-0.02em] text-violet">Learning</p>
          <p className="m-0 text-[0.95rem] font-bold leading-[1.45] text-muted">
            When your teacher shares a pack for this class, it will show up here as folders.
          </p>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="grid gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btn} onClick={() => setPackId(null)}>
            ← {subject?.label || "Back"}
          </button>
          <div>
            <h2 className="m-0 text-[1.15rem] font-black">{selected.topic}</h2>
            <p className="m-0 font-bold text-muted">
              {learning?.classLabel || classId} / {subject?.label}
            </p>
          </div>
        </div>
        <PackMediaView pack={selected} captions={captions} trackAs="Student learning" trackMode="self_paced" />
      </div>
    );
  }

  if (subject && subjectId) {
    return (
      <div className="grid gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btn} onClick={() => setSubjectId(null)}>
            ← Subjects
          </button>
          <h2 className="m-0 text-[1.15rem] font-black">{subject.label}</h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {packs.map((pack) => (
            <button key={pack.id} type="button" className={PACK_CARD} onClick={() => setPackId(pack.id)}>
              <strong className="font-black">{pack.topic}</strong>
              <span className="text-[0.82rem] font-bold text-muted">
                {(pack.assets?.length || 0) > 0 ? `${pack.assets.length} models` : "No 3D"}
                {pack.mergedVideo ? " · video" : ""}
              </span>
            </button>
          ))}
          {!packs.length && <p className="font-bold text-muted">No packs in this subject yet.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3.5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 text-[1.15rem] font-black">{learning?.classLabel || `Class ${classId}`}</h2>
        <p className="m-0 font-bold text-muted">Open a subject folder to find lesson packs your teacher shared.</p>
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {subjects.map((item) => (
          <button key={item.id} type="button" className={PACK_CARD} onClick={() => setSubjectId(item.id)}>
            <strong className="font-black">{item.label}</strong>
            <span className="text-[0.82rem] font-bold text-muted">
              {item.packs?.length || 0} pack{(item.packs?.length || 0) === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
