import * as THREE from 'three';
import { inject } from '@vercel/analytics';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { generateCosmicWebData } from './utils/voronoi.js';
import { createFilaments, updateFilamentPalette } from './scene/filaments.js';
import {
  createParticleFlow,
  updateParticles,
  updateParticlePalette,
  setParticleSize,
  setParticleSpeed,
  setParticleCount,
} from './scene/particles.js';
import { createNodes, updateNodePalette, updateNodeTime } from './scene/nodes.js';
import { createHalos, updateHaloPalette, updateHaloTime } from './scene/halos.js';
import { createSheets, updateSheetPalette } from './scene/sheets.js';
import { createAtmosphere, updateAtmospherePalette } from './scene/atmosphere.js';
import { PALETTES, DEFAULT_PALETTE } from './palettes/palettes.js';
import { initControls } from './ui/controls.js';

inject();

const canvas = document.getElementById('canvas');
const infoToggle = document.getElementById('info-toggle');
const infoOverlay = document.getElementById('info-overlay');
const infoClose = document.getElementById('info-close');
const infoContent = document.getElementById('info-content');
infoContent.innerHTML = `
  <h1>Redshift</h1>
  <p class="tagline">An interactive 3D visualization of the cosmic web — the largest known structure in the universe, where galaxies, clusters, and superclusters are strung together by filaments of dark matter spanning hundreds of millions of light-years, separated by vast empty voids.</p>

  <h2>What is the cosmic web?</h2>
  <p>On the largest scales, matter in the universe isn't distributed randomly or evenly. Gravity has spent over 13 billion years pulling matter into a web-like architecture: dense knots where galaxies cluster, connected by thinner filaments of gas and dark matter, surrounded by enormous voids that are nearly empty. This structure is the cosmic web — sometimes called the "large-scale structure" of the universe.</p>
  <p>The web didn't form by accident. In the very early universe, the cosmic microwave background shows tiny density fluctuations — regions only slightly denser than their surroundings, by about one part in 100,000. Gravity amplified those tiny differences over billions of years. The result is the foam-like, filamentary structure cosmologists observe today.</p>
  <p>Cosmologists formally classify this structure into four components — voids, sheets, filaments, and nodes — known as the T-web classification. This visualization represents all four.</p>

  <h2>What is redshift?</h2>
  <p>Redshift is how astronomers measure both distance and motion across the universe. As the universe expands, light traveling from distant galaxies gets stretched — its wavelength increases, shifting it toward the red end of the spectrum. The further away a galaxy is, the higher its redshift.</p>
  <p>Redshift surveys are how the cosmic web was actually discovered and mapped. By converting redshift into distance, astronomers can plot the 3D positions of galaxies across the observable universe. Surveys like the Sloan Digital Sky Survey (SDSS) produced the datasets that first revealed this structure clearly.</p>

  <h2>What you're actually looking at</h2>
  <p><strong>Filaments</strong> — the glowing threads represent the dark matter and gas filaments that form the skeleton of the cosmic web. Dark matter, which makes up roughly 85% of all matter in the universe, doesn't interact with light, so it's invisible directly. But its gravity sculpts the visible matter into the same filamentary shape.</p>
  <p><strong>Nodes</strong> — the bright points mark galaxy clusters and superclusters, the densest regions of the cosmic web, sitting at the intersections of multiple filaments. A single node here could represent thousands of individual galaxies. The brightest, largest nodes — rendered with a warm glow halo — represent superclusters, the largest gravitationally associated structures in the universe.</p>
  <p><strong>Fog</strong> — the subtle haze near filaments and nodes represents the warm-hot intergalactic medium: extremely diffuse gas that exists between galaxies, tracing the same filamentary structure as dark matter but at far lower density.</p>
  <p><strong>Particles</strong> — the flowing particles represent matter actively flowing along filaments toward gravitational overdensities, exactly as gas and dark matter do in reality. Nothing in the cosmic web is static.</p>
  <p><strong>Voids</strong> — the dark regions between filaments aren't just empty backdrop, they're voids, and they make up the overwhelming majority of the universe's volume. Voids are sparse but not perfectly empty.</p>

  <h2>Why "generate new web" exists</h2>
  <p>The cosmic web you can observe is just one particular arrangement of structure out of an effectively unlimited number of arrangements that could exist. The universe is, as far as we can tell, vastly larger than the observable portion we can ever measure, and statistically, structures similar to but distinct from our own cosmic web almost certainly exist elsewhere.</p>
  <p>This visualization is procedurally generated rather than built from a single fixed dataset, specifically to reflect that idea. Each seed produces a structurally valid, scientifically consistent cosmic web — but a different one. There's no single "correct" cosmic web to render; there are infinite plausible ones, and clicking "New Web" generates another one of them.</p>
`;
infoToggle.addEventListener('click', () => infoOverlay.classList.add('active'));
infoClose.addEventListener('click', () => infoOverlay.classList.remove('active'));
infoOverlay.addEventListener('click', (e) => {
  if (e.target === infoOverlay) infoOverlay.classList.remove('active');
});

export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 1140;

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#0A0A0A');

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.5, 0.2);
composer.addPass(bloomPass);

