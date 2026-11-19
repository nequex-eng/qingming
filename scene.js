import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AssetManager } from './src/asset-manager.js';
import { createWorld } from './src/world.js';
import { WORLD_LAYOUT } from './src/world-layout.js';

const host = document.querySelector('#view');
const status = document.querySelector('#status');
const loading = document.querySelector('#loading');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d0b7);
scene.fog = new THREE.Fog(0xd8d0b7, 95, 205);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 360);
camera.position.set(34, 48, 68);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
host.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(8, 1.2, 9);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.maxPolarAngle = Math.PI * .485;
controls.minDistance = 5;
controls.maxDistance = 170;

scene.add(new THREE.HemisphereLight(0xe9eadb, 0x75664e, 1.65));
const sun = new THREE.DirectionalLight(0xffe2b9, 2.25);
sun.position.set(-34, 52, 28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -105;
sun.shadow.camera.right = 105;
sun.shadow.camera.top = 75;
sun.shadow.camera.bottom = -75;
sun.shadow.bias = -.00015;
scene.add(sun);

const world = createWorld(THREE, scene);
const assetManager = new AssetManager({ scene, status });
window.__qingmingLoadedModels = assetManager.loaded;
window.__qingmingAssetManager = assetManager;
window.__qingmingCatalogModels = [];
window.__qingmingWorldLayout = WORLD_LAYOUT;

const movingBoats = [];
const keys = new Set();
addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if ('wasdqe'.includes(key)) { keys.add(key); event.preventDefault(); }
});
addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));

function moveCamera(dt) {
  if (!keys.size) return;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const velocity = dt * 13;
  if (keys.has('w')) camera.position.addScaledVector(forward, velocity);
  if (keys.has('s')) camera.position.addScaledVector(forward, -velocity);
  if (keys.has('a')) camera.position.addScaledVector(right, -velocity);
  if (keys.has('d')) camera.position.addScaledVector(right, velocity);
  if (keys.has('q')) camera.position.y -= velocity;
  if (keys.has('e')) camera.position.y += velocity;
  controls.target.copy(camera.position).add(forward.multiplyScalar(9));
}

async function loadAllAssets() {
  status.textContent = '正在载入桥梁、码头与沿河建筑…';
  const first = await assetManager.loadManifest('./public/assets/manifest.json');
  window.__qingmingAssetManifest = first.manifest;
  if (first.failed.length) {
    console.warn('Landmark asset failures:', first.failed);
  }

  const total = WORLD_LAYOUT.catalog.length;
  let completed = 0;
  for (const spec of WORLD_LAYOUT.catalog) {
    try {
      const item = await assetManager.loadCatalogModel(spec.id, spec.position);
      item.model.userData.assetId = spec.id;
      item.model.userData.assetPosition = [...spec.position];
      window.__qingmingCatalogModels.push(item);
      if (Number.isFinite(spec.speed)) movingBoats.push({ model: item.model, speed: spec.speed });
    } catch (error) {
      console.error('Catalog model failed:', spec.id, error);
      status.textContent = '新增资产载入异常：' + spec.id + '（继续载入其余模型）';
    }
    completed++;
    status.textContent = '场景资产 ' + completed + '/' + total + ' · ' +
      window.__qingmingCatalogModels.length + ' 个新增模型已入场';
  }

  const ok = first.loaded.length + window.__qingmingCatalogModels.length;
  status.textContent = '场景搭建完成 · ' + ok + '/22 个模型已载入';
  document.querySelector('#loading-label').textContent = '场景已就绪';
  setTimeout(() => loading.classList.add('hide'), 500);
  setTimeout(() => loading.remove(), 1000);
}

loadAllAssets().catch(error => {
  console.error('Qingming scene initialization failed:', error);
  status.textContent = '场景初始化失败：' + error.message;
  document.querySelector('#loading-label').textContent = '场景载入遇到问题';
});

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, .05);
  last = now;
  moveCamera(dt);
  controls.update();
  for (const boat of movingBoats) {
    boat.model.position.x += boat.speed * dt;
    if (boat.speed > 0 && boat.model.position.x > 91) boat.model.position.x = -91;
    if (boat.speed < 0 && boat.model.position.x < -91) boat.model.position.x = 91;
  }
  world.ripples.children.forEach((ripple, i) => {
    ripple.position.x += dt * (.22 + (i % 4) * .06);
    if (ripple.position.x > 91) ripple.position.x = -91;
  });
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
});
