function MountainScene() {
  return (
    <div className="mountain">
      <div className="sky" />
      <div className="sun" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c3" />
      <svg className="peaks" viewBox="0 0 1440 810" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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
        <g className="boulder">
          <ellipse cx="1030" cy="742" rx="92" ry="18" fill="#1d2b22" opacity="0.28" />
          <path fill="#8b8178" d="M960 742 L990 690 L1048 668 L1110 700 L1124 748 L1040 760 Z" />
          <path fill="#a79b90" d="M990 690 L1048 668 L1072 710 L1012 724 Z" />
          <path fill="#6f655e" d="M1048 668 L1110 700 L1078 724 L1044 712 Z" />
          <path fill="#e7d2c4" d="M1018 708 l16 8 l-8 14 z" />
          <path fill="#d9dde3" d="M1064 702 l18 4 l-6 16 z" />
          <path fill="#2d2928" d="M1088 724 l10 6 l-14 8 z" />
        </g>
      </svg>
    </div>
  );
}

function Brackets({ children }) {
  return (
    <div className="brackets">
      <span />
      <span />
      <span />
      <span />
      {children}
    </div>
  );
}

function Boulder({ cut = false }) {
  return (
    <svg className="boulder-hero" viewBox="0 0 640 460" aria-hidden="true">
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
          <path fill="#f7f4ef" d="M268 248 l28 6 l-8 22 z" />
          <path fill="#c98496" d="M340 260 l34 4 l-10 24 z" />
        </>
      ) : (
        <>
          <path fill="#efe6dc" d="M250 250 l36 10 l-12 28 z" opacity="0.9" />
          <path fill="#e4b7c2" d="M360 230 l40 8 l-14 30 z" />
          <path fill="#222" d="M410 300 l22 8 l-16 18 z" />
          <path d="M180 300 C260 270 340 290 470 250" fill="none" stroke="#5c554f" strokeWidth="3" opacity="0.45" />
          <path d="M200 340 C300 320 390 350 500 310" fill="none" stroke="#5c554f" strokeWidth="2" opacity="0.35" />
        </>
      )}
    </svg>
  );
}

function Mineral({ name, kind }) {
  return (
    <figure className={`gem gem-${kind}`}>
      <svg viewBox="0 0 120 140" aria-hidden="true">
        {kind === "quartz" && (
          <polygon points="60,8 100,48 88,120 32,120 20,48" fill="rgba(255,255,255,.72)" stroke="#efe8df" strokeWidth="3" />
        )}
        {kind === "feldspar" && <rect x="28" y="24" width="68" height="92" rx="10" fill="#e7a3b0" />}
        {kind === "mica" && (
          <>
            <rect x="26" y="36" width="70" height="16" rx="3" fill="#2a2724" transform="rotate(-8 60 70)" />
            <rect x="26" y="58" width="70" height="16" rx="3" fill="#3d3832" transform="rotate(4 60 70)" />
            <rect x="26" y="80" width="70" height="16" rx="3" fill="#161411" transform="rotate(-3 60 70)" />
          </>
        )}
        {kind === "olivine" && <polygon points="60,16 104,70 84,124 36,124 16,70" fill="#6f8f3a" />}
        {kind === "pyroxene" && <polygon points="30,20 92,20 108,70 78,128 24,110 12,60" fill="#243042" />}
      </svg>
      <figcaption>{name}</figcaption>
    </figure>
  );
}

