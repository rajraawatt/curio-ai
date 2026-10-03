function MountainScene() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#9ec5ea] via-[#cfe3f6] to-[#8eaf72]" />
      <div className="absolute top-[12%] right-[18%] size-16 rounded-full bg-[#ffe08a] shadow-[0_0_40px_rgba(255,224,138,0.65)]" />
      <div className="absolute top-[18%] left-[8%] h-10 w-28 rounded-full bg-white/70 blur-[1px]" />
      <div className="absolute top-[26%] left-[28%] h-8 w-24 rounded-full bg-white/60" />
      <div className="absolute top-[22%] right-[30%] h-9 w-32 rounded-full bg-white/65" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="farPeak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d5e4f5" />
            <stop offset="1" stopColor="#93a9c8" />
          </linearGradient>
          <linearGradient id="midPeak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7f93b8" />
            <stop offset="1" stopColor="#4d628c" />
          </linearGradient>
          <linearGradient id="frontPeak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f5278" />
            <stop offset="1" stopColor="#243352" />
          </linearGradient>
          <linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8eaf72" />
            <stop offset="1" stopColor="#5e7d49" />
          </linearGradient>
        </defs>
        <path fill="url(#farPeak)" d="M0 520 L120 430 L230 490 L360 340 L520 470 L690 300 L860 450 L1040 280 L1200 420 L1440 360 L1440 810 L0 810 Z" />
        <path fill="#f7fbff" d="M360 340 L400 390 L330 392 Z M690 300 L748 372 L640 368 Z M1040 280 L1100 360 L980 350 Z" />
        <path fill="url(#midPeak)" d="M0 610 L150 500 L300 580 L470 430 L640 560 L820 400 L1010 540 L1180 450 L1440 560 L1440 810 L0 810 Z" />
        <path fill="#f4f8fc" d="M470 430 L520 490 L430 488 Z M820 400 L890 490 L760 486 Z" />
        <path fill="url(#frontPeak)" d="M0 700 L180 580 L340 660 L520 530 L730 670 L940 560 L1160 690 L1440 600 L1440 810 L0 810 Z" />
        <path fill="#fbfcff" d="M520 530 L575 590 L478 592 Z M940 560 L1010 630 L880 628 Z" />
        <path fill="url(#meadow)" d="M0 760 C240 720 420 790 720 740 C1040 688 1220 760 1440 730 L1440 810 L0 810 Z" />
        <g>
          <ellipse cx="1030" cy="742" rx="92" ry="18" fill="#1d2b22" opacity="0.28" />
          <path fill="#8b8178" d="M960 742 L990 690 L1048 668 L1110 700 L1124 748 L1040 760 Z" />
          <path fill="#a79b90" d="M990 690 L1048 668 L1072 710 L1012 724 Z" />
          <path fill="#6f655e" d="M1048 668 L1110 700 L1078 724 L1044 712 Z" />
        </g>
      </svg>
    </div>
  );
}

function Brackets() {
  return (
    <div className="pointer-events-none absolute inset-[12%] border-2 border-dashed border-white/50" aria-hidden="true" />
  );
}

function Boulder({ cut = false }) {
  return (
    <svg className="relative z-[2] h-[70%] max-h-[340px] w-auto drop-shadow-2xl" viewBox="0 0 640 460" aria-hidden="true">
      <ellipse cx="320" cy="400" rx="210" ry="28" fill="#000" opacity="0.25" />
      <path
        fill="#8d847c"
        d="M120 360 C130 250 190 150 310 128 C450 104 540 190 560 300 C574 390 500 430 320 438 C180 444 112 410 120 360 Z"
      />
      <path fill="#b3a79c" d="M150 330 C190 210 270 160 340 150 C300 230 250 300 210 360 C180 348 160 340 150 330 Z" />
      <path fill="#6e6560" d="M340 150 C460 160 530 230 548 320 C470 300 400 250 340 210 Z" />
      {cut ? (
        <>
          <path fill="#d8c7b4" d="M210 210 L430 188 L448 360 L196 372 Z" />
          <path fill="#f3efe8" d="M230 230 L360 216 L372 300 L240 312 Z" />
          <path fill="#e7b7c0" d="M300 240 L410 228 L424 330 L312 342 Z" />
          <path fill="#2c2a2a" d="M250 300 L390 286 L400 340 L258 352 Z" />
        </>
      ) : (
        <>
          <path fill="#efe6dc" d="M250 250 l36 10 l-12 28 z" opacity="0.9" />
          <path fill="#e4b7c2" d="M360 230 l40 8 l-14 30 z" />
          <path fill="#222" d="M410 300 l22 8 l-16 18 z" />
        </>
      )}
    </svg>
  );
}

