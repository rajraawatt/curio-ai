import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { measureObjectRadius } from "../diagramSceneScale.js";

function HalfSphere({ radius, color, opacity = 1, wireframe = false }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        wireframe={wireframe}
        roughness={0.78}
        metalness={wireframe ? 0.2 : 0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function AsteroidExploreModel({ accent = "#808080", onMeasured }) {
  const group = useRef(null);
  useLayoutEffect(() => {
    if (group.current) onMeasured?.(measureObjectRadius(group.current));
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshStandardMaterial color="#5c5c5c" wireframe transparent opacity={0.35} />
      </mesh>
      <HalfSphere radius={0.32} color="#c45c26" opacity={0.95} />
      <HalfSphere radius={0.58} color="#8b6914" opacity={0.82} />
      <HalfSphere radius={0.92} color={accent} opacity={0.55} />
      <mesh rotation={[0.4, 0.6, 0]}>
        <sphereGeometry args={[1.02, 24, 24]} />
        <meshStandardMaterial color="#6b7280" roughness={0.92} metalness={0.05} />
      </mesh>
      <pointLight position={[1.2, 1.5, 2]} intensity={2.5} color="#ffaa66" distance={8} />
    </group>
  );
}

export function SauropodExploreModel({ accent = "#6B8E23", onMeasured }) {
  const group = useRef(null);
  useLayoutEffect(() => {
    if (group.current) onMeasured?.(measureObjectRadius(group.current));
  });

  const skin = accent;
  const belly = "#a4c06a";

  return (
    <group ref={group} rotation={[0, -0.35, 0]}>
      <mesh position={[0, -0.05, 0]}>
        <capsuleGeometry args={[0.38, 1.05, 8, 16]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>
      <mesh position={[0.42, 0.52, 0.05]} rotation={[0.55, 0, -0.25]}>
        <capsuleGeometry args={[0.14, 0.85, 8, 16]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>
      <mesh position={[0.72, 0.92, 0.12]}>
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshStandardMaterial color={skin} roughness={0.68} />
      </mesh>
      <mesh position={[-0.55, 0.08, -0.15]} rotation={[0, 0, 0.08]}>
        <capsuleGeometry args={[0.12, 0.75, 8, 16]} />
        <meshStandardMaterial color={skin} roughness={0.72} />
      </mesh>
      {[
        [0.22, -0.62, 0.22],
        [-0.22, -0.62, 0.22],
        [0.22, -0.62, -0.22],
        [-0.22, -0.62, -0.22],
      ].map((pos, i) => (
        <mesh key={i} position={pos}>
          <capsuleGeometry args={[0.09, 0.42, 6, 12]} />
          <meshStandardMaterial color="#4a5f23" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0.02]} scale={[0.85, 0.6, 1]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color={belly} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function GenericExploreModel({ accent = "#8ab4f8", onMeasured }) {
  const group = useRef(null);
  useLayoutEffect(() => {
    if (group.current) onMeasured?.(measureObjectRadius(group.current));
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial color={accent} wireframe />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.72, 32, 32]} />
        <meshStandardMaterial color={accent} transparent opacity={0.45} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function ExploreSubjectModel({ kind, accent, onMeasured }) {
  if (kind === "asteroid") return <AsteroidExploreModel accent={accent} onMeasured={onMeasured} />;
  if (kind === "sauropod") return <SauropodExploreModel accent={accent} onMeasured={onMeasured} />;
  return <GenericExploreModel accent={accent} onMeasured={onMeasured} />;
}
