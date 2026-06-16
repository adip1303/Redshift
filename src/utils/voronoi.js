import * as THREE from 'three';

function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function randInSphere(rand, radius) {
  while (true) {
    const xRand = rand();
    const yRand = rand();
    const zRand = rand();
    const x = (xRand * 2 - 1) * radius;
    const y = (yRand * 2 - 1) * radius;
    const z = (zRand * 2 - 1) * radius;
    if (x * x + y * y + z * z <= radius * radius) {
      return new THREE.Vector3(x, y, z);
    }
  }
}

function radialAlpha(point, radius) {
  const d = point.length();
  const cutoff = radius * 0.7;
  if (d <= cutoff) return 1;
  if (d >= radius) return 0;
  return 1 - (d - cutoff) / (radius - cutoff);
}

function jitterPoint(rand, point, amount) {
  return point.clone().add(randInSphere(rand, amount));
}

function nearestNeighbors(nodes, index, count) {
  return nodes
    .map((point, i) => ({
      index: i,
      distanceSq: i === index ? Infinity : point.distanceToSquared(nodes[index]),
    }))
    .sort((a, b) => a.distanceSq - b.distanceSq)
    .slice(0, count)
    .map((item) => item.index);
}

function createFilament(start, end, rand, radius) {
  const axis = new THREE.Vector3().subVectors(end, start);
  const length = axis.length();
  if (length === 0) return null;

  const dir = axis.clone().normalize();
  const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const perp1 = new THREE.Vector3().crossVectors(dir, up).normalize();
  const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();
  const drift = new THREE.Vector2();
  const controlPoints = [jitterPoint(rand, start, 8)];

  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const straightPoint = new THREE.Vector3().lerpVectors(start, end, t);
    const point = straightPoint.clone();
    const displacement = length * 0.14;

    drift.x = drift.x * 0.2 + (rand() * 2 - 1) * displacement;
    drift.y = drift.y * 0.2 + (rand() * 2 - 1) * displacement;
    drift.clampLength(0, displacement);

    point.addScaledVector(perp1, drift.x);
    point.addScaledVector(perp2, drift.y);
    point.lerp(straightPoint, 0.25);
    controlPoints.push(point);
  }

  controlPoints.push(jitterPoint(rand, end, 8));

  const curve = new THREE.CatmullRomCurve3(controlPoints);
  const points = curve.getPoints(24);
  const midAlpha = radialAlpha(points[Math.floor(points.length * 0.5)], radius);
  const brightnessRoll = rand();
  let brightness = 1.0;
  if (brightnessRoll < 0.15) {
    brightness = 2.0;
  } else if (brightnessRoll >= 0.85) {
    brightness = 0.5;
  }

  return { points, alpha: midAlpha, brightness };
}

