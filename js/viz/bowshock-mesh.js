// Parametric Wilkin bow shock surface mesh

import * as THREE from 'three';
import { wilkinR } from '../physics/bowshock.js';
import { DEFAULTS } from '../physics/constants.js';

let shockMesh;
let shockMaterial;

export function createBowShockMesh(scene, R0 = DEFAULTS.R_0) {
  const geo = buildWilkinGeometry(R0);

  shockMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.35 },
      uColorApex: { value: new THREE.Color(0x00ccff) },
      uColorFlank: { value: new THREE.Color(0x8844ff) },
    },
    vertexShader: `
      attribute float theta;
      varying float vTheta;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vTheta = theta;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColorApex;
      uniform vec3 uColorFlank;
      varying float vTheta;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        // Mix color from apex (theta=0) to flank (theta=pi)
        float t = vTheta / 3.14159;
        vec3 color = mix(uColorApex, uColorFlank, t);

        // Fresnel-like edge glow
        vec3 viewDir = normalize(-vPosition);
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        fresnel = pow(fresnel, 1.5);

        float alpha = uOpacity * (0.3 + 0.7 * fresnel);
        // Subtle animation
        alpha *= 0.85 + 0.15 * sin(uTime * 1.5 + vTheta * 3.0);

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  shockMesh = new THREE.Mesh(geo, shockMaterial);
  scene.add(shockMesh);

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
  });
  const wireMesh = new THREE.Mesh(geo, wireMat);
  scene.add(wireMesh);

  return shockMesh;
}

function buildWilkinGeometry(R0, nTheta = 60, nPhi = 48) {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const thetas = [];
  const indices = [];

  for (let i = 0; i <= nTheta; i++) {
    const theta = 0.01 + (Math.PI * 0.85) * i / nTheta;
    const R = wilkinR(theta, R0);

    for (let j = 0; j <= nPhi; j++) {
      const phi = 2 * Math.PI * j / nPhi;

      const x = R * Math.sin(theta) * Math.cos(phi);
      const y = R * Math.sin(theta) * Math.sin(phi);
      const z = -R * Math.cos(theta); // apex at z=-R0, opens toward -z

      positions.push(x, y, z);
      thetas.push(theta);

      // Approximate outward normal
      const nx = Math.sin(theta) * Math.cos(phi);
      const ny = Math.sin(theta) * Math.sin(phi);
      const nz = -Math.cos(theta);
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
    }
  }

  for (let i = 0; i < nTheta; i++) {
    for (let j = 0; j < nPhi; j++) {
      const a = i * (nPhi + 1) + j;
      const b = a + nPhi + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('theta', new THREE.Float32BufferAttribute(thetas, 1));
  geo.setIndex(indices);

  return geo;
}

export function updateBowShockMesh(time, R0) {
  if (!shockMesh) return;
  if (shockMaterial) {
    shockMaterial.uniforms.uTime.value = time * 0.001;
  }
}

export function rebuildBowShock(scene, R0) {
  if (shockMesh) {
    const oldGeo = shockMesh.geometry;
    shockMesh.geometry = buildWilkinGeometry(R0);
    oldGeo.dispose();
  }
}
