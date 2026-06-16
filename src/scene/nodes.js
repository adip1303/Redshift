import * as THREE from 'three';

const vertexShader = /* glsl */`
  attribute float nodeSize;
  attribute float nodeAlpha;
  attribute float nodeTier;
  varying float vAlpha;
  varying float vTier;
  varying vec3 vPosition;
  void main() {
    vAlpha = nodeAlpha;
    vTier = nodeTier;
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = nodeSize * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */`
  uniform sampler2D nodeTexture;
  uniform float nodeOpacity;
  uniform float time;
  varying float vAlpha;
  varying float vTier;
  varying vec3 vPosition;
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
    vec4 tex = texture2D(nodeTexture, gl_PointCoord);
    vec3 nodeColor = vec3(0.32, 0.32, 0.42);
    if (vTier > 1.5) {
      nodeColor = vec3(0.28, 0.16, 0.03);
    } else if (vTier > 0.5) {
      nodeColor = vec3(0.24, 0.18, 0.06);
    }
    float breathe = breatheValue(time * 0.7 + vPosition.x * 0.008);
    gl_FragColor = vec4(nodeColor * tex.rgb * breathe, tex.a * vAlpha * nodeOpacity);
  }
`;

function createNodeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export function createNodes(nodeData, palette) {
  const positions = [];
  const nodeSizes = [];
  const nodeAlphas = [];
  const nodeTiers = [];

  for (const node of nodeData) {
    let minSize = 14.0;
    let maxSize = 22.0;

    if (node.type === 'supercluster') {
      minSize = 45.0;
      maxSize = 70.0;
    } else if (node.type === 'cluster') {
      minSize = 28.0;
      maxSize = 46.0;
    }

    const baseSize = minSize + Math.random() * (maxSize - minSize);
    const jitter = 1.0 + (Math.random() * 0.3 - 0.15);
    const size = baseSize * jitter;

    positions.push(node.position.x, node.position.y, node.position.z);
    nodeSizes.push(size);
    nodeAlphas.push(node.alpha);
    nodeTiers.push(node.type === 'supercluster' ? 2 : node.type === 'cluster' ? 1 : 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('nodeSize', new THREE.BufferAttribute(new Float32Array(nodeSizes), 1));
  geometry.setAttribute('nodeAlpha', new THREE.BufferAttribute(new Float32Array(nodeAlphas), 1));
  geometry.setAttribute('nodeTier', new THREE.BufferAttribute(new Float32Array(nodeTiers), 1));

  const nodeTexture = createNodeTexture();
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      nodeTexture: { value: nodeTexture },
      nodeOpacity: { value: 0.3 },
      time: { value: 0.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'galaxyPoints';
  return points;
}

export function updateNodePalette() {
}

export function updateNodeTime(points, elapsed) {
  points.material.uniforms.time.value = elapsed;
}
