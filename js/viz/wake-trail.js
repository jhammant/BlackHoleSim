// 3D tapered wake tube with velocity-encoded color

import * as THREE from 'three';
import { DEFAULTS } from '../physics/constants.js';

let wakeMesh;
let wakeMaterial;

export function createWakeTrail(scene, params = {}) {
  const wakeLength = 15; // visual units (scaled from 62 kpc)
  const R0 = params.R_0 || DEFAULTS.R_0;
  const baseRadius = R0 * 0.8;
  const segments = 80;
  const radialSegments = 24;

  const geo = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = t * wakeLength; // wake extends in +z direction behind BH

    // Taper: wider near BH, narrower toward galaxy
    const radius = baseRadius * (1.0 - t * 0.5) * (0.8 + 0.2 * Math.sin(t * 8));

    for (let j = 0; j <= radialSegments; j++) {
      const phi = (j / radialSegments) * Math.PI * 2;
      const x = Math.cos(phi) * radius;
      const y = Math.sin(phi) * radius;

      positions.push(x, y, z);

      // Color: bright cyan near BH → dim violet toward galaxy
      const r = 0.0 + t * 0.3;
      const g = 0.8 * (1 - t * 0.7);
      const b = 1.0 * (1 - t * 0.3);
      colors.push(r, g, b);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + radialSegments + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  wakeMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  wakeMesh = new THREE.Mesh(geo, wakeMaterial);
  scene.add(wakeMesh);

  // Center line glow
  const linePts = [];
  for (let i = 0; i <= segments; i++) {
    linePts.push(new THREE.Vector3(0, 0, (i / segments) * wakeLength));
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  scene.add(line);

  return wakeMesh;
}

export function updateWakeTrail(time) {
  if (!wakeMesh) return;
  // Subtle pulsing
  wakeMaterial.opacity = 0.15 + 0.05 * Math.sin(time * 0.001);
}
