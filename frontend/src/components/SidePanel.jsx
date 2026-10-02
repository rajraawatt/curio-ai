import { Wordmark } from "../Lobby.jsx";

const NAV = [
  ["classroom", "Class"],
  ["questions", "Questions"],
  ["analytics", "Analytics"],
  ["settings", "Settings"],
];

export function SidePanel({ nav, onNav, connected }) {
  return (
    <aside className="side">
      <Wordmark />
      {NAV.map(([id, label]) => (
        <button key={id} className={nav === id ? "on" : ""} type="button" onClick={() => onNav(id)}>
          <i className={`ico ${id}`} />
          {label}
        </button>
      ))}
      <span className={connected ? "dot on" : "dot"}>{connected ? "Live" : "Offline"}</span>
    </aside>
  );
}
