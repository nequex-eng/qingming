import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const host=document.querySelector('#view'),status=document.querySelector('#status'),loading=document.querySelector('#loading');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xc8d3c7);scene.fog=new THREE.Fog(0xc8d3c7,42,105);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,240);camera.position.set(17,13,19);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.1,0);controls.enableDamping=true;controls.dampingFactor=.06;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=5;controls.maxDistance=62;
scene.add(new THREE.HemisphereLight(0xe6eee1,0x766b55,1.55));const sun=new THREE.DirectionalLight(0xffe0b1,2.2);sun.position.set(-18,28,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
const mat=(c,r=1)=>new THREE.MeshStandardMaterial({color:c,roughness:r}),groundMat=mat(0x9b9b78),bankMat=mat(0xb2a27f),stoneMat=mat(0x77796b),grassMat=mat(0x78866b),woodMat=mat(0x76583b);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
const river=new THREE.Mesh(new THREE.PlaneGeometry(68,10,100,18),new THREE.MeshStandardMaterial({color:0x557f80,roughness:.22,metalness:.08,transparent:true,opacity:.94}));river.rotation.x=-Math.PI/2;river.position.y=.015;river.receiveShadow=true;scene.add(river);
const ripples=new THREE.Group();scene.add(ripples);for(let i=0;i<42;i++){const r=new THREE.Mesh(new THREE.BoxGeometry(.7,.012,.025),new THREE.MeshBasicMaterial({color:0xc0d0bd,transparent:true,opacity:.16}));r.position.set((Math.random()-.5)*58,.045,(Math.random()-.5)*8.6);r.rotation.y=(Math.random()-.5)*.12;ripples.add(r);}
for(const z of [-7.1,7.1]){const bank=new THREE.Mesh(new THREE.BoxGeometry(72,.55,4.4),bankMat);bank.position.set(0,-.24,z);bank.receiveShadow=true;bank.castShadow=true;scene.add(bank);const verge=new THREE.Mesh(new THREE.BoxGeometry(72,.12,1.3),grassMat);verge.position.set(0,.08,z+(z<0?-1.15:1.15));scene.add(verge);const path=new THREE.Mesh(new THREE.BoxGeometry(54,.16,1.45),stoneMat);path.position.set(0,.12,z+(z<0?1.25:-1.25));path.receiveShadow=true;scene.add(path);}
for(const z of [-5.2,5.2]){const edge=new THREE.Mesh(new THREE.BoxGeometry(68,.35,.28),stoneMat);edge.position.set(0,-.04,z);edge.castShadow=true;edge.receiveShadow=true;scene.add(edge);}
function addTree(x,z,s=1){const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.11*s,.18*s,2.2*s,7),woodMat);trunk.position.set(x,1.05*s,z);trunk.castShadow=true;scene.add(trunk);for(let j=0;j<5;j++){const crown=new THREE.Mesh(new THREE.SphereGeometry((.72+Math.random()*.25)*s,9,7),mat(j%2?0x71836a:0x879174));crown.position.set(x+(Math.random()-.5)*.7*s,2.25*s+Math.random()*.45*s,z+(Math.random()-.5)*.7*s);crown.scale.y=.72;crown.castShadow=true;scene.add(crown);}}
[[-17,-10],[-9,-10],[10,-10],[18,-10],[-18,10],[-12,10],[13,10],[19,10]].forEach((p,i)=>addTree(p[0],p[1],.85+(i%3)*.12));
function addHouse(x,z,w=5,d=3,h=3){const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(0xb9a98b));body.position.set(x,h/2,z);body.castShadow=true;body.receiveShadow=true;scene.add(body);const roof=new THREE.Mesh(new THREE.ConeGeometry(w*.78,1.45,4),mat(0x686b5d));roof.position.set(x,h+.68,z);roof.rotation.y=Math.PI/4;roof.scale.z=d/w;roof.castShadow=true;scene.add(roof);const porch=new THREE.Mesh(new THREE.BoxGeometry(w*.62,.18,.9),woodMat);porch.position.set(x,.85,z+(z>0?-d/2-.4:d/2+.4));scene.add(porch);}
// 以真实南宋建筑资产替换临时方盒建筑，沿两岸形成市井街面。
const loader=new GLTFLoader(),ROOT='./public/assets/3d/';
async function fetchGLTF(file){
  if(!file.endsWith('.gz')) return loader.loadAsync(ROOT+file);
  const response=await fetch(ROOT+file);
  if(!response.ok) throw new Error('HTTP '+response.status+' loading '+file);
  if(!('DecompressionStream' in window)) throw new Error('当前浏览器不支持gzip解压');
  const compressed=await response.arrayBuffer();
  const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const data=await new Response(stream).arrayBuffer();
  return loader.parseAsync(data,'');
}
const loaded=[];
async function loadModel(file,label,position,targetFootprint,rotationY=0){
  const gltf=await fetchGLTF(file),model=gltf.scene;
  model.rotation.y=rotationY;
  model.updateMatrixWorld(true);
  let bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  const horizontal=Math.max(size.x,size.z);
  const scale=horizontal>0?Math.min(targetFootprint/horizontal,1.8):1;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  bounds.setFromObject(model);
  const center=bounds.getCenter(new THREE.Vector3());
  model.position.x+=position[0]-center.x;
  model.position.z+=position[2]-center.z;
  model.position.y+=-bounds.min.y+(position[1]||0);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.side=THREE.DoubleSide;if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;}}}});
  scene.add(model);
  const finalBounds=new THREE.Box3().setFromObject(model),finalSize=finalBounds.getSize(new THREE.Vector3());
  const item={label,model,size:finalSize};
  loaded.push(item);
  status.textContent='已载入 '+loaded.length+'/6：'+loaded.map(x=>x.label).join('、');
  return item;
}
async function assembleAssets(){
  const jobs=[
    // 虹桥跨越河道；原始文件保留，场景中按真实世界占地自动归一比例
    ()=>loadModel('bridges/timber-arch-bridge.glb','虹桥',[0,0,0],14,0),
    ()=>loadModel('bridges/stone-arch-bridge.glb','石拱桥',[-19,0,0],12.5,0),
    ()=>loadModel('architecture/wharf-dock.glb','临河码头',[7,0,5.25],7,Math.PI/2),
    ()=>loadModel('architecture/teahouse.glb','茶馆',[-23,0,11],7.5,0),
    ()=>loadModel('architecture/restaurant-wine-house.glb','酒楼',[-8,0,11],8,0),
    ()=>loadModel('architecture/riverside-commercial-building.glb','江边大商楼',[19,0,-11],9,Math.PI)
  ];
  const results=await Promise.allSettled(jobs.map(fn=>fn()));
  const failed=results.map((r,i)=>r.status==='rejected'?({i,error:r.reason}):null).filter(Boolean);
  if(failed.length){
    console.error('Asset load failures:',failed);
    status.textContent='已加载 '+loaded.length+'/6；失败 '+failed.length+' 个（详见控制台）';
  }else{
    status.textContent='六种独立资产全部载入 · 虹桥只保留一份';
  }
}
assembleAssets();
for(let i=0;i<4;i++){const step=new THREE.Mesh(new THREE.BoxGeometry(1.7,.13,.42),stoneMat);step.position.set(5.6,.08-i*.08,7.1+i*.38);step.receiveShadow=true;scene.add(step);}
const keys=new Set();addEventListener('keydown',e=>{if('wasdqe'.includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function move(dt){const f=new THREE.Vector3();camera.getWorldDirection(f);f.y=0;f.normalize();const right=new THREE.Vector3().crossVectors(f,camera.up).normalize(),v=dt*8;if(keys.has('w'))camera.position.addScaledVector(f,v);if(keys.has('s'))camera.position.addScaledVector(f,-v);if(keys.has('a'))camera.position.addScaledVector(right,-v);if(keys.has('d'))camera.position.addScaledVector(right,v);if(keys.has('q'))camera.position.y-=v;if(keys.has('e'))camera.position.y+=v;if(keys.size)controls.target.copy(camera.position).add(f.multiplyScalar(7));}
let last=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;move(dt);controls.update();ripples.children.forEach((r,i)=>{r.position.x+=dt*(.25+(i%4)*.08);if(r.position.x>31)r.position.x=-31;});renderer.render(scene,camera);}requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));});loading.classList.add('hide');setTimeout(()=>loading.remove(),450);