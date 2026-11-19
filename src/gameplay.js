import { riverCenterZ } from './world-layout.js';

export function createGameplay({ THREE, scene, camera, controls, renderer, world, getInteractables, onInteract, onReward, status }) {
  const player = new THREE.Group();
  player.name = 'player-avatar';
  const skin = new THREE.MeshStandardMaterial({ color: 0xd6ad82, roughness: 1 });
  const robe = new THREE.MeshStandardMaterial({ color: 0x536b58, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3d4038, roughness: 1 });
  const straw = new THREE.MeshStandardMaterial({ color: 0xb69a63, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.34, .43, 1.05, 8), robe);
  body.position.y = 1.12; body.castShadow = true; player.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 12, 10), skin);
  head.position.y = 1.86; head.castShadow = true; player.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .09, 12), straw);
  hat.position.y = 2.1; player.add(hat);
  const legs = [];
  for (const x of [-.17, .17]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.105, .12, .62, 7), dark);
    leg.position.set(x, .39, 0); leg.castShadow = true; player.add(leg); legs.push(leg);
  }
  const arms = [];
  for (const x of [-.42, .42]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .66, 7), robe);
    arm.position.set(x, 1.22, 0); arm.rotation.z = x < 0 ? -.12 : .12; arm.castShadow = true; player.add(arm); arms.push(arm);
  }
  player.position.set(4, 0, 42);
  scene.add(player);

  const hud = document.querySelector('#player-hud');
  const objectiveText = document.querySelector('#objective-text');
  const coinHud = document.querySelector('#hud-coins');
  const prompt = document.querySelector('#interaction-prompt');
  const actionButton = document.querySelector('#action-button');
  const joystick = document.querySelector('#joystick');
  const stick = document.querySelector('#joystick-stick');
  const missionSteps = [
    { title: '初到汴河', detail: '前往虹桥，看看汴河上最热闹的渡口', target: [0, 0, 0], reward: 8, done: false },
    { title: '码头见闻', detail: '到码头找船夫打听今日货运', target: [14, 0, 7.2], reward: 10, done: false },
    { title: '街市闲逛', detail: '走进街市，找茶馆伙计歇脚', target: [28, 0, 21], reward: 12, done: false }
  ];
  let missionIndex = 0;
  let coins = 30;
  let nearby = null;
  let yaw = 0;
  let moving = false;
  const keys = new Set();
  const touch = { x: 0, y: 0, active: false, id: null };
  let lastStep = 0;
  let walkingTime = 0;
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const cameraOffset = new THREE.Vector3();
  const ray = new THREE.Raycaster();

  function updateHud() {
    const step = missionSteps[missionIndex];
    if (objectiveText) objectiveText.textContent = step ? step.title + ' · ' + step.detail : '今日行旅已完成，继续自由探索汴河两岸';
    if (coinHud) coinHud.textContent = String(coins);
    if (hud) hud.dataset.complete = missionIndex >= missionSteps.length ? 'true' : 'false';
  }
  function reward(amount) {
    coins += amount;
    if (typeof onReward === 'function') onReward(amount);
    updateHud();
  }
  function findNearby() {
    let best = null, bestDistance = 4.4;
    for (const object of getInteractables()) {
      if (!object || !object.visible) continue;
      const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
      const dx = center.x - player.position.x, dz = center.z - player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < bestDistance) { bestDistance = d; best = object; }
    }
    return best;
  }
  function interact() {
    if (nearby) onInteract(nearby);
  }
  actionButton?.addEventListener('click', interact);
  addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) { keys.add(key); e.preventDefault(); }
    if (key === 'e' || key === 'enter') { interact(); }
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  if (joystick) {
    const radius = 43;
    joystick.addEventListener('pointerdown', e => {
      touch.active = true; touch.id = e.pointerId; joystick.setPointerCapture(e.pointerId);
      const r = joystick.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const len = Math.max(1, Math.hypot(dx, dy));
      touch.x = Math.max(-1, Math.min(1, dx / len * Math.min(1, len / radius)));
      touch.y = Math.max(-1, Math.min(1, dy / len * Math.min(1, len / radius)));
      stick.style.transform = 'translate(' + (touch.x * radius) + 'px,' + (touch.y * radius) + 'px)';
    });
    joystick.addEventListener('pointermove', e => {
      if (!touch.active || e.pointerId !== touch.id) return;
      const r = joystick.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const len = Math.max(1, Math.hypot(dx, dy)), scale = Math.min(1, radius / len);
      touch.x = dx / len * scale; touch.y = dy / len * scale;
      stick.style.transform = 'translate(' + (touch.x * radius) + 'px,' + (touch.y * radius) + 'px)';
    });
    const endTouch = e => {
      if (e.pointerId !== touch.id) return;
      touch.active = false; touch.id = null; touch.x = 0; touch.y = 0;
      stick.style.transform = 'translate(0,0)';
    };
    joystick.addEventListener('pointerup', endTouch);
    joystick.addEventListener('pointercancel', endTouch);
  }

  // Drag on the open right-hand side to turn the camera; the left thumb remains the joystick.
  let lookPointer = null, lastLookX = 0;
  renderer.domElement.addEventListener('pointerdown', e => {
    if (e.clientX > innerWidth * .42) { lookPointer = e.pointerId; lastLookX = e.clientX; }
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.pointerId !== lookPointer) return;
    yaw -= (e.clientX - lastLookX) * .006;
    lastLookX = e.clientX;
  });
  const endLook = e => { if (e.pointerId === lookPointer) lookPointer = null; };
  renderer.domElement.addEventListener('pointerup', endLook);
  renderer.domElement.addEventListener('pointercancel', endLook);

  function blocked(x, z) {
    const river = riverCenterZ(x);
    const atBridge = Math.abs(x) < 3.2 || Math.abs(x + 48) < 3.2;
    if (!atBridge && Math.abs(z - river) < 7.1) return true;
    // Keep the player out of the solid stall counters while leaving the market lane open.
    for (const sx of world.layout.marketStalls) {
      const sz = 27.2 + (world.layout.marketStalls.indexOf(sx) % 2 ? 2.8 : 0);
      if (Math.abs(x - sx) < 1.75 && Math.abs(z - sz) < 1.45) return true;
    }
    return false;
  }

  function update(dt) {
    const xAxis = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + touch.x;
    const yAxis = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0) + touch.y;
    moving = Math.hypot(xAxis, yAxis) > .12;
    if (moving) {
      const len = Math.hypot(xAxis, yAxis);
      const sx = xAxis / Math.max(1, len), sy = yAxis / Math.max(1, len);
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const dx = (sx * cos - sy * sin) * 5.2 * dt;
      const dz = (sx * sin + sy * cos) * 5.2 * dt;
      const nx = THREE.MathUtils.clamp(player.position.x + dx, -88, 88);
      const nz = THREE.MathUtils.clamp(player.position.z + dz, -45, 55);
      if (!blocked(nx, player.position.z)) player.position.x = nx;
      if (!blocked(player.position.x, nz)) player.position.z = nz;
      player.rotation.y = Math.atan2(dx, dz) + Math.PI;
      walkingTime += dt * 9;
      legs[0].rotation.x = Math.sin(walkingTime) * .52;
      legs[1].rotation.x = -Math.sin(walkingTime) * .52;
      arms[0].rotation.x = -Math.sin(walkingTime) * .3;
      arms[1].rotation.x = Math.sin(walkingTime) * .3;
    } else {
      legs.forEach(l => l.rotation.x *= .75);
      arms.forEach(a => a.rotation.x *= .75);
    }

    // Smooth third-person follow camera, preserving the map's original zoomable world.
    cameraOffset.set(Math.sin(yaw) * 10, 6.2, Math.cos(yaw) * 10);
    desired.copy(player.position).add(cameraOffset);
    camera.position.lerp(desired, 1 - Math.pow(.001, dt));
    controls.target.lerp(new THREE.Vector3(player.position.x, 1.1, player.position.z), 1 - Math.pow(.001, dt));
    controls.update();

    nearby = findNearby();
    if (prompt) {
      const label = nearby?.userData?.interaction?.kind === 'stall' ? '按 E · 进入商铺' :
        nearby?.userData?.interaction?.kind === 'npc' ? '按 E · 与人物交谈' : '';
      prompt.textContent = label;
      prompt.hidden = !label;
    }
    if (actionButton) actionButton.hidden = !nearby;

    const step = missionSteps[missionIndex];
    if (step && Math.hypot(player.position.x - step.target[0], player.position.z - step.target[2]) < 5.2) {
      if (missionIndex !== lastStep) {
        lastStep = missionIndex;
        reward(step.reward);
        missionIndex++;
        updateHud();
        if (status) status.textContent = '行旅任务完成 · 获得 ' + step.reward + ' 文';
      }
    }
  }

  updateHud();
  return { player, update, interact, getCoins: () => coins, getMissionIndex: () => missionIndex };
}