function mineralSet(stage) {
  const blob = `${stage?.caption?.en || ""} ${stage?.narration?.en || ""}`.toLowerCase();
  if (blob.includes("basalt") || blob.includes("pyroxene") || blob.includes("olivine")) {
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
    <div className={`scene scene-${visual}`} key={visual}>
      {visual !== "mountain" && (
        <div className="bleed">
          <MountainScene />
        </div>
      )}
      {visual === "mountain" && <MountainScene />}

      {visual === "rock" && (
        <div className="foreground">
          <Brackets />
          <Boulder />
        </div>
      )}

      {visual === "cross-section" && (
        <div className="foreground">
          <Boulder cut />
          <ul className="leaders">
            <li>Quartz vein</li>
            <li>Feldspar</li>
            <li>Mica flakes</li>
          </ul>
        </div>
      )}

      {visual === "minerals" && (
        <div className="foreground mineral-row">
          {minerals.map(([name, kind]) => (
            <Mineral key={name} name={name} kind={kind} />
          ))}
        </div>
      )}

      {visual === "crystals" && (
        <div className="foreground lattice-wrap">
          <svg className="lattice" viewBox="0 0 360 220" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, row) =>
              Array.from({ length: 7 }).map((__, col) => {
                const x = 30 + col * 48 + (row % 2 ? 24 : 0);
                const y = 28 + row * 40;
                return (
                  <g key={`${row}-${col}`}>
                    {col < 6 && <line x1={x} y1={y} x2={x + 48} y2={y} className="bond" />}
                    <circle cx={x} cy={y} r={row === 2 && col === 3 ? 11 : 7} className="node" />
                  </g>
                );
              })
            )}
          </svg>
          <p className="formula">
            SiO<sub>2</sub>
          </p>
        </div>
      )}

      {visual === "atoms" && (
        <div className="foreground atom">
          <div className="nucleus">Si</div>
          <i className="orbit o1" />
          <i className="orbit o2" />
          <i className="orbit o3" />
          <div className="atom-key">
            <span>Silicon</span>
            <span>Oxygen</span>
          </div>
        </div>
      )}

      {visual === "tectonics" && (
        <div className="foreground earth">
          <svg viewBox="0 0 760 360" aria-hidden="true">
            <rect width="760" height="360" fill="#1b3358" />
            <path d="M0 150 H760 V230 H0 Z" fill="#c47a4a" />
            <path className="plate left" d="M0 80 H340 L390 150 H0 Z" fill="#6e8f62" />
            <path className="plate right" d="M420 150 H760 V80 H470 Z" fill="#7f9b6c" />
            <path d="M300 150 L380 70 L460 150 Z" fill="#d7e2ea" />
            <path d="M330 150 L380 96 L430 150 Z" fill="#f4f7fb" />
            <path d="M80 190 H250" stroke="#fff4" strokeWidth="4" markerEnd="url(#arr)" />
            <path d="M680 190 H500" stroke="#fff4" strokeWidth="4" />
            <text x="70" y="250" fill="#f3d2bc" fontSize="18">
              Plate
            </text>
            <text x="560" y="250" fill="#f3d2bc" fontSize="18">
              Plate
            </text>
            <text x="330" y="40" fill="#fff" fontSize="18">
              Uplift
            </text>
          </svg>
        </div>
      )}

      {visual === "volcano" && (
        <div className="foreground volcano">
          <div className="glow" />
          <svg viewBox="0 0 640 380" aria-hidden="true">
            <path d="M40 340 L300 80 L600 340 Z" fill="#2a2428" />
            <path d="M250 150 L300 80 L360 160 L300 140 Z" fill="#ffb15a" />
            <path d="M300 150 C320 210 340 250 330 340 L270 340 C280 250 286 200 300 150 Z" fill="#ff5a2a" />
          </svg>
        </div>
      )}

      {visual === "time" && (
        <div className="foreground time-card">
          <p>Deep time</p>
          <strong>48 million years</strong>
          <ol>
            <li>Plates move a few centimeters a year</li>
            <li>Crust folds and stacks</li>
            <li>A range stands where a plain once was</li>
          </ol>
        </div>
      )}

      {visual === "compare" && (
        <div className="foreground compare">
          <article>
            <div className="swatch pale" />
            <h3>Granite</h3>
            <p>Cooled slowly underground. Large, pale crystals.</p>
          </article>
          <article>
            <div className="swatch dark" />
            <h3>Basalt</h3>
            <p>Cooled fast from lava. Fine, dark minerals.</p>
          </article>
        </div>
      )}

      {visual === "insight" && (
        <div className="foreground insight">
          <p>The question changes the view</p>
          <strong>{stage?.label?.en || "Look closer"}</strong>
        </div>
      )}
    </div>
  );
}
