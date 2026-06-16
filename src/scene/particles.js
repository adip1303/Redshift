import * as THREE from 'three';

const filamentVertexShader = /* glsl */`
  attribute float particleOpacity;
  attribute float particleSize;
  uniform float minSize;
  uniform float maxSize;
  varying float vOpacity;
  void main() {
    vOpacity = particleOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = mix(minSize, maxSize, particleSize) * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const filamentFragmentShader = /* glsl */`
  uniform sampler2D particleTexture;
  uniform vec3 paletteColor;
  varying float vOpacity;
  void main() {
    vec4 tex = texture2D(particleTexture, gl_PointCoord);
    vec3 color = mix(paletteColor, vec3(1.0), 0.3);
    if (tex.a < 0.05) discard;
    gl_FragColor = vec4(color * tex.rgb, tex.a * vOpacity * 0.9);
  }
`;

const nodeVertexShader = /* glsl */`
  attribute float particleOpacity;
  attribute float particleSize;
  varying float vOpacity;
  void main() {
    vOpacity = particleOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = particleSize * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const nodeFragmentShader = /* glsl */`
  uniform sampler2D particleTexture;
  uniform vec3 paletteColor;
  varying float vOpacity;
  void main() {
    vec4 tex = texture2D(particleTexture, gl_PointCoord);
    vec3 color = mix(paletteColor, vec3(1.0), 0.6);
    if (tex.a < 0.05) discard;
    gl_FragColor = vec4(color * tex.rgb, tex.a * vOpacity * 0.7);
  }
`;

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1.0)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

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

function sampleFilament(points, progress, target) {
  const scaled = progress * (points.length - 1);
  const index = Math.min(Math.floor(scaled), points.length - 2);
  const localT = scaled - index;
  target.lerpVectors(points[index], points[index + 1], localT);
}

function particleFade(progress) {
  if (progress < 0.2) return progress / 0.2;
  if (progress > 0.8) return (1.0 - progress) / 0.2;
  return 1.0;
}

function createMaterial(vertexShader, fragmentShader, particleTexture, palette) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      particleTexture: { value: particleTexture },
      paletteColor: { value: new THREE.Color(palette.colorB) },
      minSize: { value: 1.5 },
      maxSize: { value: 4.0 },
      speedMultiplier: { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    alphaTest: 0.001,
  });
}

