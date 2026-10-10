import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import { clipAnalyticsMeta } from "../clipAnalyticsMeta.js";
import { LessonClipPlayer } from "./LessonClipPlayer.jsx";
import { stageClipFromPack } from "./ClassLessonStage.jsx";
import { listen, narrate, stopNarration } from "../speech.js";

const CLIP_SECONDS = 8;

const SUGGESTED = [
  "What is this part?",
  "What does this part do?",
  "Why is this part important?",
  "What happens if this part stops working?",
];

function pointOnSphere(anchor, radius = 1) {
  const u = (Number(anchor?.[0]) || 0.5) * Math.PI * 2;
  const v = (Number(anchor?.[1]) || 0.5) * Math.PI;
  return new Vector3(
    radius * Math.sin(v) * Math.cos(u),
    radius * Math.cos(v),
    radius * Math.sin(v) * Math.sin(u),
  );
}

/** Lesson labels from the Tripo/prepare asset. Anchors are tap targets on the fitted model. */
function partsFor(asset) {
  const raw = Array.isArray(asset?.parts) && asset.parts.length
    ? asset.parts
    : Array.isArray(asset?.labels)
      ? asset.labels
      : [];
  if (!raw.length) {
    return [{ id: "whole", label: asset?.label || "Whole model", anchor: [0.5, 0.45] }];
  }
  return raw.map((part, index) => ({
    id: String(part.id || `part-${index}`),
    label: String(part.label || part.text || `Part ${index + 1}`),
    anchor: Array.isArray(part.anchor)
      ? part.anchor
      : [(index + 0.5) / raw.length, 0.32 + (index % 3) * 0.18],
  }));
}

function nearestPart(point, parts) {
  let best = parts[0] || null;
  let bestDist = Infinity;
  for (const part of parts) {
    const pos = pointOnSphere(part.anchor, 1);
    const dist = pos.distanceTo(point);
    if (dist < bestDist) {
      bestDist = dist;
      best = part;
    }
  }
  return best;
}

