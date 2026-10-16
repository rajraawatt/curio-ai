import * as THREE from "three";

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform vec2 texSize;
uniform vec3 outlineColor;
uniform float outlinePx;
varying vec2 vUv;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float isForeground(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  vec4 c = texture2D(map, uv);
  float L = luma(c.rgb);
  if (L < 0.07) return 0.0;
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  if (L > 0.96 && sat < 0.06) return 0.0;
  return 1.0;
}

void main() {
  vec4 tex = texture2D(map, vUv);
  float fg = isForeground(vUv);
  vec2 px = vec2(outlinePx / texSize.x, outlinePx / texSize.y);

  float edge = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      if (x == 0 && y == 0) continue;
      vec2 o = vec2(float(x), float(y)) * px;
      float n = isForeground(vUv + o);
      if (fg > 0.5 && n < 0.5) edge = max(edge, 1.0);
    }
  }

  float edge2 = 0.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      if (abs(x) + abs(y) != 2) continue;
      vec2 o = vec2(float(x), float(y)) * px;
      float n = isForeground(vUv + o);
      if (fg > 0.5 && n < 0.5) edge2 = max(edge2, 0.55);
    }
  }

  vec3 col = tex.rgb;
  float outline = max(edge, edge2);
  if (fg < 0.5 && outline < 0.5) {
    gl_FragColor = vec4(0.043, 0.071, 0.125, 1.0);
    return;
  }
  col = mix(col, outlineColor, outline * 0.9);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createStillDiagramMaterial(texture, outlineColor = "#8ab4f8") {
  const w = texture.image?.width || 1024;
  const h = texture.image?.height || 1024;
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      texSize: { value: new THREE.Vector2(w, h) },
      outlineColor: { value: new THREE.Color(outlineColor) },
      outlinePx: { value: 2.25 },
    },
    vertexShader,
    fragmentShader,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}
