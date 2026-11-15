/**
 * src/main.ts — Point d'entrée de l'application CREATOR Guess Their Answer
 * (Nouveau projet basé sur Wanaka Studio Engine / Three.js)
 */
import { buildStudioSet } from './scenes/main.js';
import { visualProfile } from './visual.js';
import { LAYOUT } from './layout.js';
import * as THREE from 'three';

const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.display = 'block';
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(visualProfile.palette.sky);
scene.fog = new THREE.Fog(visualProfile.palette.sky, 30, 110);

const camera = new THREE.PerspectiveCamera(LAYOUT.cameraFov, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(LAYOUT.cameraHome.x, LAYOUT.cameraHome.y, LAYOUT.cameraHome.z);
camera.lookAt(LAYOUT.cameraLook.x, LAYOUT.cameraLook.y, LAYOUT.cameraLook.z);

const scope = {
  own: <T extends { dispose(): void }>(value: T): T => value,
};

const studio = buildStudioSet(scope, scene);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('CREATOR Guess Their Answer — studio chargé', studio);
