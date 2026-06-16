import * as THREE from 'three';

const vertexShader = /* glsl */`
  attribute float instancePhase;
  uniform float haloSize;
  varying float vPhase;
  void main() {
    vPhase = instancePhase;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = haloSize * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  uniform sampler2D haloTexture;
  uniform vec3 baseColor;
  uniform float time;
  varying float vPhase;
  float breatheValue(float t) {
    float cycle = 3.5;
    float p = mod(t, cycle);
    
    float brightness;
    
    if (p < 0.3) {
      brightness = 0.6 + 0.4 * (p / 0.3);
    } else if (p < 1.3) {
      brightness = 1.0;
    } else if (p < 2.1) {
      float t2 = (p - 1.3) / 0.8;
      brightness = exp(-5.0 * t2);
    } else if (p < 2.8) {
      brightness = 0.0;
    } else if (p < 3.2) {
      float t2 = (p - 2.8) / 0.4;
      brightness = 0.6 * t2;
    } else {
      brightness = 0.6;
    }
    
    return brightness;
  }
  void main() {
    vec4 tex = texture2D(haloTexture, gl_PointCoord);
    if (tex.a < 0.001) discard;
    float breathe = breatheValue(time * 0.7 + vPhase);
    gl_FragColor = vec4(baseColor * tex.rgb, tex.a * breathe * 1.0);
  }
`;

function createHaloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.2)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.02)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createHalos(nodeData, palette) {
  const positions = [];
  const phases = [];

  for (const node of nodeData) {
    if (node.type === 'supercluster') {
      positions.push(node.position.x, node.position.y, node.position.z);
      phases.push(Math.random() * 6.28);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('instancePhase', new THREE.BufferAttribute(new Float32Array(phases), 1));

  const haloTexture = createHaloTexture();
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      haloTexture: { value: haloTexture },
      baseColor: { value: new THREE.Color('#CC8020') },
      haloSize: { value: 200.0 },
      time: { value: 0.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    alphaTest: 0.001,
  });
  material.color = new THREE.Color('#CC8020');
  material.opacity = 1.0;

  return new THREE.Points(geometry, material);
}

export function updateHaloPalette(points, palette, paletteKey) {
  points.material.color.set('#CC8020');
  points.material.uniforms.baseColor.value.set('#CC8020');
  points.material.opacity = 1.0;
  points.material.uniforms.haloSize.value = 200.0;
}

export function updateHaloTime(points, elapsed) {
  points.material.uniforms.time.value = elapsed;
}
