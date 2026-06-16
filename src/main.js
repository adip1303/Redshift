import * as THREE from 'three';
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

const canvas = document.getElementById('canvas');

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
