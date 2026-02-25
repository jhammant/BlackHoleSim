// SMBH visual object — black sphere + accretion glow + lensing halo

import * as THREE from 'three';

let smbhGroup;
let glowRing, haloMesh;

export function createSMBH(scene) {
  smbhGroup = new THREE.Group();

  // Black hole sphere
  const bhGeo = new THREE.SphereGeometry(0.12, 32, 32);
  const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bhMesh = new THREE.Mesh(bhGeo, bhMat);
  smbhGroup.add(bhMesh);

  // Accretion glow ring
  const ringGeo = new THREE.TorusGeometry(0.22, 0.04, 16, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff6622,
    transparent: true,
    opacity: 0.8,
  });
  glowRing = new THREE.Mesh(ringGeo, ringMat);
  glowRing.rotation.x = Math.PI * 0.45;
  smbhGroup.add(glowRing);

  // Outer lensing halo
  const haloGeo = new THREE.RingGeometry(0.25, 0.55, 64);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xff8844) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float dist = length(vUv - 0.5) * 2.0;
        float alpha = smoothstep(1.0, 0.3, dist) * 0.4;
        alpha *= 0.7 + 0.3 * sin(uTime * 2.0 + dist * 6.0);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  haloMesh = new THREE.Mesh(haloGeo, haloMat);
  // Billboard: always face camera
  smbhGroup.add(haloMesh);

  // Point light at BH position
  const bhLight = new THREE.PointLight(0xff6622, 2, 8);
  smbhGroup.add(bhLight);

  // Position at apex of bow shock (origin)
  smbhGroup.position.set(0, 0, 0);
  scene.add(smbhGroup);

  return smbhGroup;
}

export function updateSMBH(time, camera) {
  if (!smbhGroup) return;

  // Pulse glow ring
  if (glowRing) {
    glowRing.rotation.z = time * 0.0003;
    glowRing.material.opacity = 0.6 + 0.2 * Math.sin(time * 0.002);
  }

  // Update halo shader time + billboard
  if (haloMesh) {
    haloMesh.material.uniforms.uTime.value = time * 0.001;
    haloMesh.quaternion.copy(camera.quaternion);
  }
}

export function getSMBHGroup() { return smbhGroup; }