function Mineral({ name, kind }) {
  const fills = {
    quartz: "rgba(255,255,255,.72)",
    feldspar: "#e7a3b0",
    mica: "#c4b5fd",
    pyroxene: "#7c9b6a",
    olivine: "#a3d977",
  };
  return (
    <figure className="m-0 grid justify-items-center gap-2 rounded-2xl bg-white/90 px-3 py-3 text-ink shadow-lg">
      <svg className="h-16 w-14" viewBox="0 0 120 140" aria-hidden="true">
        {kind === "quartz" && (
          <polygon points="60,8 100,48 88,120 32,120 20,48" fill={fills.quartz} stroke="#efe8df" strokeWidth="3" />
        )}
        {kind !== "quartz" && <rect x="28" y="24" width="68" height="92" rx="10" fill={fills[kind] || fills.mica} />}
      </svg>
      <figcaption className="text-xs font-extrabold">{name}</figcaption>
    </figure>
  );
}

function mineralSet(stage) {
  const text = `${stage?.title || ""} ${stage?.label || ""}`.toLowerCase();
  if (text.includes("dark") || text.includes("mafic")) {
    return [
      ["Pyroxene", "pyroxene"],
      ["Olivine", "olivine"],
      ["Mica", "mica"],
    ];
  }
  return [
    ["Quartz", "quartz"],
    ["Feldspar", "feldspar"],
    ["Mica", "mica"],
  ];
}

export function Scene({ visual, stage }) {
  const minerals = mineralSet(stage);
  return (
    <div className="absolute inset-0 overflow-hidden" key={visual}>
      {(visual === "mountain" || visual !== "mountain") && <MountainScene />}

      {visual === "rock" && (
        <div className="absolute inset-0 z-[2] grid place-items-center">
          <Brackets />
          <Boulder />
        </div>
      )}

      {visual === "cross-section" && (
        <div className="absolute inset-0 z-[2] grid place-items-center gap-4 p-6">
          <Boulder cut />
          <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
            {["Quartz vein", "Feldspar", "Mica flakes"].map((label) => (
              <li key={label} className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-ink">
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {visual === "minerals" && (
        <div className="absolute inset-x-0 bottom-[18%] z-[2] flex flex-wrap justify-center gap-3 px-4">
          {minerals.map(([name, kind]) => (
            <Mineral key={name} name={name} kind={kind} />
          ))}
        </div>
      )}

      {visual === "crystals" && (
        <div className="absolute inset-0 z-[2] grid place-items-center p-6">
          <svg className="h-[55%] max-h-[240px] w-auto rounded-2xl bg-white/90 p-4 shadow-xl" viewBox="0 0 360 220" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, row) =>
              Array.from({ length: 7 }).map((__, col) => {
                const x = 40 + col * 48;
                const y = 40 + row * 42;
                return (
                  <g key={`${row}-${col}`}>
                    {col < 6 && <line x1={x} y1={y} x2={x + 48} y2={y} stroke="#7C3AED" strokeWidth="2" opacity="0.35" />}
                    <circle cx={x} cy={y} r={row === 2 && col === 3 ? 11 : 7} fill="#7C3AED" />
                  </g>
                );
              })
            )}
          </svg>
          <p className="mt-3 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-ink">SiO₂ lattice</p>
        </div>
      )}

      {visual === "atoms" && (
        <div className="absolute inset-0 z-[2] grid place-items-center">
          <div className="relative grid size-40 place-items-center rounded-full bg-violet text-2xl font-black text-white shadow-[0_0_0_18px_rgba(124,58,237,0.2),0_0_0_36px_rgba(124,58,237,0.12)]">
            Si
          </div>
        </div>
      )}

      {visual === "earth" && (
        <div className="absolute inset-0 z-[2] grid place-items-center p-8">
          <svg className="h-[60%] max-h-[280px] w-auto drop-shadow-xl" viewBox="0 0 760 220" aria-hidden="true">
            <path d="M0 80 H340 L390 150 H0 Z" fill="#6e8f62" />
            <path d="M420 150 H760 V80 H470 Z" fill="#7f9b6c" />
            <rect x="340" y="70" width="130" height="90" fill="#c4a574" opacity="0.85" />
          </svg>
        </div>
      )}

      {visual === "volcano" && (
        <div className="absolute inset-0 z-[2] grid place-items-end justify-center pb-[12%]">
          <div className="absolute bottom-[28%] size-24 rounded-full bg-[#ff7a3d]/50 blur-2xl" />
          <svg className="h-[55%] max-h-[260px] w-auto" viewBox="0 0 400 260" aria-hidden="true">
            <path d="M40 240 L160 80 L240 80 L360 240 Z" fill="#5c534c" />
            <path d="M170 80 L230 80 L210 40 Z" fill="#ff5a2a" />
          </svg>
        </div>
      )}

      {(visual === "time" || visual === "insight" || visual === "compare") && (
        <div className="absolute inset-x-[10%] bottom-[16%] z-[2] rounded-3xl bg-white/95 p-5 text-ink shadow-2xl">
          <p className="m-0 text-sm font-extrabold text-violet">Classroom insight</p>
          <p className="mt-2 m-0 font-bold leading-relaxed">
            {stage?.title || stage?.label || "The shared world shifts with the question."}
          </p>
        </div>
      )}
    </div>
  );
}
