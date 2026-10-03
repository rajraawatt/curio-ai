import { useMemo } from "react";
import { cx, noScrollbar } from "../ui.js";

const TILE_COLORS = ["#7C3AED", "#EC4899", "#C4B5FD", "#F9A8D4", "#A78BFA", "#DB2777"];

export function useParticipants(state) {
  return useMemo(() => {
    const list = Array.isArray(state?.participants) ? [...state.participants] : [];
    const handNames = new Set((state?.hands || []).map((h) => h.name.toLowerCase()));

    for (const q of state?.questions || []) {
      if (!list.some((p) => p.name.toLowerCase() === q.name.toLowerCase())) {
        list.push({
          id: `q_${q.id}`,
          name: q.name,
          color: q.color || TILE_COLORS[list.length % TILE_COLORS.length],
          source: "question",
        });
      }
    }

    return list.map((p) => ({
      ...p,
      handUp: handNames.has(String(p.name).toLowerCase()),
    }));
  }, [state?.participants, state?.questions, state?.hands]);
}

export function ParticipantsPopover({ state, open, onClose }) {
  const participants = useParticipants(state);
  const total = participants.length;
  const handsUp = participants.filter((p) => p.handUp).length;

  if (!open) return null;

  return (
    <div
      className="absolute bottom-[calc(100%+12px)] left-1/2 z-40 flex max-h-[280px] w-[260px] -translate-x-1/2 flex-col overflow-hidden rounded-[22px] border-2 border-line bg-white shadow-[0_14px_28px_rgba(31,41,55,0.14)]"
      role="dialog"
      aria-label="Participants"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-cream-deep px-3 pt-3 pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong className="text-[0.9rem] font-extrabold text-ink">Participants</strong>
          <span className="rounded-full bg-violet px-2 py-0.5 text-[11px] font-extrabold text-white">{total}</span>
          {handsUp > 0 && (
            <span className="rounded-full bg-pink-soft px-2 py-0.5 text-[10px] font-extrabold text-pink">
              {handsUp} hand{handsUp === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <button
          type="button"
          className="grid size-7 place-items-center rounded-full border-0 bg-violet-soft text-violet"
          title="Close"
          onClick={onClose}
        >
          <svg className="size-3.5 fill-none stroke-current stroke-[2.5] [stroke-linecap:round]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className={cx("flex min-h-0 flex-col gap-1.5 overflow-y-auto p-2", noScrollbar)}>
        {total === 0 && <p className="my-3 text-center text-[0.78rem] font-bold text-muted">No students joined yet</p>}
        {participants.map((person) => (
          <article
            key={person.id || person.name}
            className={cx(
              "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border p-2",
              person.handUp ? "border-[rgba(236,72,153,0.3)] bg-[#FFF7FB]" : "border-line bg-[#FBF8F3]"
            )}
          >
            <span
              className="grid size-8 place-items-center rounded-full text-[0.65rem] font-extrabold text-white"
              style={{ background: person.color || TILE_COLORS[0] }}
            >
              {String(person.name || "?").slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate text-[0.8rem] font-extrabold text-ink">{person.name}</span>
            {person.handUp && <span className="text-[0.65rem] font-extrabold text-pink">Hand up</span>}
          </article>
        ))}
      </div>
    </div>
  );
}
