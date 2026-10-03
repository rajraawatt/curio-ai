import { useCallback, useRef, useState } from "react";

const MIN_SIZE = 0.04;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { x, y, w, h };
}

async function cropThumbnail(image, rect) {
  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return null;

    const sx = Math.round(rect.x * width);
    const sy = Math.round(rect.y * height);
    const sw = Math.max(1, Math.round(rect.w * width));
    const sh = Math.max(1, Math.round(rect.h * height));

    const maxEdge = 180;
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}

export function RegionMarker({ src, alt = "Lesson frame", selection, onSelect, onClear }) {
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState("Drag on the image to mark what you are asking about");

  const pointFromEvent = useCallback((event) => {
    const frame = frameRef.current;
    if (!frame) return null;
    const box = frame.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    return {
      x: clamp((event.clientX - box.left) / box.width, 0, 1),
      y: clamp((event.clientY - box.top) / box.height, 0, 1),
    };
  }, []);

  async function finish(rect) {
    if (rect.w < MIN_SIZE || rect.h < MIN_SIZE) {
      setDraft(null);
      setHint("Drag a slightly larger area, then ask your question");
      return;
    }
    const image = imageRef.current;
    const thumbnail = image && ready ? await cropThumbnail(image, rect) : null;
    onSelect?.({
      ...rect,
      thumbnail,
      label: "Marked region",
    });
    setDraft(null);
    setHint("Region selected — type your question below");
  }

  function onPointerDown(event) {
    if (event.button !== 0 || !ready) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { start: point, moved: false };
    setDraft({ x: point.x, y: point.y, w: 0, h: 0 });
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointFromEvent(event);
    if (!point) return;
    drag.moved = true;
    setDraft(normalizeRect(drag.start, point));
  }

  async function onPointerUp(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointFromEvent(event) || drag.start;
    dragRef.current = null;
    const rect = normalizeRect(drag.start, point);
    await finish(rect);
  }

  const active = draft || selection;

  return (
    <div className="grid gap-2 font-[Nunito,sans-serif]">
      <div className="flex items-center justify-between gap-3 text-[0.82rem] text-[#6B7280]">
        <span>{ready ? hint : "Loading lesson frame…"}</span>
        {selection && (
          <button
            type="button"
            className="rounded-full border border-[#C4B5FD] bg-[#EDE4FF] px-3 py-1.5 text-[0.78rem] font-bold text-[#7C3AED]"
            onClick={() => {
              onClear?.();
              setHint("Drag on the image to mark what you are asking about");
            }}
          >
            Clear mark
          </button>
        )}
      </div>
      <div
        ref={frameRef}
        className={`relative min-h-[42vh] cursor-crosshair touch-none select-none overflow-hidden rounded-xl border-2 border-[#F0EAE0] bg-black ${
          ready ? "" : "opacity-80"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
          setDraft(null);
        }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          className="pointer-events-none block h-full min-h-[42vh] w-full object-cover"
          onLoad={() => setReady(true)}
        />
        {active && (
          <div
            className={`pointer-events-none absolute rounded border-2 border-[#7C3AED] shadow-[0_0_0_9999px_rgba(31,41,55,0.45)] ${
              draft ? "bg-[#7C3AED]/20" : "bg-[#7C3AED]/30"
            }`}
            style={{
              left: `${active.x * 100}%`,
              top: `${active.y * 100}%`,
              width: `${active.w * 100}%`,
              height: `${active.h * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
