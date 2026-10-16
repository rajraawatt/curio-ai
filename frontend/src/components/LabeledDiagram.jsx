import { Center, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { normalizeDiagramLabels } from "../diagramLabels.js";
import { ExploreSubjectModel } from "../explore/ExploreSubjectModels.jsx";
import { inferExploreKind } from "../explore/exploreKind.js";
import { resolveExploreLabels } from "../explore/exploreLabelPresets.js";
import {
  diagramPinScale,
  labelScaleForModelScreen,
  measureObjectRadius,
  modelDiameterOnScreenPx,
  scaleLabelPositions,
} from "../diagramSceneScale.js";

function GlbMesh({ url }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
}

function LabelPin3D({ label, active, onToggle, modelRadius, pinScale }) {
  const { camera, size } = useThree();
  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);
  const btnRef = useRef(null);
  const labelScaleRef = useRef(0.65);
  const pos = useMemo(
    () => new THREE.Vector3(label.position.x, label.position.y, label.position.z),
    [label.position.x, label.position.y, label.position.z]
  );

  useFrame(() => {
    const d = camera.position.distanceTo(pos);
    const reveal = label.revealDistance ?? modelRadius * 2.6;
    let nextLevel = 1;
    if (d < reveal * 0.55) nextLevel = 3;
    else if (d < reveal * 0.9) nextLevel = 2;
    if (nextLevel !== levelRef.current) {
      levelRef.current = nextLevel;
      setLevel(nextLevel);
    }

    const modelPx = modelDiameterOnScreenPx(camera, size, modelRadius);
    const nextScale = labelScaleForModelScreen(modelPx) * pinScale;
    if (Math.abs(nextScale - labelScaleRef.current) > 0.015 && btnRef.current) {
      labelScaleRef.current = nextScale;
      btnRef.current.style.transform = `scale(${nextScale.toFixed(3)})`;
    }
  });

  return (
    <Html
      position={[label.position.x, label.position.y, label.position.z]}
      center
      zIndexRange={[40, 0]}
      style={{
        pointerEvents: "auto",
        ["--pin-scale"]: String(pinScale),
      }}
    >
      <button
        ref={btnRef}
        type="button"
        className={`diagram-pin three d${level} ${active ? "on" : ""}`}
        style={{ transformOrigin: "center center", transform: "scale(0.65)" }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(label.id);
        }}
      >
        <span className="diagram-pin-line" aria-hidden />
        <span className="diagram-pin-dot" aria-hidden />
        <span className="diagram-pin-title">{label.text}</span>
        {level >= 2 && <span className="diagram-pin-summary">{label.summary}</span>}
        {(level >= 3 || active) && <p className="diagram-pin-detail">{label.detail}</p>}
      </button>
    </Html>
  );
}

function LabeledModelScene({ glbUrl, labels, activeId, onToggle, sceneScale, onModelRadius }) {
  const measureRef = useRef(null);
  useLayoutEffect(() => {
    if (!measureRef.current) return;
    const r = measureObjectRadius(measureRef.current);
    onModelRadius((prev) => (Math.abs(prev - r) < 0.025 ? prev : r));
  }, [glbUrl, onModelRadius]);

  return (
    <>
      <color attach="background" args={["#0b1220"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 2]} intensity={1.35} castShadow />
      <Suspense fallback={null}>
        <group ref={measureRef}>
          <GlbMesh url={glbUrl} />
        </group>
      </Suspense>
      {labels.map((label) => (
        <LabelPin3D
          key={label.id}
          label={label}
          active={activeId === label.id}
          onToggle={onToggle}
          modelRadius={sceneScale.modelRadius}
          pinScale={sceneScale.pinScale}
        />
      ))}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={sceneScale.minDistance}
        maxDistance={sceneScale.maxDistance}
        target={[0, 0, 0]}
      />
    </>
  );
}

function LabeledSceneShell({
  children,
  labels,
  title,
  hint,
  initialModelRadius = 1,
  mapPinPositions,
}) {
  const [modelRadius, setModelRadius] = useState(initialModelRadius);
  const pins = useMemo(() => {
    const base = normalizeDiagramLabels(labels, title);
    if (mapPinPositions) return mapPinPositions(base);
    return scaleLabelPositions(base, modelRadius);
  }, [labels, title, modelRadius, mapPinPositions]);
  const sceneScale = useMemo(() => diagramPinScale(modelRadius), [modelRadius]);
  const [activeId, setActiveId] = useState(null);

  function toggle(id) {
    setActiveId((cur) => (cur === id ? null : id));
  }

  const camera = useMemo(
    () => ({
      position: [0, sceneScale.cameraY, sceneScale.cameraZ],
      fov: 40,
    }),
    [sceneScale.cameraY, sceneScale.cameraZ]
  );

  return (
    <div
      className="diagram-view diagram-model"
      style={{ ["--pin-scale"]: String(sceneScale.pinScale) }}
    >
      <Canvas camera={camera} shadows gl={{ antialias: true, alpha: false }}>
        {children(pins, activeId, toggle, sceneScale, setModelRadius)}
      </Canvas>
      <p className="diagram-hint">{hint}</p>
      {activeId && (
        <aside className="diagram-detail-panel">
          {pins
            .filter((p) => p.id === activeId)
            .map((p) => (
              <div key={p.id}>
                <h4>{p.text}</h4>
                <p>{p.detail}</p>
              </div>
            ))}
        </aside>
      )}
    </div>
  );
}