function InteractiveModel({ url, parts, selectedPartId, onPartSelect }) {
  const { scene } = useGLTF(url);
  const pointer = useRef(null);

  const fitted = useMemo(() => {
    const object = scene.clone(true);
    object.position.set(0, 0, 0);
    object.scale.set(1, 1, 1);
    object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2 / max;
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    object.traverse((node) => {
      if (node.isMesh) {
        node.userData.pickable = true;
      }
    });
    return object;
  }, [scene]);

  return (
    <group
      onPointerDown={(event) => {
        event.stopPropagation();
        pointer.current = {
          x: event.clientX,
          y: event.clientY,
          point: event.point.clone(),
        };
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        const start = pointer.current;
        pointer.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (dx * dx + dy * dy > 36) return; // orbit drag, not a tap
        const part = nearestPart(start.point, parts);
        if (part) onPartSelect?.(part);
      }}
    >
      <primitive object={fitted} />
      {parts.map((part) => {
        const active = part.id === selectedPartId;
        const pos = pointOnSphere(part.anchor, 1);
        return (
          <mesh key={part.id} position={pos} visible={active}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color="#EC4899" transparent opacity={0.85} depthTest={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Current playback time picks which prepared asset the click should open. */
export function assetForTime(pack, time) {
  const assets = Array.isArray(pack?.assets) ? pack.assets : [];
  const beats = Array.isArray(pack?.beats) ? pack.beats : [];
  const count = Math.max(assets.length, beats.length, 1);
  const index = Math.min(Math.max(Math.floor(Number(time) / CLIP_SECONDS), 0), count - 1);
  const objectId = beats[index]?.objectId;
  const asset =
    assets.find((item) => item.id === objectId) ||
    assets[Math.min(index, Math.max(assets.length - 1, 0))] || {
      id: objectId || `scene-${index + 1}`,
      label: beats[index]?.title || `Scene ${index + 1}`,
    };
  return asset;
}

const PREVIEW_MODEL_TARGET = 3;
const readyModelUrls = new Set();
const inflightModelUrls = new Map();

export function previewModelUrls(pack) {
  const urls = [];
  const seen = new Set();
  const add = (url) => {
    if (!url || seen.has(url) || urls.length >= PREVIEW_MODEL_TARGET) return;
    seen.add(url);
    urls.push(url);
  };

  for (let i = 0; i < PREVIEW_MODEL_TARGET; i += 1) {
    add(assetForTime(pack, i * CLIP_SECONDS)?.glbUrl);
  }
  for (const asset of pack?.assets || []) add(asset.glbUrl);

  return urls.slice(0, PREVIEW_MODEL_TARGET);
}

export function arePreviewModelsReady(pack) {
  const urls = previewModelUrls(pack);
  return urls.length > 0 && urls.every((url) => readyModelUrls.has(url));
}

function preloadLocalGlb(url) {
  if (readyModelUrls.has(url)) return Promise.resolve(url);
  if (inflightModelUrls.has(url)) return inflightModelUrls.get(url);

  const job = Promise.resolve()
    .then(() => useGLTF.preload(url))
    .then(() => {
      readyModelUrls.add(url);
      inflightModelUrls.delete(url);
      return url;
    })
    .catch((err) => {
      inflightModelUrls.delete(url);
      throw err;
    });

  inflightModelUrls.set(url, job);
  return job;
}

export async function loadInteractiveModels(pack, onProgress) {
  const urls = previewModelUrls(pack);
  const total = urls.length;

  if (total === 0) {
    onProgress?.({ loaded: 0, total: 0, status: "ready" });
    return { loaded: 0, total: 0 };
  }

  let loaded = urls.filter((url) => readyModelUrls.has(url)).length;
  if (loaded >= total) {
    onProgress?.({ loaded: total, total, status: "ready" });
    return { loaded: total, total };
  }

  onProgress?.({ loaded, total, status: "loading" });

  for (const url of urls) {
    if (readyModelUrls.has(url)) continue;
    await preloadLocalGlb(url);
    loaded += 1;
    onProgress?.({ loaded, total, status: loaded >= total ? "ready" : "loading" });
  }

  onProgress?.({ loaded: total, total, status: "ready" });
  return { loaded: total, total };
}

export function preloadInteractiveModels(pack) {
  loadInteractiveModels(pack).catch(() => {});
}

async function askTutor(payload) {
  const res = await fetch("/api/model-tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Tutor could not answer.");
  return data;
}

/**
 * Teacher preview of student interaction:
 * click video → 3D model → tap a part → ask Gemini (text or voice).
 */
export function PrepareInteractiveReview({ pack, language = "en", modelsReady = true }) {
  const clip = stageClipFromPack(pack);
  const [time, setTime] = useState(0);
  const [openAsset, setOpenAsset] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [busyTutor, setBusyTutor] = useState(false);
  const [listening, setListening] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const [playError, setPlayError] = useState("");
  const playbackRef = useRef(null);
  const listenRef = useRef(null);

  const meta = useMemo(() => (clip ? clipAnalyticsMeta(clip, pack) : null), [clip, pack]);
  const ageGroup = pack?.ageGroup || "11-14";
  const lang = pack?.language || language;
  const parts = openAsset ? partsFor(openAsset) : [];

  if (!clip) return null;
  if (!modelsReady) return null;

  function openAt(seconds) {
    playbackRef.current?.pause?.();
    const asset = assetForTime(pack, seconds);
    setOpenAsset(asset);
    setSelectedPart(null);
    setMessages([]);
    setQuestion("");
    setTutorError("");
    stopNarration();
  }

  function closeModel() {
    listenRef.current?.stop?.();
    listenRef.current = null;
    setListening(false);
    stopNarration();
    setOpenAsset(null);
    setSelectedPart(null);
    setMessages([]);
    setQuestion("");
    setTutorError("");
  }

  async function submitQuestion(rawText) {
    const text = String(rawText || question).trim();
    if (!text || !openAsset || busyTutor) return;
    if (!selectedPart) {
      setTutorError("Tap a part on the 3D model first, then ask.");
      return;
    }

    setTutorError("");
    setBusyTutor(true);
    setQuestion("");
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text, part: selectedPart.label }]);

    try {
      const data = await askTutor({
        question: text,
        modelLabel: openAsset.label,
        modelId: openAsset.id,
        partId: selectedPart.id,
        partLabel: selectedPart.label,
        topic: pack?.topic || openAsset.label,
        ageGroup,
        language: lang,
        reason: openAsset.reason,
        history,
      });
      const reply = data.answer || "I could not explain that yet.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply,
          followUp: data.followUp || null,
          source: data.source,
        },
      ]);
      narrate(reply, lang, `tutor-${Date.now()}`).catch(() => {});
    } catch (err) {
      setTutorError(err.message || "Tutor failed.");
    } finally {
      setBusyTutor(false);
    }
  }

  function startVoice() {
    if (listening) {
      listenRef.current?.stop?.();
      listenRef.current = null;
      setListening(false);
      return;
    }
    setTutorError("");
    setListening(true);
    listenRef.current = listen(
      lang,
      (text) => {
        setListening(false);
        listenRef.current = null;
        setQuestion(text);
        submitQuestion(text);
      },
      (err) => {
        setListening(false);
        listenRef.current = null;
        if (err) setTutorError(err);
      },
    );
  }

  return (
    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,1fr)]">
      <section className="rounded-[22px] border-2 border-[#F0EAE0] bg-white px-4 py-3.5 text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]">
        <h2 className="mb-1 text-[1.05rem] font-black">Student preview</h2>
        <p className="mb-3 mt-0 text-[0.85rem] font-bold text-[#6B7280]">
          Play, click the video to open the model, tap any part, then ask the AI tutor by voice or text.
        </p>
        <LessonClipPlayer
          clip={meta}
          lang={lang}
          ageGroup={ageGroup}
          hideNativeControls
          playbackRef={playbackRef}
          deferSrc
          preload="none"
          trackAs="Prepare review"
          onTime={setTime}
          onSurfaceClick={openAt}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-black text-white"
            onClick={() => {
              setPlayError("");
              playbackRef.current?.play()?.catch((err) => setPlayError(err?.message || "Could not play."));
            }}
          >
            Play
          </button>
          <button
            type="button"
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-black text-[#1F2937]"
            onClick={() => playbackRef.current?.pause()}
          >
            Pause
          </button>
          <button
            type="button"
            className="rounded-full bg-[#EC4899] px-4 py-2 text-sm font-black text-white"
            onClick={() => {
              setPlayError("");
              playbackRef.current?.play()?.catch((err) => setPlayError(err?.message || "Could not play."));
            }}
          >
            Resume
          </button>
          <span className="text-sm font-bold text-[#6B7280]">{time.toFixed(1)}s</span>
          {playError && <span className="text-sm font-bold text-[#EC4899]">{playError}</span>}
        </div>
      </section>

      <aside className="overflow-hidden rounded-[22px] border-2 border-[#F0EAE0] bg-white text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]">
        {!openAsset ? (
          <div className="grid min-h-[420px] place-items-center px-6 text-center">
            <p className="m-0 font-bold text-[#6B7280]">Click the video to explore a 3D model with the AI tutor.</p>
          </div>
        ) : (
          <div className="grid">
            <header className="flex items-start justify-between gap-3 px-4 pt-4">
              <div>
                <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[#7C3AED]">
                  AI tutor · Gemini
                </p>
                <h3 className="m-0 mt-1 text-lg font-black">{openAsset.label || openAsset.id}</h3>
                <p className="m-0 mt-1 text-sm font-bold text-[#6B7280]">
                  {selectedPart
                    ? `Selected: ${selectedPart.label} — ask anything about it`
                    : "Tap the model to select a part"}
                </p>
              </div>
              <button type="button" className="rounded-full bg-gray-100 px-3 py-1 text-sm font-black" onClick={closeModel}>
                Close
              </button>
            </header>

            <div className="relative mt-3 h-[260px] bg-[#0b1220]">
              {parts.length > 0 && (
                <ul className="pointer-events-none absolute right-2 top-2 z-[2] m-0 flex max-w-[55%] list-none flex-col items-end gap-1 p-0">
                  {parts.map((part) => (
                    <li
                      key={part.id}
                      className={`rounded-full px-2 py-0.5 text-[0.72rem] font-extrabold shadow-sm ${
                        part.id === selectedPart?.id ? "bg-[#EC4899] text-white" : "bg-white/95 text-[#1F2937]"
                      }`}
                    >
                      {part.label}
                    </li>
                  ))}
                </ul>
              )}
              {openAsset.glbUrl ? (
                <Canvas
                  camera={{ position: [0, 0.4, 4.2], fov: 40 }}
                  dpr={[1, 1.5]}
                  frameloop="demand"
                  style={{ width: "100%", height: "100%" }}
                  gl={{ antialias: true, powerPreference: "high-performance" }}
                >
                  <color attach="background" args={["#0b1220"]} />
                  <ambientLight intensity={0.9} />
                  <directionalLight position={[3, 4, 2]} intensity={1.2} />
                  <Suspense fallback={null}>
                    <InteractiveModel
                      url={openAsset.glbUrl}
                      parts={parts}
                      selectedPartId={selectedPart?.id}
                      onPartSelect={(part) => {
                        setSelectedPart(part);
                        setTutorError("");
                      }}
                    />
                  </Suspense>
                  <OrbitControls makeDefault enablePan={false} />
                </Canvas>
              ) : (
                <div className="grid h-full place-items-center px-6 text-center text-sm font-bold text-[#94a3b8]">
                  {openAsset.label || "This scene"} has no Tripo model yet.
                </div>
              )}
            </div>

            <div className="grid gap-3 p-4">
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-2xl bg-[#F8F4ED] p-3">
                {messages.length === 0 && (
                  <p className="m-0 text-sm font-bold text-[#6B7280]">
                    Try: “What is this part?” or “What happens if this stops working?”
                  </p>
                )}
                {messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      msg.role === "user" ? "bg-white text-[#1F2937]" : "bg-[#7C3AED] text-white"
                    }`}
                  >
                    <p className="m-0">{msg.text}</p>
                    {msg.followUp && (
                      <button
                        type="button"
                        className="mt-2 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black"
                        onClick={() => submitQuestion(msg.followUp)}
                      >
                        Ask: {msg.followUp}
                      </button>
                    )}
                  </div>
                ))}
                {busyTutor && <p className="m-0 text-sm font-bold text-[#7C3AED]">Thinking…</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    disabled={busyTutor || !selectedPart}
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-[#1F2937] disabled:opacity-40"
                    onClick={() => submitQuestion(hint)}
                  >
                    {hint}
                  </button>
                ))}
              </div>

              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitQuestion(question);
                }}
              >
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={selectedPart ? `Ask about ${selectedPart.label}…` : "Select a part first…"}
                  disabled={busyTutor}
                  className="min-w-[12rem] flex-1 rounded-full border-2 border-[#F0EAE0] bg-[#F8F4ED] px-3 py-2 text-sm font-bold text-[#1F2937] outline-none focus:border-[#C4B5FD]"
                />
                <button
                  type="button"
                  className={`rounded-full px-3 py-2 text-sm font-black text-white ${
                    listening ? "bg-[#EC4899]" : "bg-[#7C3AED]"
                  }`}
                  onClick={startVoice}
                  disabled={busyTutor || !selectedPart}
                >
                  {listening ? "Listening…" : "Voice"}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#EC4899] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                  disabled={busyTutor || !selectedPart || !question.trim()}
                >
                  Ask
                </button>
              </form>
              {tutorError && <p className="m-0 text-sm font-bold text-[#EC4899]">{tutorError}</p>}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
