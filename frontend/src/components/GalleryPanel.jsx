import { useCallback, useEffect, useMemo, useState } from "react";
import { PackMediaView } from "./PackMediaView.jsx";
import { prefetchGallery, readGalleryCache, writeGalleryCache } from "../galleryCache.js";

const btnBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 font-bold text-[0.9rem] transition active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none";
const btnNeutral = `${btnBase} bg-gray-100 text-gray-600 shadow-[0_4px_0_rgba(0,0,0,0.08)] hover:bg-gray-200 hover:text-gray-900`;
const btnPink = `${btnBase} bg-[#EC4899] text-white shadow-[0_4px_0_rgba(236,72,153,0.35)] hover:brightness-95`;

function FolderIcon() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function PackIcon() {
  return (
    <svg className="h-[22px] w-[22px] fill-none stroke-[#7C3AED] stroke-[1.8]" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
    </svg>
  );
}

export function GalleryPanel({ onExit }) {
  const cached = useMemo(() => readGalleryCache(), []);
  const [library, setLibrary] = useState(cached);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(!cached);
  const [classId, setClassId] = useState("6a");
  const [subjectId, setSubjectId] = useState("science");
  const [packId, setPackId] = useState(null);

  const load = useCallback(async () => {
    const data = await prefetchGallery();
    writeGalleryCache(data);
    setLibrary(data);
    setError("");
    setRefreshing(false);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().catch((err) => {
      if (cancelled) return;
      setRefreshing(false);
      if (!readGalleryCache()) setError(err.message || "Could not load Gallery.");
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const treeClass = useMemo(
    () => library?.tree?.find((c) => c.id === classId) || library?.tree?.[0],
    [library, classId]
  );
  const subjects = treeClass?.subjects || [];
  const subject = subjects.find((s) => s.id === subjectId) || subjects[0];
  const packs = subject?.packs || [];
  const selectedPack = packs.find((p) => p.id === packId) || null;

  useEffect(() => {
    if (!treeClass) return;
    if (!subjects.some((s) => s.id === subjectId) && subjects[0]) {
      setSubjectId(subjects[0].id);
    }
  }, [treeClass, subjects, subjectId]);

  async function sharePack(pack) {
    if (!pack) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/gallery/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: pack.classId,
          subjectId: pack.subjectId,
          packId: pack.id,
          pack,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Share failed.");
      setLibrary(data.library || (await load()));
      setNotice(`Shared “${pack.topic}” to ${pack.classId.toUpperCase()} Learning.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!library) {
    return (
      <div className="min-h-full bg-[radial-gradient(900px_420px_at_0%_0%,rgba(124,58,237,0.08),transparent_50%),#F8F4ED] px-6 pb-9 pt-5 font-[Nunito,sans-serif] text-[#1F2937]">
        <p className="font-bold text-[#6B7280]">{error ? `Gallery error: ${error}` : "Loading Gallery…"}</p>
        {error && (
          <button type="button" className={`${btnNeutral} mt-3`} onClick={() => load().catch((err) => setError(err.message))}>
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(900px_420px_at_0%_0%,rgba(124,58,237,0.08),transparent_50%),#F8F4ED] px-6 pb-9 pt-5 font-[Nunito,sans-serif] text-[#1F2937]">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[#7C3AED]">
            Teacher library
          </p>
          <h1 className="m-0 text-[clamp(1.4rem,2.5vw,1.85rem)] font-black">Gallery</h1>
          <p className="mt-1.5 max-w-[52ch] font-bold text-[#6B7280]">
            Browse Class → Subject → lesson packs. Share a pack to that class’s Learning tab.
            {refreshing ? " Updating…" : ""}
          </p>
        </div>
        {onExit && (
          <button type="button" className={btnNeutral} onClick={onExit}>
            Back to Dashboard
          </button>
        )}
      </header>

      {notice && <p className="font-bold text-[#7C3AED]">{notice}</p>}
      {error && <p className="font-bold text-[#EC4899]">{error}</p>}

      <div className="grid min-h-[420px] grid-cols-1 gap-3.5 lg:grid-cols-[180px_180px_minmax(0,1fr)]">
        <aside
          className="rounded-[22px] border-2 border-[#F0EAE0] bg-white p-3 shadow-[0_6px_0_rgba(124,58,237,0.05)]"
          aria-label="Classes"
        >
          <h2 className="mb-2.5 text-[0.78rem] font-extrabold uppercase tracking-[0.06em] text-[#6B7280]">
            Classes
          </h2>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {(library.tree || []).map((klass) => {
              const active = klass.id === (treeClass?.id || classId);
              return (
                <li key={klass.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-[14px] border-none px-3 py-2.5 text-left font-bold ${
                      active ? "bg-[#7C3AED] text-white" : "bg-transparent text-[#1F2937] hover:bg-[#F3EEFF]"
                    }`}
                    onClick={() => {
                      setClassId(klass.id);
                      setPackId(null);
                      const first = klass.subjects?.[0];
                      if (first) setSubjectId(first.id);
                    }}
                  >
                    <FolderIcon />
                    <span className="flex flex-1 items-center justify-between gap-2">
                      {klass.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <aside
          className="rounded-[22px] border-2 border-[#F0EAE0] bg-white p-3 shadow-[0_6px_0_rgba(124,58,237,0.05)]"
          aria-label="Subjects"
        >
          <h2 className="mb-2.5 text-[0.78rem] font-extrabold uppercase tracking-[0.06em] text-[#6B7280]">
            Subjects
          </h2>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {subjects.map((item) => {
              const active = item.id === (subject?.id || subjectId);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-[14px] border-none px-3 py-2.5 text-left font-bold ${
                      active ? "bg-[#7C3AED] text-white" : "bg-transparent text-[#1F2937] hover:bg-[#F3EEFF]"
                    }`}
                    onClick={() => {
                      setSubjectId(item.id);
                      setPackId(null);
                    }}
                  >
                    <FolderIcon />
                    <span className="flex flex-1 items-center justify-between gap-2">
                      {item.label}
                      <em className={`not-italic text-[0.75rem] ${active ? "text-white/80" : "text-[#6B7280]"}`}>
                        {item.packs?.length || 0}
                      </em>
                    </span>
                  </button>
                </li>
              );
            })}
            {!subjects.length && <li className="my-2 font-bold text-[#6B7280]">No subjects</li>}
          </ul>
        </aside>

        <section className="min-w-0 rounded-[22px] border-2 border-[#F0EAE0] bg-white p-4 shadow-[0_6px_0_rgba(124,58,237,0.05)]">
          {!selectedPack ? (
            <>
              <h2 className="mb-3.5 text-[1.05rem] font-black">
                {treeClass?.label} / {subject?.label || "Subject"}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {packs.map((pack) => {
                  const modelCount = pack.assets?.filter((asset) => asset.glbUrl).length || 0;
                  return (
                  <button
                    key={pack.id}
                    type="button"
                    className="grid gap-1.5 rounded-[18px] border-2 border-[#F0EAE0] bg-[#F8F4ED] p-4 text-left font-[inherit] text-[#1F2937] hover:border-[#C4B5FD] hover:bg-white"
                    onClick={() => setPackId(pack.id)}
                  >
                    <PackIcon />
                    <strong className="font-black">{pack.topic}</strong>
                    <span className="text-[0.82rem] font-bold text-[#6B7280]">
                      {modelCount ? `${modelCount} models` : "No 3D"}
                      {pack.mergedVideo ? " · video" : ""}
                      {pack.shared ? " · shared" : ""}
                    </span>
                  </button>
                  );
                })}
                {!packs.length && (
                  <p className="my-2 font-bold text-[#6B7280]">
                    Empty folder — generate or Save to Gallery from Prepare.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="mb-3.5 flex flex-wrap items-center gap-3">
                <button type="button" className={btnNeutral} onClick={() => setPackId(null)}>
                  ← Packs
                </button>
                <div>
                  <h2 className="m-0 text-[1.1rem] font-black">{selectedPack.topic}</h2>
                  <p className="m-0 mt-0.5 text-[0.85rem] font-bold text-[#6B7280]">
                    {treeClass?.label} / {subject?.label}
                    {selectedPack.shared ? " · In Learning" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className={`${btnPink} ml-auto`}
                  disabled={busy}
                  onClick={() => sharePack(selectedPack)}
                >
                  {busy ? "Sharing…" : "Share for Learning"}
                </button>
              </div>
              <PackMediaView pack={selectedPack} trackAs="Teacher gallery" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
