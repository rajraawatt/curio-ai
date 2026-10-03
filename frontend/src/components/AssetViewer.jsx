import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import { freshMediaUrl } from "../mediaReady.js";

function GlbMesh({ url }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
}

export function StillViewer({ stillUrl, label }) {
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const src = stillUrl ? freshMediaUrl(stillUrl, `${attempt}`) : "";

  useEffect(() => {
    setBroken(false);
    setAttempt(0);
  }, [stillUrl]);

  useEffect(() => {
    if (!broken || !stillUrl || attempt >= 6) return undefined;
    const timer = setTimeout(() => {
      setBroken(false);
      setAttempt((n) => n + 1);
    }, 400 * (attempt + 1));
    return () => clearTimeout(timer);
  }, [broken, attempt, stillUrl]);

  if (!stillUrl) {
    return (
      <div className="grid h-[260px] w-full place-items-center bg-[#f8f5ef] text-center text-[#6B7280]">
        <p className="m-0 text-sm font-bold">Still not ready</p>
      </div>
    );
  }
  if (broken && attempt >= 6) {
    return (
      <div className="grid h-[260px] w-full place-items-center bg-[#f8f5ef] px-4 text-center text-[#6B7280]">
        <p className="m-0 text-sm font-bold">
          Could not load {label || "still"}.{" "}
          <a className="text-[#7C3AED] underline" href={src} target="_blank" rel="noreferrer">
            Open image
          </a>
        </p>
      </div>
    );
  }
  return (
    <div className="relative z-[1] h-[260px] w-full min-w-0 overflow-hidden bg-[#f8f5ef]">
      {!broken && (
        <img
          key={src}
          src={src}
          alt={label || "still"}
          decoding="async"
          fetchPriority="high"
          className="relative z-[1] block h-full w-full object-contain"
          onError={() => setBroken(true)}
          onLoad={() => setBroken(false)}
        />
      )}
      {broken && attempt < 6 && (
        <div className="grid h-full place-items-center text-sm font-bold text-[#6B7280]">Loading still…</div>
      )}
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-[2] rounded-full bg-[rgba(124,58,237,0.85)] px-2.5 py-1 text-[0.75rem] text-white">
        {label} · Gemini still
      </span>
    </div>
  );
}

function StandIn({ color = "#7C3AED" }) {
  return (
    <mesh>
      <sphereGeometry args={[1.1, 48, 48]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
    </mesh>
  );
}

/** Real Tripo model only. A failed run has no mesh to turn. */
export function AssetViewer({ mesh, label, glbUrl }) {
  if (!glbUrl) {
    const failed = mesh?.status === "error" || mesh?.generator === "tripo-failed";
    return (
      <div className="grid h-[260px] place-items-center bg-[#0b1220] px-4 text-center text-[#94a3b8]">
        <p className="m-0 max-w-[42rem] text-[0.9rem]">
          {failed
            ? "No 3D model to turn. Tripo ran out of credit, so the picture above was not made into a model."
            : "The 3D model has not been made yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-0 h-[260px] w-full min-w-0 overflow-hidden bg-[#0b1220]">
      <Canvas
        camera={{ position: [0, 0.8, 4.2], fov: 40 }}
        style={{ width: "100%", height: "100%", display: "block" }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0b1220"]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 6, 2]} intensity={1.35} />
        <Suspense fallback={<StandIn color={mesh?.color || "#7C3AED"} />}>
          <GlbMesh url={glbUrl} />
        </Suspense>
        <OrbitControls makeDefault enablePan enableZoom enableRotate minDistance={0.6} maxDistance={14} target={[0, 0, 0]} />
      </Canvas>
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-[2] rounded-full bg-[rgba(124,58,237,0.85)] px-2.5 py-1 text-[0.75rem] text-white">
        {label} · drag to turn
      </span>
    </div>
  );
}
