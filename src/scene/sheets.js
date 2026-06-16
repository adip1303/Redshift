import * as THREE from 'three';

const vertexShader = /* glsl */`
  attribute float alpha;

  uniform float pointSize;

  varying float vAlpha;

  void main() {
    vAlpha = alpha;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = pointSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  uniform vec3 sheetColor;

  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    if (dist > 0.5) discard;

    float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
    float opacity = vAlpha * falloff * 0.12;
    vec3 color = sheetColor * vAlpha * falloff;

    gl_FragColor = vec4(color, opacity);
  }
`;

export function createSheets(sheetData, palette) {
  const positions = [];
  const alphas = [];

  for (const point of sheetData) {
    positions.push(point.x, point.y, point.z);
    alphas.push(point.alpha);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(alphas), 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      sheetColor: { value: new THREE.Color(palette.sheetColor) },
      pointSize: { value: 3.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

export function updateSheetPalette(points, palette) {
  points.material.uniforms.sheetColor.value.set(palette.sheetColor);
}
