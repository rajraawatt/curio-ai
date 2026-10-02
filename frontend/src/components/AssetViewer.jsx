import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import { Suspense, useMemo } from "react";

function MockMesh({ mesh }) {
  const color = mesh?.color || "#90caf9";
  const type = mesh?.type || "sphere";

  const geometry = useMemo(() => {
    if (type === "capsule") return <capsuleGeometry args={[mesh.radius || 0.45, mesh.length || 1.2, 8, 16]} />;
    if (type === "torus") return <torusGeometry args={[mesh.radius || 1.2, mesh.tube || 0.18, 16, 48]} />;
    return <sphereGeometry args={[mesh.radius || 1, 32, 32]} />;
  }, [type, mesh?.radius, mesh?.length, mesh?.tube]);

  return (
    <mesh castShadow receiveShadow>
      {geometry}
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
    </mesh>
  );
}

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

/** Tripo / mock 3D only. */
export function AssetViewer({ mesh, label, glbUrl }) {
  if (!glbUrl && !mesh) {
    return <div className="prepare-model empty">Waiting for 3D…</div>;
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
          {glbUrl ? <GlbMesh url={glbUrl} /> : <MockMesh mesh={mesh} />}
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