export function LabeledProceduralDiagram({ mesh, labels, title, assetId, imagePrompt }) {
  const accent = mesh?.color || "#8ab4f8";
  const exploreKind = useMemo(
    () => inferExploreKind({ id: assetId, label: title, imagePrompt, mesh }),
    [assetId, title, imagePrompt, mesh]
  );
  const exploreLabels = useMemo(
    () => resolveExploreLabels(exploreKind, labels, title),
    [exploreKind, labels, title]
  );

  const hintByKind = {
    asteroid: "Rotate the asteroid · zoom into layers · tap pins for impact science facts",
    sauropod: "Spin the dinosaur · zoom body parts · tap pins for kid-friendly facts",
    generic: "Drag to rotate · scroll to zoom · tap pins to read more",
  };

  return (
    <LabeledSceneShell
      labels={exploreLabels}
      title={title}
      hint={hintByKind[exploreKind] || hintByKind.generic}
      initialModelRadius={1.05}
    >
      {(pins, activeId, toggle, sceneScale, setModelRadius) => (
        <>
          <color attach="background" args={["#0b1220"]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 5]} intensity={1.2} />
          <directionalLight position={[-4, 2, -2]} intensity={0.45} />
          <Suspense fallback={null}>
            <Center>
              <ExploreSubjectModel
                kind={exploreKind}
                accent={accent}
                onMeasured={(r) =>
                  setModelRadius((prev) => (Math.abs(prev - r) < 0.025 ? prev : r))
                }
              />
            </Center>
          </Suspense>
          {pins.map((label) => (
            <LabelPin3D
              key={label.id}
              label={label}
              active={activeId === label.id}
              onToggle={toggle}
              modelRadius={sceneScale.modelRadius}
              pinScale={sceneScale.pinScale}
            />
          ))}
          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={sceneScale.minDistance}
            maxDistance={sceneScale.maxDistance}
            target={[0, 0, 0]}
          />
        </>
      )}
    </LabeledSceneShell>
  );
}

export function LabeledModelDiagram({ glbUrl, labels, title }) {
  if (!glbUrl) return null;

  return (
    <LabeledSceneShell
      labels={labels}
      title={title}
      hint="Scroll to zoom · drag to rotate · pins show more detail when you move closer"
    >
      {(pins, activeId, toggle, sceneScale, setModelRadius) => (
        <LabeledModelScene
          glbUrl={glbUrl}
          labels={pins}
          activeId={activeId}
          onToggle={toggle}
          sceneScale={sceneScale}
          onModelRadius={setModelRadius}
        />
      )}
    </LabeledSceneShell>
  );
}

export function LabeledStillDiagram({ src, labels, title }) {
  const pins = useMemo(() => normalizeDiagramLabels(labels, title), [labels, title]);
  const [zoom, setZoom] = useState(1);
  const [activeId, setActiveId] = useState(null);
  const pinScale = useMemo(() => Math.min(1, Math.max(0.55, 0.95 / Math.sqrt(pins.length || 1))), [pins.length]);

  if (!src) return null;

  const detailLevel = zoom >= 1.45 ? 3 : zoom >= 1.15 ? 2 : 1;

  function onWheel(event) {
    event.preventDefault();
    setZoom((z) => Math.min(2.2, Math.max(1, z + (event.deltaY < 0 ? 0.08 : -0.08))));
  }

  return (
    <div className="diagram-view diagram-still" onWheel={onWheel} style={{ ["--pin-scale"]: pinScale }}>
      <div className="diagram-still-zoom" style={{ transform: `scale(${zoom})` }}>
        <img src={src.split("?")[0]} alt={title || "Diagram"} draggable={false} />
        {pins.map((label, i) => {
          const level = activeId === label.id ? 3 : detailLevel;
          return (
            <button
              key={label.id}
              type="button"
              className={`diagram-pin still d${level} ${activeId === label.id ? "on" : ""}`}
              style={{
                left: `${label.imagePosition.x * 100}%`,
                top: `${label.imagePosition.y * 100}%`,
                animationDelay: `${i * 0.05}s`,
              }}
              onClick={() => setActiveId((cur) => (cur === label.id ? null : label.id))}
            >
              <span className="diagram-pin-dot" aria-hidden />
              <span className="diagram-pin-title">{label.text}</span>
              {level >= 2 && <span className="diagram-pin-summary">{label.summary}</span>}
              {level >= 3 && <p className="diagram-pin-detail">{label.detail}</p>}
            </button>
          );
        })}
      </div>
      <p className="diagram-hint">Scroll on the image to zoom · tap a pin for the full label</p>
      {activeId && (
        <aside className="diagram-detail-panel">
          {pins
            .filter((p) => p.id === activeId)
            .map((p) => (
              <div key={p.id}>
                <h4>{p.text}</h4>
                <p>{p.detail}</p>
              </div>
            ))}
        </aside>
      )}
    </div>
  );
}
