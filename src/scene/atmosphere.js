import * as THREE from 'three';

const BASE_OPACITY = 0.15;

function randomInSphere(radius) {
  while (true) {
    const x = (Math.random() * 2 - 1) * radius;
    const y = (Math.random() * 2 - 1) * radius;
    const z = (Math.random() * 2 - 1) * radius;
    if (x * x + y * y + z * z <= radius * radius) {
      return new THREE.Vector3(x, y, z);
    }
  }
}

export function createAtmosphere(webData, palette, paletteKey) {
  const positions = [];
  const alphas = [];
  const particlePositions = [];
  const nodePositions = webData.nodes.map((node) => node.position);

  for (const filament of webData.filaments) {
    for (let i = 0; i < filament.points.length; i += 3) {
      const sample = filament.points[i];
      for (let p = 0; p < 5; p++) {
        const offset = randomInSphere(10);
        const alpha = 0.06 * (1.0 - offset.length() / 10.0) * filament.alpha;
        const position = sample.clone().add(offset);
        particlePositions.push(position);
        alphas.push(alpha);
      }
    }
  }

  for (const node of webData.nodes) {
    const scatterCount = node.type === 'supercluster' ? 45 : node.type === 'cluster' ? 20 : 7;
    const scatterRadius = node.type === 'supercluster' ? 60 : node.type === 'cluster' ? 35 : 18;
    const alphaMultiplier = node.type === 'supercluster' ? 1.8 : node.type === 'cluster' ? 1.2 : 0.7;
    for (let p = 0; p < scatterCount; p++) {
      const offset = randomInSphere(scatterRadius);
      const alpha = 0.09 * (1.0 - offset.length() / scatterRadius) * alphaMultiplier;
      const position = node.position.clone().add(offset);
      particlePositions.push(position);
      alphas.push(alpha);
    }
  }

  for (let i = 0; i < 150; i++) {
    const filament = webData.filaments[Math.floor(Math.random() * webData.filaments.length)];
    const center = filament.points[Math.floor(Math.random() * filament.points.length)];
    for (let p = 0; p < 6; p++) {
      const offset = randomInSphere(12);
      const alpha = 0.05 * (1.0 - offset.length() / 12.0) * filament.alpha;
      const position = center.clone().add(offset);
      particlePositions.push(position);
      alphas.push(alpha);
    }
  }

  for (let i = 0; i < particlePositions.length; i++) {
    const position = particlePositions[i];
    let nearestNodeDistance = Infinity;
    for (const nodePosition of nodePositions) {
      nearestNodeDistance = Math.min(nearestNodeDistance, position.distanceTo(nodePosition));
    }
    const densityMultiplier = nearestNodeDistance < 60 ? 1.0 : nearestNodeDistance < 150 ? 0.6 : 0.3;
    alphas[i] *= densityMultiplier;
    positions.push(position.x, position.y, position.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('particleAlpha', new THREE.BufferAttribute(new Float32Array(alphas), 1));

  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.15, 'rgba(255,255,255,0.4)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.03)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const fogTexture = new THREE.CanvasTexture(canvas);

  const material = new THREE.PointsMaterial({
    color: palette.fogColor,
    size: 18.0,
    map: fogTexture,
    transparent: true,
    opacity: BASE_OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    alphaMap: fogTexture,
    alphaTest: 0.001,
  });

  return new THREE.Points(geometry, material);
}

export function updateAtmospherePalette(points, palette, paletteKey) {
  points.material.color.copy(palette.fogColor);
}
