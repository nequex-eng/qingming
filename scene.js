import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AssetManager } from './src/asset-manager.js';
import { createWorld } from './src/world.js';
import { WORLD_LAYOUT, riverCenterZ, riverCenterSlope } from './src/world-layout.js';

const host = document.querySelector('#view');
const status = document.querySelector('#status');
const loading = document.querySelector('#loading');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe7dfca);
scene.fog = new THREE.Fog(0xe7dfca, 105, 220);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 360);
camera.position.set(34, 48, 68);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const isMobileGPU = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const maxPixelRatio = isMobileGPU ? 1.3 : 1.6;
renderer.setPixelRatio(Math.min(devicePixelRatio, maxPixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Blender reference previews use the Standard view transform, not an ACES filmic curve.
// NoToneMapping keeps the GLTF albedo and lit midtones from being compressed/darkened.
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
host.appendChild(renderer.domElement);

function sunShadowQuality() {
  // Keep the scene's sunlight and soft-shadow look, but avoid a 2048² shadow
  // map on phones where the fill rate and memory budget are much tighter.
  const shadowSize = isMobileGPU ? 1024 : 1536;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.updateProjectionMatrix();
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(8, 1.2, 9);
controls.enableDamping = true;
controls.dampingFactor = .055;
controls.maxPolarAngle = Math.PI * .485;
controls.minDistance = 5;
controls.maxDistance = 230;

// Match the Blender reference: pale silk ambient world, warm sun and cool fill.
const silkWorld = new THREE.Color().setRGB(.93, .88, .74);
const earthBounce = new THREE.Color().setRGB(.62, .58, .48);
scene.add(new THREE.HemisphereLight(silkWorld, earthBounce, 1.1));
const sun = new THREE.DirectionalLight(0xffead4, 2.2);
sun.position.set(-34, 52, 28);
sun.castShadow = true;
sunShadowQuality();
sun.shadow.camera.left = -105;
sun.shadow.camera.right = 105;
sun.shadow.camera.top = 75;
sun.shadow.camera.bottom = -75;
sun.shadow.bias = -.00015;
scene.add(sun);
const coolFill = new THREE.DirectionalLight(0xd5d8d0, .7);
coolFill.position.set(42, 30, -36);
scene.add(coolFill);
// Reference renders use broad camera-side studio fill. Add a model-only fill so
// imported GLB assets keep their authored colors without washing out the town ground.
const assetFill = new THREE.DirectionalLight(0xfff0dc, 1.8);
assetFill.position.set(34, 48, 68);
assetFill.layers.set(1);
scene.add(assetFill);
const assetAmbient = new THREE.HemisphereLight(0xf5ecd8, 0x9c8d73, 1.1);
assetAmbient.layers.set(1);
scene.add(assetAmbient);
camera.layers.enable(1);
window.__qingmingVisualSettings = { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, assetFillIntensity: assetFill.intensity, assetAmbientIntensity: assetAmbient.intensity };

const views = {
  overview: { position: [0, 112, 164], target: [0, 0, 8] },
  countryside: { position: [-58, 31, 48], target: [-66, 0, 22] },
  bridge: { position: [10, 28, 43], target: [0, 1, 0] },
  market: { position: [53, 34, 62], target: [49, 1, 35] }
};
document.querySelectorAll('#nav [data-view]').forEach(button => {
  button.addEventListener('click', () => {
    const view = views[button.dataset.view];
    if (!view) return;
    camera.position.set(...view.position);
    controls.target.set(...view.target);
    controls.update();
  });
});

const world = createWorld(THREE, scene);
const tradePanel = document.querySelector('#trade-panel');
const tradeTitle = document.querySelector('#trade-title');
const tradeContent = document.querySelector('#trade-content');
const coinCount = document.querySelector('#coin-count');
const shopStock = [
  { name: '茶汤摊', desc: '桥头歇脚，热茶与胡饼最受脚夫欢迎。', goods: [['热茶', 2], ['胡饼', 3]] },
  { name: '酒肆', desc: '沿河酒旗招展，供过路客商小酌。', goods: [['米酒', 5], ['熟肉', 6]] },
  { name: '绸缎铺', desc: '各色绢帛布匹，适合进城采买。', goods: [['素绢', 12], ['布匹', 8]] },
  { name: '食肆', desc: '现做汤饼与蒸食，往来行人皆可用餐。', goods: [['汤饼', 4], ['蒸饼', 3]] },
  { name: '药铺', desc: '常用草药与香囊，行旅备上一份。', goods: [['草药包', 8], ['安神香囊', 10]] },
  { name: '杂货铺', desc: '灯油、针线和日用小物一应俱全。', goods: [['灯油', 6], ['针线', 4]] },
  { name: '香料摊', desc: '南北香料汇集，气味浓郁。', goods: [['香料', 7], ['香木', 9]] }
];
let marketState = { coins: 30, inventory: {} };
try {
  const saved = JSON.parse(localStorage.getItem('qingming-market-v1') || 'null');
  if (saved && Number.isFinite(saved.coins) && saved.inventory && typeof saved.inventory === 'object') marketState = saved;
} catch {}
function saveMarket() {
  try { localStorage.setItem('qingming-market-v1', JSON.stringify(marketState)); } catch {}
  coinCount.textContent = String(marketState.coins);
}
function makeTradeRow(label, actionText, onAction, disabled = false) {
  const row = document.createElement('div'); row.className = 'trade-row';
  const text = document.createElement('span'); text.textContent = label;
  const button = document.createElement('button'); button.textContent = actionText; button.disabled = disabled;
  button.addEventListener('click', onAction);
  row.append(text, button); tradeContent.appendChild(row);
}
function openShop(index) {
  const shop = shopStock[index];
  if (!shop) return;
  tradeTitle.textContent = shop.name;
  tradeContent.replaceChildren();
  const desc = document.createElement('p'); desc.className = 'trade-desc'; desc.textContent = shop.desc; tradeContent.appendChild(desc);
  const buyHead = document.createElement('div'); buyHead.className = 'trade-section'; buyHead.textContent = '买入'; tradeContent.appendChild(buyHead);
  for (const [name, price] of shop.goods) {
    makeTradeRow(name + ' · ' + price + '文', '买入', () => {
      if (marketState.coins < price) return;
      marketState.coins -= price;
      marketState.inventory[name] = (marketState.inventory[name] || 0) + 1;
      saveMarket(); openShop(index);
    }, marketState.coins < price);
  }
  const sellHead = document.createElement('div'); sellHead.className = 'trade-section'; sellHead.textContent = '行囊 · 卖出可得半价'; tradeContent.appendChild(sellHead);
  const items = Object.entries(marketState.inventory).filter(([, count]) => count > 0);
  if (!items.length) {
    const empty = document.createElement('p'); empty.className = 'trade-desc'; empty.textContent = '行囊空空，可以先买些货物。'; tradeContent.appendChild(empty);
  } else {
    for (const [name, count] of items) {
      const base = shopStock.flatMap(s => s.goods).find(g => g[0] === name)?.[1] || 2;
      const value = Math.max(1, Math.floor(base / 2));
      makeTradeRow(name + ' × ' + count, '卖出 +' + value + '文', () => {
        marketState.inventory[name]--;
        marketState.coins += value;
        saveMarket(); openShop(index);
      });
    }
  }
  tradePanel.hidden = false;
}
const npcDialogues = {
  'merchant-shopkeeper': ['商人掌柜', '客官，南北货物都在此处集散。若要大宗采买，可先去前街看看行情。'],
  'street-vendor': ['街头摊贩', '刚出炉的胡饼，热乎着呢！赶路的客官带两个吧。'],
  'boatman': ['汴河船夫', '顺流可到东边码头，逆流便是城里。今日河面船多，过桥时要慢些。'],
  'porter-laborer': ['码头脚夫', '这批货刚卸下船，等会儿还要送到城里的仓栈。'],
  'shop-assistant': ['店铺伙计', '掌柜正在后堂清点货物，客官先看看柜上的东西。'],
  'teahouse-worker': ['茶馆伙计', '楼上临窗的位置还能看见虹桥，客官要不要进来歇歇？'],
  'artisan-craftsman': ['手艺匠人', '手上这件活儿还差最后一道工序，城里做买卖讲究的就是个手艺。'],
  'scholar-literati': ['过路文人', '汴河两岸人烟稠密，市声不绝。此地风物，值得慢慢观赏。']
};
function openNpc(id) {
  const entry = npcDialogues[id] || ['市井百姓', '汴河两岸人来人往，处处都有新鲜事。'];
  tradeTitle.textContent = entry[0]; tradeContent.replaceChildren();
  const p = document.createElement('p'); p.className = 'trade-desc'; p.textContent = entry[1]; tradeContent.appendChild(p);
  tradePanel.hidden = false;
}
document.querySelector('#trade-close').addEventListener('click', () => { tradePanel.hidden = true; });
saveMarket();
window.__qingmingGame = { openShop, openNpc, getMarketState: () => JSON.parse(JSON.stringify(marketState)) };

const assetManager = new AssetManager({ scene, status });
window.__qingmingLoadedModels = assetManager.loaded;
window.__qingmingAssetManager = assetManager;
window.__qingmingCatalogModels = [];
window.__qingmingWorldLayout = WORLD_LAYOUT;

const movingBoats = [];
const interactables = [...world.interactables];


async function loadAllAssets() {
  status.textContent = '正在载入桥梁、码头与沿河建筑…';
  // Never block the playable base scene on remote GLB downloads. Reveal the
  // procedural river, streets, stalls and trees immediately; stream GLBs later.
  const loadingLabel = document.querySelector('#loading-label');
  if (loadingLabel) loadingLabel.textContent = '市井场景已就绪，正在载入建筑与人物…';
  loading.classList.add('hide');
  setTimeout(() => loading.remove(), 500);

  const first = await assetManager.loadManifest('./public/assets/manifest.json');
  window.__qingmingAssetManifest = first.manifest;
  if (first.failed.length) {
    console.warn('Landmark asset failures:', first.failed);
  }

  // Reveal the playable environment after the six landmarks; stream the
  // remaining models in the background so a 70 MB asset set is not a blank
  // loading screen on mobile connections.
  const total = WORLD_LAYOUT.catalog.length;
  let completed = 0;
  for (const spec of WORLD_LAYOUT.catalog) {
    try {
      const placement = [...spec.position];
      if (Number.isFinite(spec.speed)) placement[2] += riverCenterZ(placement[0]);
      const item = await assetManager.loadCatalogModel(spec.id, placement);
      item.model.userData.assetId = spec.id;
      if (npcDialogues[spec.id]) {
        item.model.userData.interaction = { kind: 'npc', id: spec.id };
        interactables.push(item.model);
      }
      item.model.userData.assetPosition = [...spec.position];
      window.__qingmingCatalogModels.push(item);
      if (Number.isFinite(spec.speed)) movingBoats.push({ model: item.model, speed: spec.speed, riverOffset: spec.position[2] });
    } catch (error) {
      console.error('Catalog model failed:', spec.id, error);
      status.textContent = '新增资产载入异常：' + spec.id + '（继续载入其余模型）';
    }
    completed++;
    status.textContent = '市井资产 ' + completed + '/' + total + ' · ' +
      window.__qingmingCatalogModels.length + ' 个新增模型已入场';
  }

  // Batch 3: imported Draco-compressed market environment assets.
  // Keep the procedural terrain as a safety layer while the imported ground mesh is inspected.
  window.__qingmingBatch3Models = [];
  const addBatch3 = async (id, position, scale = 1, rotationY = 0) => {
    const smallProp = ['paper-lantern', 'barrels-set', 'ceramics-set'].includes(id);
    const item = await assetManager.loadBatch3Model(id, position, scale, rotationY, {
      castShadow: !smallProp, receiveShadow: !smallProp
    });
    window.__qingmingBatch3Models.push(item);
    return item;
  };
  try {
    // The detailed river mesh follows the same 180m meandering corridor as the world layout.
    const groundAsset = await addBatch3('ground', [0, -0.12, 0], 1, 0);
    if (groundAsset.size.x > 150 && groundAsset.size.z > 70) world.ground.visible = false;

    const riverAsset = await addBatch3('river', [0, 0.035, 0], 1, 0);
    if (riverAsset.size.x > 150 && riverAsset.size.z > 10) world.river.visible = false;

    // Replace the flat procedural stall roofs/posts with the authored timber-and-cloth awnings.
    const awningJobs = [];
    for (let i = 0; i < WORLD_LAYOUT.marketStalls.length; i++) {
      const x = WORLD_LAYOUT.marketStalls[i];
      const z = 27.2 + (i % 2 ? 2.8 : 0);
      const stall = world.interactables[i];
      if (stall) stall.traverse(node => {
        if (node.name === 'procedural-stall-post' || node.name === 'procedural-stall-canopy') node.visible = false;
      });
      awningJobs.push(addBatch3('shopfront-fabric-awning', [x, 0, z], 0.65, 0));
    }

    await Promise.all(awningJobs);

    // Lanterns hang above the shopfront fascia; duplicate instances share one downloaded GLB.
    const lanternJobs = [];
    for (const [x, z] of [[15,27.2],[33,30],[42,27.2],[55,30],[65,27.2]]) {
      lanternJobs.push(addBatch3('paper-lantern', [x, 2.35, z + 1.05], 1, 0));
    }
    await Promise.all(lanternJobs);

    // Wharf cargo and shop ceramics add small-scale visual detail around existing trade points.
    await Promise.all([
      addBatch3('barrels-set', [12.5, 0, 10.8], 1.7, 0),
      addBatch3('barrels-set', [17.0, 0, 10.8], 1.7, 0),
      addBatch3('ceramics-set', [28, 1.0, 19.2], 1.15, 0),
      addBatch3('ceramics-set', [44, 1.0, 25.2], 1.15, 0)
    ]);

    // Ground GLB is retained in the scene asset library; the current procedural ground
    // remains visible until its Draco mesh bounds are confirmed in the browser.
    status.textContent = '第三批市井道具已入场 · ' + window.__qingmingBatch3Models.length + ' 个实例';
  } catch (error) {
    console.error('Batch3 environment asset failed:', error);
    status.textContent = '第三批素材载入异常：' + error.message;
  }

  const ok = first.loaded.length + window.__qingmingCatalogModels.length;
  status.textContent = '场景搭建完成 · ' + ok + '/22 个主体模型 · ' +
    window.__qingmingBatch3Models.length + ' 个第三批场景实例';
  const finalLoadingLabel = document.querySelector('#loading-label');
  if (finalLoadingLabel) finalLoadingLabel.textContent = '场景已就绪';
}

loadAllAssets().catch(error => {
  console.error('Qingming scene initialization failed:', error);
  status.textContent = '场景初始化失败：' + error.message;
  const label = document.querySelector('#loading-label');
  if (label) label.textContent = '场景载入遇到问题';
});

// Third-person journey mode: the player, not the camera, is the focus of play.\nconst gameplay = createGameplay({
  THREE, scene, camera, controls, renderer, world,
  getInteractables: () => interactables,
  onInteract: object => {
    let node = object;
    while (node && !node.userData.interaction) node = node.parent;
    const target = node?.userData.interaction;
    if (target?.kind === 'stall') openShop(target.index);
    if (target?.kind === 'npc') openNpc(target.id);
  },
  onReward: amount => {
    marketState.coins += amount;
    saveMarket();
  },
  status
});
window.__qingmingGameplay = gameplay;

let last = performance.now();
let lastRender = 0;
const targetFrameMs = isMobileGPU ? 1000 / 40 : 1000 / 60;
function animate(now) {
  requestAnimationFrame(animate);
  if (now - lastRender < targetFrameMs) return;
  lastRender = now;
  const dt = Math.min((now - last) / 1000, .05);
  last = now;
  moveCamera(dt);
  controls.update();
  for (const boat of movingBoats) {
    boat.model.position.x += boat.speed * dt;
    boat.model.position.z = riverCenterZ(boat.model.position.x) + boat.riverOffset;
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxPixelRatio));
});