function createFilamentParticles(filamentData, particleTexture, palette, count = 3000, minSize = 1.5, maxSize = 4.0, speedMultiplier = 1.0) {
  const particles = [];
  const selectedFilaments = filamentData.filter(() => Math.random() <= 0.8);
  const sourceFilaments = selectedFilaments.length > 0 ? selectedFilaments : filamentData;
  const activeFilaments = sourceFilaments.slice(0, Math.min(sourceFilaments.length, count));
  const particlesPerFilament = Math.floor(count / activeFilaments.length);
  const extraParticles = count - particlesPerFilament * activeFilaments.length;

  for (let filamentIndex = 0; filamentIndex < activeFilaments.length; filamentIndex++) {
    const filament = activeFilaments[filamentIndex];
    const filamentParticleCount = particlesPerFilament + (filamentIndex < extraParticles ? 1 : 0);
    for (let i = 0; i < filamentParticleCount; i++) {
      particles.push({
        filamentPoints: filament.points,
        progress: Math.random(),
        speed: 0.0004 + Math.random() * 0.0005,
        particleSize: Math.random(),
      });
    }
  }

  const positions = new Float32Array(particles.length * 3);
  const opacities = new Float32Array(particles.length);
  const particleSizes = new Float32Array(particles.length);
  const temp = new THREE.Vector3();

  for (let i = 0; i < particles.length; i++) {
    sampleFilament(particles[i].filamentPoints, particles[i].progress, temp);
    positions[i * 3] = temp.x;
    positions[i * 3 + 1] = temp.y;
    positions[i * 3 + 2] = temp.z;
    opacities[i] = particleFade(particles[i].progress);
    particleSizes[i] = particles[i].particleSize;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('particleOpacity', new THREE.BufferAttribute(opacities, 1));
  geometry.setAttribute('particleSize', new THREE.BufferAttribute(particleSizes, 1));

  const material = createMaterial(filamentVertexShader, filamentFragmentShader, particleTexture, palette);
  material.uniforms.minSize.value = minSize;
  material.uniforms.maxSize.value = maxSize;
  material.uniforms.speedMultiplier.value = speedMultiplier;
  const points = new THREE.Points(
    geometry,
    material
  );
  points.userData.particles = particles;
  points.name = 'filamentParticles';
  return points;
}

function createNodeParticles(nodeData, particleTexture, palette) {
  const particles = [];

  for (const node of nodeData) {
    const count = node.type === 'supercluster' ? 38 : node.type === 'cluster' ? 15 : 4;
    const radius = node.type === 'supercluster' ? 45 : node.type === 'cluster' ? 25 : 12;
    const size = node.type === 'supercluster' ? 10.0 : node.type === 'cluster' ? 7.0 : 5.0;

    for (let i = 0; i < count; i++) {
      const offset = randomInSphere(radius);
      const orbitRadius = offset.length();
      const u = orbitRadius > 0 ? offset.clone().normalize() : randomInSphere(1).normalize();
      const helper = Math.abs(u.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const v = new THREE.Vector3().crossVectors(u, helper).normalize();
      particles.push({
        center: node.position,
        position: node.position.clone().add(offset),
        radius,
        baseX: offset.x,
        baseY: offset.y,
        baseZ: offset.z,
        u,
        v,
        orbitRadius,
        orbitSpeed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        size,
      });
    }
  }

  const positions = new Float32Array(particles.length * 3);
  const opacities = new Float32Array(particles.length);
  const sizes = new Float32Array(particles.length);

  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    positions[i * 3] = particle.position.x;
    positions[i * 3 + 1] = particle.position.y;
    positions[i * 3 + 2] = particle.position.z;
    opacities[i] = 0.5 + 0.4 * Math.sin(particle.phase);
    sizes[i] = particle.size;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('particleOpacity', new THREE.BufferAttribute(opacities, 1));
  geometry.setAttribute('particleSize', new THREE.BufferAttribute(sizes, 1));

  const points = new THREE.Points(
    geometry,
    createMaterial(nodeVertexShader, nodeFragmentShader, particleTexture, palette)
  );
  points.userData.particles = particles;
  points.name = 'nodeParticles';
  return points;
}

export function createParticleFlow(filamentData, nodeData, palette) {
  const particleTexture = createParticleTexture();
  const group = new THREE.Group();
  group.name = 'particleFlow';
  group.userData.filamentData = filamentData;
  group.userData.nodeData = nodeData;
  group.userData.palette = palette;
  group.userData.particleTexture = particleTexture;
  group.userData.particleCount = 3000;
  group.userData.minParticleSize = 1.5;
  group.userData.maxParticleSize = 4.0;
  group.userData.speedMultiplier = 1.0;

  group.add(
    createFilamentParticles(filamentData, particleTexture, palette),
    createNodeParticles(nodeData, particleTexture, palette)
  );

  return group;
}

export function updateParticles(group, delta, elapsed) {
  const filamentPoints = group.getObjectByName('filamentParticles');
  const speedMult = filamentPoints.material.uniforms.speedMultiplier.value;
  const filamentParticles = filamentPoints.userData.particles;
  const filamentPositions = filamentPoints.geometry.attributes.position.array;
  const filamentOpacities = filamentPoints.geometry.attributes.particleOpacity.array;
  const pos = new THREE.Vector3();

  for (let i = 0; i < filamentParticles.length; i++) {
    const particle = filamentParticles[i];
    particle.progress += particle.speed * speedMult * delta * 60;

    if (particle.progress > 1.0) {
      particle.progress = 0.0;
      particle.speed = 0.0004 + Math.random() * 0.0005;
    }

    const points = particle.filamentPoints;
    const totalSegments = points.length - 1;
    const scaledProgress = particle.progress * totalSegments;
    const segIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
    const segFraction = scaledProgress - segIndex;
    const pA = points[segIndex];
    const pB = points[segIndex + 1];
    pos.x = pA.x + (pB.x - pA.x) * segFraction;
    pos.y = pA.y + (pB.y - pA.y) * segFraction;
    pos.z = pA.z + (pB.z - pA.z) * segFraction;
    filamentPositions[i * 3] = pos.x;
    filamentPositions[i * 3 + 1] = pos.y;
    filamentPositions[i * 3 + 2] = pos.z;
    filamentOpacities[i] = particleFade(particle.progress);
  }

  filamentPoints.geometry.attributes.position.needsUpdate = true;
  filamentPoints.geometry.attributes.particleOpacity.needsUpdate = true;

  const nodePoints = group.getObjectByName('nodeParticles');
  const nodeParticles = nodePoints.userData.particles;
  const nodePositions = nodePoints.geometry.attributes.position.array;
  const nodeOpacities = nodePoints.geometry.attributes.particleOpacity.array;

  for (let i = 0; i < nodeParticles.length; i++) {
    const particle = nodeParticles[i];
    const angle = elapsed * particle.orbitSpeed + particle.phase;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = particle.center.x + particle.u.x * cos * particle.orbitRadius + particle.v.x * sin * particle.orbitRadius;
    const y = particle.center.y + particle.u.y * cos * particle.orbitRadius + particle.v.y * sin * particle.orbitRadius;
    const z = particle.center.z + particle.u.z * cos * particle.orbitRadius + particle.v.z * sin * particle.orbitRadius;

    nodePositions[i * 3] = x;
    nodePositions[i * 3 + 1] = y;
    nodePositions[i * 3 + 2] = z;
    nodeOpacities[i] = 0.5 + 0.4 * Math.sin(elapsed * particle.orbitSpeed * 2.0 + particle.phase);
  }

  nodePoints.geometry.attributes.position.needsUpdate = true;
  nodePoints.geometry.attributes.particleOpacity.needsUpdate = true;
}

export function updateParticlePalette(group, palette, paletteKey) {
  group.userData.palette = palette;
  for (const child of group.children) {
    child.material.uniforms.paletteColor.value.copy(palette.colorB);
  }
}

export function setParticleSize(group, min, max) {
  group.userData.minParticleSize = min;
  group.userData.maxParticleSize = max;
  const filamentPoints = group.getObjectByName('filamentParticles');
  filamentPoints.material.uniforms.minSize.value = min;
  filamentPoints.material.uniforms.maxSize.value = max;
}

export function setParticleSpeed(group, multiplier) {
  group.userData.speedMultiplier = multiplier;
  const filamentPoints = group.getObjectByName('filamentParticles');
  filamentPoints.material.uniforms.speedMultiplier.value = multiplier;
}

export function setParticleCount(group, filamentData, nodeData, palette, count) {
  const oldFilamentPoints = group.getObjectByName('filamentParticles');
  group.remove(oldFilamentPoints);
  oldFilamentPoints.geometry.dispose();
  oldFilamentPoints.material.dispose();

  group.userData.filamentData = filamentData;
  group.userData.nodeData = nodeData;
  group.userData.palette = palette;
  group.userData.particleCount = count;

  const filamentPoints = createFilamentParticles(
    filamentData,
    group.userData.particleTexture,
    palette,
    count,
    group.userData.minParticleSize,
    group.userData.maxParticleSize,
    group.userData.speedMultiplier
  );
  group.add(filamentPoints);
}