export function generateCosmicWebData(seed, radius = 500) {
  const rand = makePRNG(seed);

  // --- Nodes ---
  const nodePositions = [];
  for (let i = 0; i < 700; i++) {
    nodePositions.push(randInSphere(rand, radius));
  }

  const nodeBounds = {
    minX: Math.min(...nodePositions.map((point) => point.x)),
    maxX: Math.max(...nodePositions.map((point) => point.x)),
    minY: Math.min(...nodePositions.map((point) => point.y)),
    maxY: Math.max(...nodePositions.map((point) => point.y)),
    minZ: Math.min(...nodePositions.map((point) => point.z)),
    maxZ: Math.max(...nodePositions.map((point) => point.z)),
  };
  console.log('Cosmic Web node bounds', nodeBounds);
  console.warn(`Cosmic Web node bounds minX=${nodeBounds.minX.toFixed(2)} maxX=${nodeBounds.maxX.toFixed(2)} minY=${nodeBounds.minY.toFixed(2)} maxY=${nodeBounds.maxY.toFixed(2)} minZ=${nodeBounds.minZ.toFixed(2)} maxZ=${nodeBounds.maxZ.toFixed(2)}`);

  const baseConnectionPairs = new Map();
  const baseConnectionCounts = new Array(nodePositions.length).fill(0);

  for (let i = 0; i < nodePositions.length; i++) {
    for (const neighborIndex of nearestNeighbors(nodePositions, i, 4)) {
      const a = Math.min(i, neighborIndex);
      const b = Math.max(i, neighborIndex);
      const key = `${a}-${b}`;

      if (!baseConnectionPairs.has(key)) {
        baseConnectionPairs.set(key, [a, b]);
        baseConnectionCounts[a]++;
        baseConnectionCounts[b]++;
      }
    }
  }

  const rankedNodeIndices = baseConnectionCounts
    .map((connections, index) => ({ connections, index }))
    .sort((a, b) => b.connections - a.connections);
  const superclusterCount = Math.ceil(nodePositions.length * 0.09);
  const clusterCount = Math.ceil(nodePositions.length * 0.23);
  const nodeTypes = new Array(nodePositions.length).fill('galaxy');

  for (let i = 0; i < rankedNodeIndices.length; i++) {
    const { index } = rankedNodeIndices[i];
    if (i < superclusterCount) {
      nodeTypes[index] = 'supercluster';
    } else if (i < superclusterCount + clusterCount) {
      nodeTypes[index] = 'cluster';
    }
  }

  for (let i = 0; i < nodePositions.length; i++) {
    if (nodeTypes[i] === 'supercluster') continue;

    const maxJitter = nodeTypes[i] === 'cluster' ? 10 : 25;
    const jitter = randInSphere(rand, 1).normalize().multiplyScalar(rand() * maxJitter);
    nodePositions[i].add(jitter);
  }

  const connectionPairs = new Map();
  const connectionCounts = new Array(nodePositions.length).fill(0);

  for (let i = 0; i < nodePositions.length; i++) {
    const neighborCount = nodeTypes[i] === 'supercluster' ? 7 : nodeTypes[i] === 'cluster' ? 5 : 4;

    for (const neighborIndex of nearestNeighbors(nodePositions, i, neighborCount)) {
      const a = Math.min(i, neighborIndex);
      const b = Math.max(i, neighborIndex);
      const key = `${a}-${b}`;

      if (!connectionPairs.has(key)) {
        connectionPairs.set(key, [a, b]);
        connectionCounts[a]++;
        connectionCounts[b]++;
      }
    }
  }

  const longRangePairs = new Map();
  for (let i = 0; i < nodePositions.length; i++) {
    const candidates = nodePositions
      .map((point, index) => ({
        index,
        distance: index === i ? Infinity : point.distanceTo(nodePositions[i]),
      }))
      .filter(({ index, distance }) => {
        const a = Math.min(i, index);
        const b = Math.max(i, index);
        return distance <= 250 && !connectionPairs.has(`${a}-${b}`);
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    for (const { index } of candidates) {
      const a = Math.min(i, index);
      const b = Math.max(i, index);
      const key = `${a}-${b}`;

      if (!longRangePairs.has(key)) {
        longRangePairs.set(key, [a, b]);
        connectionCounts[a]++;
        connectionCounts[b]++;
      }
    }
  }

  // --- Filaments ---
  const filaments = [];
  for (const [a, b] of connectionPairs.values()) {
    const filamentCount = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < filamentCount; i++) {
      const filament = createFilament(nodePositions[a], nodePositions[b], rand, radius);
      if (filament) filaments.push(filament);
    }
  }

  for (const [a, b] of longRangePairs.values()) {
    const filamentCount = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < filamentCount; i++) {
      const filament = createFilament(nodePositions[a], nodePositions[b], rand, radius);
      if (filament) filaments.push(filament);
    }
  }

  const nodes = nodePositions.map((position, i) => ({
    position,
    type: nodeTypes[i],
    alpha: radialAlpha(position, radius),
    connections: connectionCounts[i],
  }));

  // Average spacing estimate
  const avgSpacing = radius * 2 / Math.cbrt(nodePositions.length);
  const linkThreshold = avgSpacing * 2.5;

  // --- Sheets ---
  const voids = nodePositions;
  const sheets = [];
  for (let vi = 0; vi < voids.length; vi++) {
    const vo = voids[vi];

    // Find neighboring void centers
    const neighbors = [];
    for (let vj = 0; vj < voids.length; vj++) {
      if (vj === vi) continue;
      if (vo.distanceTo(voids[vj]) <= linkThreshold) {
        neighbors.push(voids[vj]);
      }
    }
    if (neighbors.length === 0) continue;

    for (let s = 0; s < 80; s++) {
      const nb = neighbors[Math.floor(rand() * neighbors.length)];
      const t = 0.4 + rand() * 0.2; // near midpoint
      const p = new THREE.Vector3().lerpVectors(vo, nb, t);
      // Small random scatter on the surface
      p.x += (rand() * 2 - 1) * avgSpacing * 0.15;
      p.y += (rand() * 2 - 1) * avgSpacing * 0.15;
      p.z += (rand() * 2 - 1) * avgSpacing * 0.15;
      const a = radialAlpha(p, radius);
      if (a > 0) {
        const sp = p.clone();
        sp.alpha = a;
        sheets.push(sp);
      }
    }
  }

  return { filaments, nodes, sheets };
}
