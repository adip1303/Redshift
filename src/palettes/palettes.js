import * as THREE from 'three';

export const PALETTES = {
  darkMatter: {
    name: 'Dark Matter',
    colorA: new THREE.Color('#0d0221'),
    colorB: new THREE.Color('#7b2fff'),
    nodeColor: new THREE.Color('#b388ff'),
    clusterColor: new THREE.Color('#ea80fc'),
    sheetColor: new THREE.Color('#1a0533'),
    fogColor: new THREE.Color('#2D1654'),
    description: 'Dark matter density — gravitational lensing maps',
  },
  cmb: {
    name: 'CMB',
    colorA: new THREE.Color('#000d1a'),
    colorB: new THREE.Color('#b71c1c'),
    nodeColor: new THREE.Color('#ef9a9a'),
    clusterColor: new THREE.Color('#ff1744'),
    sheetColor: new THREE.Color('#00101f'),
    fogColor: new THREE.Color('#3D1010'),
    description: 'Temperature anisotropy — cosmic microwave background',
  },
  infrared: {
    name: 'Infrared',
    colorA: new THREE.Color('#1a0a00'),
    colorB: new THREE.Color('#ff8f00'),
    nodeColor: new THREE.Color('#ffcc80'),
    clusterColor: new THREE.Color('#ffab40'),
    sheetColor: new THREE.Color('#251200'),
    fogColor: new THREE.Color('#542E10'),
    description: 'Thermal infrared — James Webb Space Telescope',
  },
};

export const DEFAULT_PALETTE = 'darkMatter';
