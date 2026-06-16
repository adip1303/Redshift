import * as THREE from 'three';

const vertexShader = /* glsl */`
  attribute float alpha;
  attribute float density;

  varying float vAlpha;
  varying float vDensity;

  void main() {
    vAlpha = alpha;
    vDensity = density;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  uniform vec3 colorA;
  uniform vec3 colorB;

  varying float vAlpha;
  varying float vDensity;

  void main() {
    vec3 color = mix(colorA, colorB, vDensity);
    vec3 finalColor = color;

    // Boost brightness near filament midpoints (density ~0.5)
    float midBoost = 1.0 - abs(vDensity - 0.5) * 2.0; // 1 at center, 0 at ends
    finalColor += color * midBoost * 0.12;

    gl_FragColor = vec4(finalColor, vAlpha * 0.55);
  }
`;

export function createFilaments(filamentData, palette) {
  const positions = [];
  const alphas = [];
  const densities = [];

  for (const filament of filamentData) {
    const pts = filament.points;
    const segCount = pts.length - 1;

    for (let i = 0; i < segCount; i++) {
      const pA = pts[i];
      const pB = pts[i + 1];

      positions.push(pA.x, pA.y, pA.z);
      positions.push(pB.x, pB.y, pB.z);

      const storedAlpha = filament.alpha * filament.brightness;
      alphas.push(storedAlpha, storedAlpha);

      densities.push(i / segCount, (i + 1) / segCount);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('alpha',    new THREE.BufferAttribute(new Float32Array(alphas), 1));
  geometry.setAttribute('density',  new THREE.BufferAttribute(new Float32Array(densities), 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      colorA: { value: new THREE.Color(palette.colorA) },
      colorB: { value: new THREE.Color(palette.colorB) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.LineSegments(geometry, material);
}

export function updateFilamentPalette(lineSegments, palette, paletteKey) {
  const uniforms = lineSegments.material.uniforms;
  uniforms.colorA.value.set(palette.colorA);
  uniforms.colorB.value.set(palette.colorB);
}