const gradientTexture = new THREE.TextureLoader().load('/image-mesh-gradient.png');
const gradientPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    gradientMap: { value: gradientTexture },
    gradientStrength: { value: 0.4 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D gradientMap;
    uniform float gradientStrength;
    varying vec2 vUv;
    void main() {
      vec4 scene = texture2D(tDiffuse, vUv);
      vec4 grad = texture2D(gradientMap, vUv);
      vec3 blended = scene.rgb + grad.rgb * scene.rgb * gradientStrength;
      gl_FragColor = vec4(blended, scene.a);
    }
  `,
});
gradientPass.enabled = false;
composer.addPass(gradientPass);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 50;
controls.maxDistance = 1400;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;

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

function createStarField() {
  const positions = [];

  for (let i = 0; i < 6000; i++) {
    const position = randomInSphere(480);
    positions.push(position.x, position.y, position.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));

  const starCanvas = document.createElement('canvas');
  starCanvas.width = 32; starCanvas.height = 32;
  const starCtx = starCanvas.getContext('2d');
  const starGrad = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  starGrad.addColorStop(0, 'rgba(255,255,255,1.0)');
  starGrad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  starGrad.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  starGrad.addColorStop(1.0, 'rgba(255,255,255,0)');
  starCtx.fillStyle = starGrad;
  starCtx.fillRect(0, 0, 32, 32);
  const starTexture = new THREE.CanvasTexture(starCanvas);

  const material = new THREE.PointsMaterial({
    color: new THREE.Color('#aabbdd'),
    size: 4.8,
    map: starTexture,
    alphaMap: starTexture,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.0001,
  });

  return new THREE.Points(geometry, material);
}

const clock = new THREE.Clock();
const generationStart = performance.now();
let cosmicWebData = generateCosmicWebData(42, 500);
let generationTimeMs = performance.now() - generationStart;
let activePaletteKey = DEFAULT_PALETTE;
let activePalette = PALETTES[activePaletteKey];
let particleMinSize = 1.5;
let particleMaxSize = 4.0;
let particleSpeed = 1.0;
let particleCount = 5000;

const stars = createStarField();
scene.add(stars);

let filaments = createFilaments(cosmicWebData.filaments, activePalette);
let particles = createParticleFlow(cosmicWebData.filaments, cosmicWebData.nodes, activePalette);
let nodes = createNodes(cosmicWebData.nodes, activePalette);
let halos = createHalos(cosmicWebData.nodes, activePalette);
let sheets = createSheets(cosmicWebData.sheets, activePalette);
let atmosphere = createAtmosphere(cosmicWebData, activePalette, activePaletteKey);

updateAtmospherePalette(atmosphere, activePalette, activePaletteKey);
scene.add(filaments, particles, nodes, halos, sheets, atmosphere);

initControls({
  palettes: PALETTES,
  defaultPalette: DEFAULT_PALETTE,
  currentSeed: 42,
  gradientPass,
  onPaletteChange(paletteKey) {
    activePaletteKey = paletteKey;
    activePalette = PALETTES[activePaletteKey];
    updateFilamentPalette(filaments, activePalette, activePaletteKey);
    updateNodePalette(nodes, activePalette, activePaletteKey);
    updateParticlePalette(particles, activePalette, activePaletteKey);
    updateHaloPalette(halos, activePalette, activePaletteKey);
    updateSheetPalette(sheets, activePalette, activePaletteKey);
    updateAtmospherePalette(atmosphere, activePalette, activePaletteKey);
  },
  onSeedChange(newSeed) {
    const generationStart = performance.now();
    cosmicWebData = generateCosmicWebData(newSeed, 500);
    generationTimeMs = performance.now() - generationStart;

    scene.remove(filaments, particles, nodes, halos, sheets, atmosphere);

    filaments = createFilaments(cosmicWebData.filaments, activePalette);
    particles = createParticleFlow(cosmicWebData.filaments, cosmicWebData.nodes, activePalette);
    nodes = createNodes(cosmicWebData.nodes, activePalette);
    halos = createHalos(cosmicWebData.nodes, activePalette);
    sheets = createSheets(cosmicWebData.sheets, activePalette);
    atmosphere = createAtmosphere(cosmicWebData, activePalette, activePaletteKey);

    updateFilamentPalette(filaments, activePalette, activePaletteKey);
    updateNodePalette(nodes, activePalette, activePaletteKey);
    setParticleSize(particles, particleMinSize, particleMaxSize);
    setParticleSpeed(particles, particleSpeed);
    setParticleCount(particles, cosmicWebData.filaments, cosmicWebData.nodes, activePalette, particleCount);
    updateParticlePalette(particles, activePalette, activePaletteKey);
    updateHaloPalette(halos, activePalette, activePaletteKey);
    updateSheetPalette(sheets, activePalette, activePaletteKey);
    updateAtmospherePalette(atmosphere, activePalette, activePaletteKey);

    scene.add(filaments, particles, nodes, halos, sheets, atmosphere);
  },
  onParticleSizeChange(min, max) {
    particleMinSize = min;
    particleMaxSize = max;
    setParticleSize(particles, particleMinSize, particleMaxSize);
  },
  onParticleSpeedChange(speed) {
    particleSpeed = speed;
    setParticleSpeed(particles, particleSpeed);
  },
  onParticleCountChange(count) {
    particleCount = count;
    setParticleCount(particles, cosmicWebData.filaments, cosmicWebData.nodes, activePalette, particleCount);
    updateParticlePalette(particles, activePalette, activePaletteKey);
  },
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  controls.update();
  updateParticles(particles, delta, elapsed);
  updateNodeTime(nodes, elapsed);
  updateHaloTime(halos, elapsed);
  composer.render();
}

animate();
