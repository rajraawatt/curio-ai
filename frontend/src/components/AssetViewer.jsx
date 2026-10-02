import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import { Suspense } from "react";

function GlbMesh({ url }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
}

/** Still image only — never shares a stacking context with Canvas. */
export function StillViewer({ stillUrl, label }) {
  if (!stillUrl) return null;
  return (
    <div className="prepare-still">
      <img src={stillUrl} alt={label || "still"} />
      <span className="prepare-media-label">{label} · Gemini still</span>
    </div>
  );
}

/** Real Tripo model only. A failed run has no mesh to turn. */
export function AssetViewer({ mesh, label, glbUrl }) {
  if (!glbUrl) {
    const failed = mesh?.status === "error" || mesh?.generator === "tripo-failed";
    return (
      <div className="prepare-model empty">
        <p>
          {failed
            ? "No 3D model to turn. Tripo ran out of credit, so the picture above was not made into a model."
            : "The 3D model has not been made yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="prepare-model">
      <Canvas
        camera={{ position: [0, 0.8, 4.2], fov: 40 }}
        shadows
        style={{ width: "100%", height: "100%", display: "block" }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0b1220"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 2]} intensity={1.35} castShadow />
        <Suspense fallback={null}>
          <GlbMesh url={glbUrl} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={0.6}
          maxDistance={14}
          target={[0, 0, 0]}
        />
      </Canvas>
      <span className="prepare-media-label">
        {label}
        {glbUrl ? " · Tripo 3D · drag / scroll to zoom" : ""}
      </span>
    </div>
  );
}
