const NAV = [
  ["classroom", "Class"],
  ["questions", "Questions"],
  ["analytics", "Analytics"],
  ["settings", "Settings"],
];

export function SidePanel({ nav, onNav, connected, room = "CURIO", collapsed, onToggle }) {
  if (collapsed) {
    return (
      <aside className="side side-collapsed" aria-label="Classroom navigation collapsed">
        <button type="button" className="side-toggle" onClick={onToggle} title="Show menu" aria-expanded="false">
          <span className="side-toggle-bars" aria-hidden="true" />
          Menu
        </button>
        <span className={connected ? "dot on" : "dot"} title={connected ? `Room ${room}` : "Offline"}>
          {connected ? "Live" : "Off"}
        </span>
      </aside>
    );
  }

  return (
    <aside className="side" aria-label="Classroom navigation">
      <div className="side-top">
        <a className="wordmark" href="/">
          CURIO
        </a>
        <button type="button" className="side-toggle" onClick={onToggle} title="Hide menu" aria-expanded="true">
          Hide
        </button>
      </div>

      <p className="side-room">
        Room <strong>{room}</strong>
      </p>

      <nav className="side-nav">
        {NAV.map(([id, label]) => (
          <button
            key={id}
            className={nav === id ? "on" : ""}
            type="button"
            onClick={() => onNav(id)}
            aria-current={nav === id ? "page" : undefined}
          >
            <i className={`ico ${id}`} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      <span className={connected ? "dot on" : "dot"}>{connected ? "Live" : "Offline"}</span>
    </aside>
  );
}
