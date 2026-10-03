import { useMemo } from "react";

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
    <div className="g-people-pop" role="dialog" aria-label="Participants">
      <header className="g-people-pop__header">
        <div className="g-people-pop__title">
          <strong>Participants</strong>
          <span className="g-people-pop__count">{total}</span>
          {handsUp > 0 && <span className="g-people-pop__hands">{handsUp} hand{handsUp === 1 ? "" : "s"}</span>}
        </div>
        <button type="button" className="g-people-pop__close" title="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>
      <div className="g-people-pop__list no-scrollbar">
        {total === 0 && <p className="g-people-pop__empty">No students joined yet</p>}
        {participants.map((person) => (
          <article key={person.id || person.name} className={`g-people-pop__row${person.handUp ? " has-hand" : ""}`}>
            <span className="g-people-pop__avatar" style={{ background: person.color || TILE_COLORS[0] }}>
              {String(person.name || "?").slice(0, 2).toUpperCase()}
            </span>
            <span className="g-people-pop__name">{person.name}</span>
            {person.handUp && <span className="g-people-pop__hand">Hand up</span>}
          </article>
        ))}
      </div>
    </div>
  );
}
