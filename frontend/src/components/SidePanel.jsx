import { cx, noScrollbar } from "../ui.js";

const TEACHER_NAV = [
  { id: "classroom", label: "Dashboard", icon: "grid", tint: "violet" },
  { id: "prepare", label: "Prepare", icon: "prepare", tint: "pink" },
  { id: "gallery", label: "Gallery", icon: "gallery", tint: "lilac" },
  { id: "analytics", label: "Analytics", icon: "chart", tint: "lilac" },
  { id: "settings", label: "Settings", icon: "settings", tint: "violet" },
];

function Icon({ name }) {
  const common = "h-5 w-5 fill-none stroke-current stroke-[1.8]";
  if (name === "grid") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (name === "prepare") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
        <circle cx="18" cy="17" r="2.5" />
      </svg>
    );
  }
  if (name === "gallery") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    );
  }
  if (name === "live") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
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
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V7l8-3 8 3v12" />
        <path d="M12 4v15" />
        <path d="M4 19h16" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V10" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
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
    <aside
      className="group z-30 flex h-full w-24 flex-shrink-0 flex-col overflow-hidden rounded-r-[40px] border-r-4 border-[rgba(124,58,237,0.12)] bg-white shadow-[8px_0_24px_rgba(124,58,237,0.08)] transition-[width] duration-200 hover:w-[280px]"
      aria-label="Classroom navigation"
    >
      <div className="px-4 py-5">
        <a className="flex items-center gap-3 text-ink no-underline" href={brandHref} title="CURIO">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet font-black text-white">C</span>
          <span className="text-lg font-black opacity-0 transition group-hover:opacity-100">CURIO</span>
        </a>
      </div>

      <nav className={cx("flex flex-1 flex-col gap-1 overflow-y-auto px-3", noScrollbar)}>
        {items.map((item) => {
          const active = nav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={cx(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold text-muted transition hover:bg-hover hover:text-violet",
                active && "bg-violet text-white shadow-[0_4px_0_rgba(124,58,237,0.35)] hover:bg-violet hover:text-white"
              )}
              onClick={() => onNav(item.id)}
              aria-current={active ? "page" : undefined}
              title={item.label}
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center">
                <Icon name={item.icon} />
              </span>
              <span className="translate-x-1 whitespace-nowrap opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <div
          className={cx(
            "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold",
            connected ? "bg-violet-soft text-violet" : "bg-pink-soft text-amber-700"
          )}
          title={connected ? `Room ${room}` : "Offline"}
        >
          <span className={cx("h-2.5 w-2.5 flex-shrink-0 rounded-full", connected ? "bg-violet" : "bg-lilac")} />
          <span className="opacity-0 transition group-hover:opacity-100">{connected ? `Live · ${room}` : "Offline"}</span>
        </div>
      </div>
    </aside>
  );
}
