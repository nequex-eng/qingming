import { WORLD_LAYOUT } from './world-layout.js';

const material = (THREE, color, roughness = 1) =>
  new THREE.MeshStandardMaterial({ color, roughness });

function addBox(THREE, scene, name, size, position, mat, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addWillow(THREE, scene, x, z, scale, mats) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12, .22, 3.6, 8), mats.bark);
  trunk.position.y = 1.8;
  trunk.castShadow = true;
  group.add(trunk);
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(.035, .07, 2.4, 5), mats.bark);
    branch.position.set(Math.cos(angle) * .72, 2.65, Math.sin(angle) * .72);
    branch.rotation.z = Math.cos(angle) * -.38;
    branch.rotation.x = Math.sin(angle) * .38;
    branch.castShadow = true;
    group.add(branch);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.85, 10, 8), i % 2 ? mats.leaves : mats.leavesLight);
    crown.position.set(Math.cos(angle) * 1.05, 3.25 + (i % 3) * .16, Math.sin(angle) * 1.05);
    crown.scale.set(.9, .72, .85);
    crown.castShadow = true;
    group.add(crown);
    const hanging = new THREE.Mesh(new THREE.CylinderGeometry(.012, .018, 1.45, 4), mats.leaves);
    hanging.position.set(Math.cos(angle) * 1.25, 2.0, Math.sin(angle) * 1.25);
    hanging.castShadow = true;
    group.add(hanging);
  }
  scene.add(group);
}

function addMarketStall(THREE, scene, x, z, index, mats) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const post = (px, pz) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(.13, 2.55, .13), mats.wood);
    p.position.set(px, 1.28, pz); p.castShadow = true; g.add(p);
  };
  post(-1.25, -.72); post(1.25, -.72); post(-1.25, .72); post(1.25, .72);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.9, .14, 1.9), index % 2 ? mats.canvasRed : mats.canvasCream);
  canopy.position.y = 2.55; canopy.castShadow = true; g.add(canopy);
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(2.65, .38, .12), mats.wood);
  fascia.position.set(0, 2.22, -.79); g.add(fascia);
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512; signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#e6d6b2'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#6b4930'; ctx.lineWidth = 10; ctx.strokeRect(7, 7, 498, 114);
  ctx.fillStyle = '#533a29'; ctx.font = 'bold 68px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(['茶汤','酒肆','绸缎','食肆','药铺','杂货','香料','书画'][index], 256, 65);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.75, .42), new THREE.MeshStandardMaterial({ map: signTexture, roughness: .9 }));
  sign.position.set(0, 2.22, -.87); sign.rotation.y = Math.PI; g.add(sign);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.5, .82, .85), mats.woodLight);
  counter.position.set(0, .55, .05); counter.castShadow = true; g.add(counter);
  for (let j = 0; j < 4; j++) {
    const goods = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), [mats.goodsRed, mats.goodsGreen, mats.goodsGold][j % 3]);
    goods.position.set(-.82 + j * .53, 1.06, .04); goods.castShadow = true; g.add(goods);
  }
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  scene.add(g);
  return g;
}

function addCityGate(THREE, scene, x, z, mats) {
  // A timber-and-tile gate marks the transition from the market street to the walled city.
  addBox(THREE, scene, 'city-wall-west', [1.1, 4.5, 9.5], [x, 2.25, z - 7.0], mats.plaster);
  addBox(THREE, scene, 'city-wall-east', [1.1, 4.5, 9.5], [x, 2.25, z + 7.0], mats.plaster);
  for (const dz of [-7, 7]) {
    addBox(THREE, scene, 'gate-pillar', [1.7, 5.4, 1.7], [x, 2.7, z + dz], mats.wood);
  }
  addBox(THREE, scene, 'gate-lintel', [1.8, .6, 15.8], [x, 5.15, z], mats.wood);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(10.5, 2.5, 4), mats.roof);
  roof.position.set(x, 6.45, z); roof.rotation.y = Math.PI / 4; roof.scale.z = .52; roof.castShadow = true; scene.add(roof);
  const sign = addBox(THREE, scene, 'gate-signboard', [3.2, .72, .18], [x - .98, 4.55, z], mats.woodLight, false);
  sign.rotation.y = Math.PI / 2;
}

