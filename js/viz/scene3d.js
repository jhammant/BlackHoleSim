// Three.js scene setup — camera, controls, lighting, post-processing
// Geometry Wars-inspired neon aesthetic

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, controls, composer;
let container;
let animationCallbacks = [];
let gridMesh;

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }

// Create a circular particle sprite texture
function createParticleSprite() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function initScene(containerEl) {
  container = containerEl;
  const w = container.clientWidth;
  const h = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030308);

  // Camera
  camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 500);
  camera.position.set(8, 5, 12);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1;
  controls.maxDistance = 50;
  controls.target.set(0, 0, 0);
  controls.update();

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x8888ff, 0.3);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  // Post-processing
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    1.2,   // strength — more bloom for neon glow
    0.5,   // radius
    0.7    // threshold — lower to catch more glow
  );
  composer.addPass(bloomPass);

  // Geometry Wars-style neon grid
  createNeonGrid();

  // Star field — properly distributed in 3D sphere
  createStarField();

  // Resize handler
  window.addEventListener('resize', onResize);
}

function createNeonGrid() {
  // Subtle grid plane below the scene — Geometry Wars style
  const gridSize = 80;
  const gridDiv = 40;
  const geo = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];

  const half = gridSize / 2;
  const step = gridSize / gridDiv;

  // Grid lines along X
  for (let i = 0; i <= gridDiv; i++) {
    const z = -half + i * step;
    positions.push(-half, -3, z, half, -3, z);

    // Color: fade toward edges
    const fade = 1 - Math.abs(i - gridDiv / 2) / (gridDiv / 2);
    const alpha = fade * 0.4;
    colors.push(0, alpha * 0.3, alpha * 0.8, 0, alpha * 0.3, alpha * 0.8);
  }

  // Grid lines along Z
  for (let i = 0; i <= gridDiv; i++) {
    const x = -half + i * step;
    positions.push(x, -3, -half, x, -3, half);

    const fade = 1 - Math.abs(i - gridDiv / 2) / (gridDiv / 2);
    const alpha = fade * 0.4;
    colors.push(0, alpha * 0.3, alpha * 0.8, 0, alpha * 0.3, alpha * 0.8);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  gridMesh = new THREE.LineSegments(geo, mat);
  scene.add(gridMesh);
}

function createStarField() {
  const starCount = 4000;
  const starsGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    // Uniform distribution on a sphere — proper 3D, not planar
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 60 + Math.random() * 140; // spread across a wide shell

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Varied star colors: blue-white to warm white
    const brightness = 0.4 + Math.random() * 0.6;
    const temp = Math.random();
    if (temp < 0.3) {
      // Blue-white
      colors[i * 3] = brightness * 0.7;
      colors[i * 3 + 1] = brightness * 0.8;
      colors[i * 3 + 2] = brightness;
    } else if (temp < 0.7) {
      // White
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    } else {
      // Warm
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.85;
      colors[i * 3 + 2] = brightness * 0.7;
    }

    sizes[i] = 0.3 + Math.random() * 0.5;
  }

  starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Use sprite texture for circular stars
  const sprite = createParticleSprite();

  const starsMat = new THREE.PointsMaterial({
    size: 0.3,
    map: sprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  scene.add(new THREE.Points(starsGeo, starsMat));
}

function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

export function registerAnimationCallback(fn) {
  animationCallbacks.push(fn);
}

export function getParticleSprite() {
  return createParticleSprite();
}

export function animate(time) {
  requestAnimationFrame(animate);
  controls.update();

  for (const cb of animationCallbacks) {
    cb(time);
  }

  composer.render();
}
