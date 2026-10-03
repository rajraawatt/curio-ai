const TEACHER_NAV = [
  { id: "classroom", label: "Dashboard", icon: "grid", tint: "violet" },
  { id: "prepare", label: "Prepare", icon: "prepare", tint: "pink" },
  { id: "analytics", label: "Analytics", icon: "chart", tint: "lilac" },
  { id: "settings", label: "Settings", icon: "settings", tint: "violet" },
];

function Icon({ name }) {
  if (name === "grid") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (name === "prepare") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
        <circle cx="18" cy="17" r="2.5" />
      </svg>
    );
  }
  if (name === "live") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M5.5 8.5a9 9 0 0 0 0 7" />
        <path d="M18.5 8.5a9 9 0 0 1 0 7" />
        <path d="M2.5 6a13 13 0 0 0 0 12" />
        <path d="M21.5 6a13 13 0 0 1 0 12" />
      </svg>
    );
  }
  if (name === "learn") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V7l8-3 8 3v12" />
        <path d="M12 4v15" />
        <path d="M4 19h16" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V10" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.5 6.5l1.5 1.5M18 16l1.5 1.5M3 12h2M19 12h2M4.5 17.5 6 16M18 8l1.5-1.5" />
    </svg>
  );
}

export function SidePanel({
  nav,
  onNav,
  connected,
  room = "CURIO",
  items = TEACHER_NAV,
  brandHref = "/teacher",
}) {
  return (
    <aside className="g-sidebar" aria-label="Classroom navigation">
      <div className="g-sidebar__header">
        <a className="g-sidebar__brand" href={brandHref} title="CURIO">
          <span className="g-sidebar__brand-mark" aria-hidden="true">
            C
          </span>
          <span className="g-sidebar__brand-text">CURIO</span>
        </a>
      </div>

      <nav className="g-sidebar__nav no-scrollbar">
        {items.map((item) => {
          const active = nav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`g-sidebar__item tint-${item.tint}${active ? " is-active" : ""}`}
              onClick={() => onNav(item.id)}
              aria-current={active ? "page" : undefined}
              title={item.label}
            >
              <span className="g-sidebar__icon">
                <Icon name={item.icon} />
              </span>
              <span className="g-sidebar__label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="g-sidebar__footer">
        <div className={`g-sidebar__status ${connected ? "is-live" : "is-off"}`} title={connected ? `Room ${room}` : "Offline"}>
          <span className="g-sidebar__dot" />
          <span className="g-sidebar__status-text">{connected ? `Live · ${room}` : "Offline"}</span>
        </div>
      </div>
    </aside>
  );
}