export function createWorld(THREE, scene) {
  const mats = {
    earth: material(THREE, 0xb9a77e), bank: material(THREE, 0xa99570),
    path: material(THREE, 0xaaa080), stone: material(THREE, 0x77796d),
    grass: material(THREE, 0x8b9873), bark: material(THREE, 0x67513a),
    leaves: material(THREE, 0x77866a), leavesLight: material(THREE, 0x929b78),
    wood: material(THREE, 0x74583c), woodLight: material(THREE, 0x9b7950),
    roof: material(THREE, 0x66695f), plaster: material(THREE, 0xb9ad91),
    canvasRed: material(THREE, 0x9c624d), canvasCream: material(THREE, 0xc5b48d),
    goodsRed: material(THREE, 0x9d5845), goodsGreen: material(THREE, 0x75805b),
    goodsGold: material(THREE, 0xc2a05f)
  };

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(190, 100), mats.earth);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.12; ground.receiveShadow = true; scene.add(ground);

  const waterMat = new THREE.MeshStandardMaterial({ color: 0x658a89, roughness: .27, metalness: .04 });
  const river = new THREE.Mesh(new THREE.PlaneGeometry(180, 12, 120, 18), waterMat);
  river.rotation.x = -Math.PI / 2; river.position.y = .015; river.receiveShadow = true; scene.add(river);

  for (const side of [-1, 1]) {
    addBox(THREE, scene, 'riverbank', [184, .72, 5.2], [0, -.32, side * 8.8], mats.bank);
    addBox(THREE, scene, 'stone-quay-edge', [184, .32, .32], [0, -.05, side * 6.05], mats.stone);
    addBox(THREE, scene, 'riverside-path', [178, .16, 2.4], [0, .06, side * 12.6], mats.path);
    if (side === 1) addBox(THREE, scene, 'market-road', [150, .16, 5.8], [8, .08, 27.2], mats.path);
  }

  // Rural approach: open fields, low hedges and scattered farmsteads.
  for (let i = 0; i < 7; i++) {
    const x = -83 + i * 5.2;
    const field = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 15), material(THREE, i % 2 ? 0x9da078 : 0xa9a17a));
    field.rotation.x = -Math.PI / 2; field.position.set(x, -.015, i % 2 ? -30 : 29); scene.add(field);
  }
  for (let i = 0; i < 5; i++) {
    const x = -78 + i * 8;
    addBox(THREE, scene, 'rural-house', [4.8, 2.5, 3.8], [x, 1.25, 37 + (i % 2) * 3], mats.plaster);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.9, 1.8, 4), mats.roof);
    roof.position.set(x, 3.25, 37 + (i % 2) * 3); roof.rotation.y = Math.PI / 4; roof.scale.z = .7; roof.castShadow = true; scene.add(roof);
  }

  // Willow-lined banks and the market's greener edge.
  WORLD_LAYOUT.willowTrees.forEach(([x, z, s]) => addWillow(THREE, scene, x, z, s, mats));

  // Dense street market on the city side of the river, not a uniform row of isolated boxes.
  const interactables = [];
  WORLD_LAYOUT.marketStalls.forEach((x, i) => {
    const stall = addMarketStall(THREE, scene, x, 27.2 + (i % 2 ? 2.8 : 0), i, mats);
    stall.userData.interaction = { kind: 'stall', index: i };
    interactables.push(stall);
  });
  addCityGate(THREE, scene, WORLD_LAYOUT.landmarks.cityGate[0], WORLD_LAYOUT.landmarks.cityGate[2], mats);

  // A small walled courtyard and back lanes create depth behind the shopfronts.
  addBox(THREE, scene, 'courtyard-wall', [22, 1.8, .35], [50, .9, 38], mats.plaster);
  addBox(THREE, scene, 'courtyard-side-wall', [.35, 1.8, 12], [39, .9, 32], mats.plaster);
  addBox(THREE, scene, 'back-lane', [55, .12, 3.4], [52, .04, 40.5], mats.path, false);

  // Main bridge approaches connect both banks to the north-bank market street.
  for (const x of [0, -48]) {
    addBox(THREE, scene, 'bridge-approach-north', [4.2, .14, 23], [x, .06, 18], mats.path, false);
    addBox(THREE, scene, 'bridge-approach-south', [4.2, .14, 20], [x, .06, -16], mats.path, false);
  }

  // Small stone steps connect the north-bank quay to the market street.
  for (let i = 0; i < 5; i++) {
    addBox(THREE, scene, 'quay-step', [3.2, .12, .48], [14, .1 - i * .07, 10.0 + i * .48], mats.stone);
  }

  const ripples = new THREE.Group();
  for (let i = 0; i < 56; i++) {
    const ripple = new THREE.Mesh(
      new THREE.BoxGeometry(.55 + (i % 4) * .22, .012, .025),
      new THREE.MeshBasicMaterial({ color: 0xd2ded0, transparent: true, opacity: .16 })
    );
    ripple.position.set(-88 + (i * 19 % 176), .045, -8 + (i * 13 % 16));
    ripple.rotation.y = (i % 7 - 3) * .035;
    ripples.add(ripple);
  }
  scene.add(ripples);

  return { ripples, materials: mats, layout: WORLD_LAYOUT, interactables };
}
